"""
Wincap API - FastAPI REST endpoints for FEC processing
"""

import asyncio
import json
import logging
import os
import tempfile
import threading
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

from anthropic import Anthropic
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from config.settings import settings
from src.parser.fec_parser import FECParser
from src.mapper.account_mapper import AccountMapper
from src.engine.pl_builder import PLBuilder
from src.engine.balance_builder import BalanceBuilder
from src.engine.kpi_calculator import KPICalculator
from src.engine.cashflow_builder import CashFlowBuilder
from src.engine.monthly_builder import MonthlyBuilder
from src.engine.variance_builder import VarianceBuilder
from src.export.excel_writer import ExcelWriter
from src.exceptions import FECParsingError, ValidationError

# PDF export is optional - requires system libraries (WeasyPrint)
try:
    from src.export.pdf_writer import PDFWriter
    PDF_AVAILABLE = True
except OSError:
    PDFWriter = None
    PDF_AVAILABLE = False
from src.validators import validate_fec_file, sanitize_filename
from src.agent.tools import DealAgent

# =============================================================================
# Logging Configuration
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# Temporary storage for processed data (in production, use Redis/DB)
# =============================================================================

SESSIONS = {}
SESSIONS_LOCK = threading.Lock()  # Thread-safe access to SESSIONS dict
cleanup_task: Optional[asyncio.Task] = None

# =============================================================================
# Lifespan Context Manager
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context - runs on startup/shutdown."""
    global cleanup_task

    # Startup
    async def cleanup_loop():
        """Periodic cleanup every CLEANUP_INTERVAL_HOURS."""
        while True:
            try:
                await asyncio.sleep(settings.CLEANUP_INTERVAL_HOURS * 3600)
                from src.cleanup import cleanup_old_sessions, cleanup_empty_directories
                cleanup_old_sessions()
                cleanup_empty_directories()
                logger.info("Periodic cleanup completed")
            except asyncio.CancelledError:
                logger.info("Cleanup task cancelled")
                break
            except Exception as e:
                logger.error(f"Cleanup task failed: {e}", exc_info=True)

    cleanup_task = asyncio.create_task(cleanup_loop())
    logger.info(f"Cleanup task started (interval: {settings.CLEANUP_INTERVAL_HOURS}h)")

    yield

    # Shutdown
    if cleanup_task and not cleanup_task.done():
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
    logger.info("Cleanup task stopped")

# =============================================================================
# App Configuration
# =============================================================================

app = FastAPI(
    title="Wincap API",
    description="Financial Due Diligence Report Generation API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS for frontend (uses configuration from .env)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# =============================================================================
# Models
# =============================================================================

class ProcessRequest(BaseModel):
    session_id: str
    company_name: str = ""
    years: Optional[List[int]] = None
    detailed: bool = False
    vat_rate: float = 1.20

class ProcessResponse(BaseModel):
    session_id: str
    status: str
    years: List[int]
    summary: dict

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    role: str  # "assistant"
    content: str

# =============================================================================
# Helper Functions
# =============================================================================

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(i) for i in obj]
    return obj

# =============================================================================
# Endpoints
# =============================================================================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/upload")
async def upload_fec(
    files: List[UploadFile] = File(...),
):
    """
    Upload FEC file(s) for processing.

    Validates file types and sizes, then parses FEC entries.
    Returns a session_id to use for subsequent operations.

    **Parameters:**
    - `files`: One or more FEC text files (.txt)

    **Returns:**
    - `session_id`: UUID for referencing this upload session
    - `files`: List of uploaded files with metadata
    - `total_entries`: Total number of accounting entries
    - `years`: Fiscal years found in files

    **Errors:**
    - 400: Invalid file type or size
    - 400: Invalid FEC format
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    session_id = str(uuid.uuid4())
    session_dir = Path(settings.UPLOAD_TEMP_DIR) / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files = []
    all_entries = []

    for file in files:
        try:
            # Read file content
            content = await file.read()

            # Validate file
            is_valid, error = validate_fec_file(Path(file.filename), len(content))
            if not is_valid:
                logger.warning(f"File validation failed: {error}")
                raise HTTPException(status_code=400, detail=error)

            # Sanitize filename
            safe_filename = sanitize_filename(file.filename)
            file_path = session_dir / safe_filename

            # Save file temporarily
            with open(file_path, "wb") as f:
                f.write(content)

            # Parse FEC
            try:
                parser = FECParser(str(file_path))
                entries = parser.parse()
                all_entries.extend(entries)
                logger.info(f"Successfully parsed {file.filename}: {len(entries)} entries")

                uploaded_files.append({
                    "filename": file.filename,
                    "entries": len(entries),
                    "years": sorted(list(parser.years)),
                    "encoding": parser.encoding,
                    "delimiter": parser.delimiter,
                })
            except FECParsingError as e:
                logger.warning(f"FEC parse error for {file.filename}: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid FEC format in {file.filename}: {str(e)}"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing {file.filename}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Internal server error during file processing"
            )

    # Store in session (thread-safe)
    with SESSIONS_LOCK:
        SESSIONS[session_id] = {
            "entries": all_entries,
            "files": uploaded_files,
            "dir": str(session_dir),
            "created": datetime.now().isoformat(),
        }

    # Get unique years
    years = sorted(set(e.fiscal_year for e in all_entries))

    return {
        "session_id": session_id,
        "files": uploaded_files,
        "total_entries": len(all_entries),
        "years": years,
    }

@app.post("/api/process")
async def process_fec(request: ProcessRequest):
    """
    Process uploaded FEC data and generate financial statements.
    """
    with SESSIONS_LOCK:
        session = SESSIONS.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please upload files first.")

    all_entries = session["entries"]

    # Filter by years if specified
    if request.years:
        all_entries = [e for e in all_entries if e.fiscal_year in request.years]

    if not all_entries:
        raise HTTPException(status_code=400, detail="No entries found for specified years.")

    # Initialize mapper
    mapper = AccountMapper()

    # Build financial statements
    pl_builder = PLBuilder(mapper)
    pl_list = pl_builder.build_multi_year(all_entries)

    balance_builder = BalanceBuilder(mapper)
    balance_list = balance_builder.build_multi_year(all_entries)

    kpi_calculator = KPICalculator({}, vat_rate=Decimal(str(request.vat_rate)))
    kpis_list = kpi_calculator.calculate_multi_year(pl_list, balance_list)

    cashflow_builder = CashFlowBuilder()
    cashflows = cashflow_builder.build_multi_year(pl_list, balance_list)

    monthly_builder = MonthlyBuilder(mapper)
    monthly_revenue = monthly_builder.build_monthly_revenue(all_entries)

    # Build variance data
    variance_data = {}
    if len(pl_list) >= 2:
        variance_builder = VarianceBuilder()
        variance_data = {
            "cost_breakdown": variance_builder.build_cost_breakdown_variance(pl_list[-2], pl_list[-1]),
            "ebitda_bridge": variance_builder.build_ebitda_bridge(pl_list[-2], pl_list[-1]),
        }

    # Store processed data in session
    session["processed"] = {
        "company_name": request.company_name,
        "pl_list": pl_list,
        "balance_list": balance_list,
        "kpis_list": kpis_list,
        "cashflows": cashflows,
        "monthly_revenue": monthly_revenue,
        "variance_data": variance_data,
    }

    # Build response summary
    years = sorted(set(e.fiscal_year for e in all_entries))
    summary = {
        "years": years,
        "pl_summary": [],
        "balance_summary": [],
        "kpis": [],
    }

    for pl in pl_list:
        summary["pl_summary"].append({
            "year": pl.year,
            "revenue": float(pl.revenue),
            "ebitda": float(pl.ebitda),
            "ebitda_margin": float(pl.ebitda_margin),
            "net_income": float(pl.net_income),
        })

    for bs in balance_list:
        summary["balance_summary"].append({
            "year": bs.year,
            "total_assets": float(bs.total_assets),
            "equity": float(bs.equity),
            "net_debt": float(bs.net_debt),
        })

    for kpi in kpis_list:
        summary["kpis"].append({
            "year": kpi.year,
            "dso": float(kpi.dso) if kpi.dso else None,
            "dpo": float(kpi.dpo) if kpi.dpo else None,
            "dio": float(kpi.dio) if kpi.dio else None,
        })

    return JSONResponse(content=decimal_to_float({
        "session_id": request.session_id,
        "status": "processed",
        "years": years,
        "summary": summary,
    }))

@app.get("/api/data/{session_id}")
async def get_data(session_id: str):
    """
    Get full processed data for a session.
    Returns JSON suitable for dashboard consumption.
    """
    with SESSIONS_LOCK:
        session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if "processed" not in session:
        raise HTTPException(status_code=400, detail="Data not processed. Call /api/process first.")

    processed = session["processed"]

    # Build comprehensive JSON response
    data = {
        "metadata": {
            "company_name": processed["company_name"],
            "generated_at": datetime.now().isoformat(),
            "years": [pl.year for pl in processed["pl_list"]],
        },
        "pl": [],
        "balance": [],
        "kpis": [],
        "cashflows": [],
        "monthly": {},
        "variance": processed.get("variance_data", {}),
    }

    for pl in processed["pl_list"]:
        data["pl"].append({
            "year": pl.year,
            "revenue": float(pl.revenue),
            "purchases": float(pl.purchases),
            "external_charges": float(pl.external_charges),
            "value_added": float(pl.value_added),
            "personnel_costs": float(pl.personnel_costs),
            "taxes": float(pl.taxes),
            "ebitda": float(pl.ebitda),
            "ebitda_margin": float(pl.ebitda_margin),
            "depreciation": float(pl.depreciation),
            "ebit": float(pl.ebit),
            "financial_result": float(pl.financial_result),
            "exceptional_result": float(pl.exceptional_result),
            "corporate_tax": float(pl.corporate_tax),
            "net_income": float(pl.net_income),
        })

    for bs in processed["balance_list"]:
        data["balance"].append({
            "year": bs.year,
            "fixed_assets": float(bs.fixed_assets),
            "inventory": float(bs.inventory),
            "receivables": float(bs.receivables),
            "cash": float(bs.cash),
            "total_assets": float(bs.total_assets),
            "equity": float(bs.equity),
            "provisions": float(bs.provisions),
            "financial_debt": float(bs.financial_debt),
            "trade_payables": float(bs.trade_payables),
            "other_payables": float(bs.other_payables),
            "total_liabilities": float(bs.total_liabilities),
            "working_capital": float(bs.working_capital),
            "net_debt": float(bs.net_debt),
        })

    for kpi in processed["kpis_list"]:
        data["kpis"].append({
            "year": kpi.year,
            "dso": float(kpi.dso) if kpi.dso else None,
            "dpo": float(kpi.dpo) if kpi.dpo else None,
            "dio": float(kpi.dio) if kpi.dio else None,
            "cash_conversion_cycle": float(kpi.cash_conversion_cycle) if kpi.cash_conversion_cycle else None,
            "ebitda_adjusted": float(kpi.ebitda_adjusted) if kpi.ebitda_adjusted else None,
        })

    # Monthly data
    for year, months in processed.get("monthly_revenue", {}).items():
        data["monthly"][year] = [
            {"month": m, "revenue": float(v)} for m, v in months.items()
        ]

    return JSONResponse(content=decimal_to_float(data))

@app.get("/api/export/xlsx/{session_id}")
async def export_xlsx(session_id: str):
    """Export processed data as Excel Databook."""
    with SESSIONS_LOCK:
        session = SESSIONS.get(session_id)
    if not session or "processed" not in session:
        raise HTTPException(status_code=404, detail="No processed data found.")

    processed = session["processed"]
    session_dir = Path(session["dir"])

    # Generate Excel
    excel_writer = ExcelWriter(processed["company_name"])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    excel_path = session_dir / f"Databook_{timestamp}.xlsx"

    excel_writer.generate(
        processed["pl_list"],
        processed["balance_list"],
        processed["kpis_list"],
        excel_path,
        cashflows=processed.get("cashflows"),
        monthly_data={"revenue": processed.get("monthly_revenue", {})},
        variance_data=processed.get("variance_data"),
    )

    return FileResponse(
        path=str(excel_path),
        filename=f"Databook_{processed['company_name']}_{timestamp}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

@app.get("/api/export/pdf/{session_id}")
async def export_pdf(session_id: str):
    """Export processed data as PDF report."""
    if not PDF_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PDF export is not available. System dependencies missing. Use Excel export instead."
        )

    with SESSIONS_LOCK:
        session = SESSIONS.get(session_id)
    if not session or "processed" not in session:
        raise HTTPException(status_code=404, detail="No processed data found.")

    processed = session["processed"]
    session_dir = Path(session["dir"])

    # Generate PDF
    pdf_writer = PDFWriter(processed["company_name"])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_path = session_dir / f"Rapport_DD_{timestamp}.pdf"

    pdf_writer.generate(
        processed["pl_list"],
        processed["balance_list"],
        processed["kpis_list"],
        pdf_path,
    )

    return FileResponse(
        path=str(pdf_path),
        filename=f"Rapport_DD_{processed['company_name']}_{timestamp}.pdf",
        media_type="application/pdf",
    )


@app.get("/api/trace/{session_id}/{metric}/{year}")
async def get_trace(session_id: str, metric: str, year: int):
    """
    Get trace (provenance) for a specific financial metric.
    
    Shows all journal entries that contributed to a P&L or Balance Sheet line item.
    
    Parameters:
    - session_id: Session identifier from upload
    - metric: Field name (e.g., 'revenue', 'purchases', 'receivables', 'payables')
    - year: Fiscal year to retrieve trace for
    
    Returns:
    {
        "session_id": "...",
        "metric": "revenue",
        "year": 2024,
        "value": 75000.0,
        "entry_count": 2,
        "entries": [
            {"date": "2024-01-15", "account": "701000", "label": "Ventes", "amount": 50000.0},
            ...
        ]
    }
    """
    with SESSIONS_LOCK:
        session = SESSIONS.get(session_id)
    if not session or "processed" not in session:
        raise HTTPException(status_code=404, detail="Session not found or not processed.")
    
    processed = session["processed"]
    
    # Find the P&L or Balance sheet for the requested year
    pl_list = processed.get("pl_list", [])
    balance_list = processed.get("balance_list", [])
    
    pl_for_year = None
    balance_for_year = None
    
    for pl in pl_list:
        if pl.year == year:
            pl_for_year = pl
            break
    
    for bs in balance_list:
        if bs.year == year:
            balance_for_year = bs
            break
    
    # Try to get trace from P&L first
    if pl_for_year:
        trace = pl_for_year.get_trace(metric)
        if trace:
            return JSONResponse(content={
                "session_id": session_id,
                "metric": metric,
                "year": year,
                "source": "P&L",
                **trace
            })
    
    # Try to get trace from Balance Sheet
    if balance_for_year:
        trace = balance_for_year.get_trace(metric)
        if trace:
            return JSONResponse(content={
                "session_id": session_id,
                "metric": metric,
                "year": year,
                "source": "Balance Sheet",
                **trace
            })
    
    # Metric not found
    raise HTTPException(
        status_code=404,
        detail=f"Metric '{metric}' not found for year {year}. Available for this year: {[pl.year for pl in pl_list] if pl_list else [bs.year for bs in balance_list]}"
    )



# =============================================================================
# Agent Tools Endpoints (Phase B)
# =============================================================================


def _get_agent_for_session(session_id: str) -> tuple:
    """Get DealAgent instance for a session.
    
    Returns: (agent, error_response) tuple
    If error: agent is None, error_response is JSONResponse
    If success: agent is DealAgent instance, error_response is None
    """
    with SESSIONS_LOCK:
        session = SESSIONS.get(session_id)
    
    if not session or "processed" not in session:
        error_resp = JSONResponse(
            status_code=404,
            content={"detail": "Session not found or not processed"}
        )
        return None, error_resp
    
    processed = session["processed"]
    entries = session.get("entries", [])
    pl_list = processed.get("pl_list", [])
    balance_list = processed.get("balance_list", [])
    kpis_list = processed.get("kpis_list", [])
    
    agent = DealAgent(entries, pl_list, balance_list, kpis_list)
    return agent, None

@app.get("/api/agent/{session_id}/summary")
async def agent_summary(session_id: str):
    """Get executive summary of the deal."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.get_summary()
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/pl")
async def agent_get_pl(session_id: str, year: Optional[int] = None):
    """Get P&L statement for a fiscal year."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.get_pl(year)
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/balance")
async def agent_get_balance(session_id: str, year: Optional[int] = None):
    """Get balance sheet for a fiscal year."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.get_balance(year)
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/kpis")
async def agent_get_kpis(session_id: str, year: Optional[int] = None):
    """Get KPIs for a fiscal year."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.get_kpis(year)
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/entries")
async def agent_get_entries(
    session_id: str,
    compte_prefix: Optional[str] = None,
    year: Optional[int] = None,
    min_amount: Optional[float] = None,
    label_contains: Optional[str] = None,
    limit: int = 100,
):
    """Search and filter journal entries."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.get_entries(
        compte_prefix=compte_prefix,
        year=year,
        min_amount=min_amount,
        label_contains=label_contains,
        limit=limit,
    )
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/explain")
async def agent_explain_variance(
    session_id: str,
    metric: str,
    year_from: int,
    year_to: int,
):
    """Explain what drove the change in a metric between years."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.explain_variance(metric, year_from, year_to)
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/trace")
async def agent_trace_metric(session_id: str, metric: str, year: int):
    """Get all source entries for a metric."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error
    
    result = agent.trace_metric(metric, year)
    return JSONResponse(content=decimal_to_float(result))

@app.get("/api/agent/{session_id}/anomalies")
async def agent_find_anomalies(
    session_id: str,
    year: Optional[int] = None,
    z_threshold: float = 2.5,
):
    """Find statistically anomalous entries."""
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error

    result = agent.find_anomalies(year=year, z_threshold=z_threshold)
    return JSONResponse(content=decimal_to_float(result))


# =============================================================================
# Claude Chat with Tool Calling (Phase C)
# =============================================================================

def _build_tools_schema() -> List[dict]:
    """Build Claude tool schema from DealAgent methods."""
    return [
        {
            "name": "get_summary",
            "description": "Get executive summary of the financial deal with key metrics and trends",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "name": "get_pl",
            "description": "Get P&L (Profit & Loss) statement for a fiscal year",
            "input_schema": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer",
                        "description": "Fiscal year (if not provided, returns latest year)"
                    }
                },
                "required": []
            }
        },
        {
            "name": "get_balance",
            "description": "Get balance sheet for a fiscal year",
            "input_schema": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer",
                        "description": "Fiscal year (if not provided, returns latest year)"
                    }
                },
                "required": []
            }
        },
        {
            "name": "get_kpis",
            "description": "Get Key Performance Indicators (KPIs) for a fiscal year",
            "input_schema": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer",
                        "description": "Fiscal year (if not provided, returns latest year)"
                    }
                },
                "required": []
            }
        },
        {
            "name": "get_entries",
            "description": "Search and filter journal entries with optional filters",
            "input_schema": {
                "type": "object",
                "properties": {
                    "compte_prefix": {
                        "type": "string",
                        "description": "Filter by account code prefix (e.g. '41' or '401')"
                    },
                    "year": {
                        "type": "integer",
                        "description": "Filter by fiscal year"
                    },
                    "min_amount": {
                        "type": "number",
                        "description": "Filter entries with absolute value >= min_amount"
                    },
                    "label_contains": {
                        "type": "string",
                        "description": "Filter by label substring (case-insensitive)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of entries to return (default 100)"
                    }
                },
                "required": []
            }
        },
        {
            "name": "explain_variance",
            "description": "Explain what drove the change in a metric between two years",
            "input_schema": {
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "description": "Metric to analyze (e.g. 'revenue', 'ebitda', 'personnel')"
                    },
                    "year_from": {
                        "type": "integer",
                        "description": "Starting year"
                    },
                    "year_to": {
                        "type": "integer",
                        "description": "Ending year"
                    }
                },
                "required": ["metric", "year_from", "year_to"]
            }
        },
        {
            "name": "trace_metric",
            "description": "Get all source journal entries that contributed to a P&L or balance sheet metric",
            "input_schema": {
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "description": "Metric name (e.g. 'revenue', 'receivables', 'payables')"
                    },
                    "year": {
                        "type": "integer",
                        "description": "Fiscal year"
                    }
                },
                "required": ["metric", "year"]
            }
        },
        {
            "name": "find_anomalies",
            "description": "Find statistically anomalous journal entries (outliers)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer",
                        "description": "Filter to specific year (if not provided, uses all years)"
                    },
                    "z_threshold": {
                        "type": "number",
                        "description": "Z-score threshold for anomaly detection (default 2.5)"
                    }
                },
                "required": []
            }
        }
    ]


def _execute_tool(agent: DealAgent, tool_name: str, tool_input: dict) -> dict:
    """Execute a tool and return result."""
    try:
        if tool_name == "get_summary":
            return agent.get_summary()
        elif tool_name == "get_pl":
            return agent.get_pl(year=tool_input.get("year"))
        elif tool_name == "get_balance":
            return agent.get_balance(year=tool_input.get("year"))
        elif tool_name == "get_kpis":
            return agent.get_kpis(year=tool_input.get("year"))
        elif tool_name == "get_entries":
            return agent.get_entries(
                compte_prefix=tool_input.get("compte_prefix"),
                year=tool_input.get("year"),
                min_amount=tool_input.get("min_amount"),
                label_contains=tool_input.get("label_contains"),
                limit=tool_input.get("limit", 100)
            )
        elif tool_name == "explain_variance":
            return agent.explain_variance(
                metric=tool_input.get("metric"),
                year_from=tool_input.get("year_from"),
                year_to=tool_input.get("year_to")
            )
        elif tool_name == "trace_metric":
            return agent.trace_metric(
                metric=tool_input.get("metric"),
                year=tool_input.get("year")
            )
        elif tool_name == "find_anomalies":
            return agent.find_anomalies(
                year=tool_input.get("year"),
                z_threshold=tool_input.get("z_threshold", 2.5)
            )
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/agent/{session_id}/chat")
async def agent_chat(session_id: str, request: ChatRequest):
    """
    Chat with Claude about financial data using tool calling.

    Claude can call 8 different tools to analyze the financial data:
    - get_summary: Executive summary
    - get_pl: P&L statement
    - get_balance: Balance sheet
    - get_kpis: Key performance indicators
    - get_entries: Search journal entries
    - explain_variance: Year-over-year analysis
    - trace_metric: Source entries for a metric
    - find_anomalies: Detect outliers

    Parameters:
    - message: User message in French or English

    Returns:
    - Chat response from Claude with analysis
    """
    agent, error = _get_agent_for_session(session_id)
    if error:
        return error

    # Initialize Anthropic client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=500,
            content={"detail": "ANTHROPIC_API_KEY not set"}
        )

    client = Anthropic(api_key=api_key)

    # System prompt in French for financial analysis
    system_prompt = """Tu es un analyste financier expert spécialisé dans l'analyse de due diligence.
Tu as accès à des outils pour interroger les données financières d'une entreprise.
Tu réponds toujours en français.
Utilise les outils disponibles pour répondre aux questions de manière précise et approfondie.
Fournis des analyses structurées avec des insights clairs."""

    # Build messages list
    messages = [
        {"role": "user", "content": request.message}
    ]

    # Tool call loop (max 5 iterations to prevent loops)
    tools_schema = _build_tools_schema()
    max_iterations = 5
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Call Claude with tools
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            tools=tools_schema,
            messages=messages
        )

        # Check if Claude wants to use tools
        if response.stop_reason == "tool_use":
            # Process tool calls
            tool_results = []
            assistant_message = {"role": "assistant", "content": response.content}

            for content_block in response.content:
                if content_block.type == "tool_use":
                    tool_name = content_block.name
                    tool_input = content_block.input
                    tool_use_id = content_block.id

                    # Execute tool
                    tool_result = _execute_tool(agent, tool_name, tool_input)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": json.dumps(decimal_to_float(tool_result))
                    })

            # Add assistant message and tool results
            messages.append(assistant_message)
            messages.append({"role": "user", "content": tool_results})

        else:
            # Claude is done (stop_reason == "end_turn")
            # Extract final text response
            final_text = ""
            for content_block in response.content:
                if hasattr(content_block, "text"):
                    final_text += content_block.text

            return JSONResponse(content=ChatResponse(
                role="assistant",
                content=final_text
            ).model_dump())

    # Max iterations reached
    return JSONResponse(
        status_code=500,
        content={"detail": "Maximum tool call iterations reached"}
    )


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Clean up a session and its temporary files."""
    with SESSIONS_LOCK:
        session = SESSIONS.pop(session_id, None)
    if session:
        # Clean up temp files
        session_dir = Path(session.get("dir", ""))
        if session_dir.exists():
            import shutil
            shutil.rmtree(session_dir, ignore_errors=True)
        return {"status": "deleted", "session_id": session_id}

    raise HTTPException(status_code=404, detail="Session not found.")

# =============================================================================
# Run with: uvicorn api:app --reload
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
