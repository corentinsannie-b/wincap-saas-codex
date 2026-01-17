# Wincap SaaS - Implementation Plan

## Overview

This document outlines the phased approach to implementing the CLI enhancements, technical debt fixes, and testing infrastructure for Wincap SaaS.

## Phase Summary

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **Phase 1** | Week 1 | Security & Config | CORS fix, env vars, file validation |
| **Phase 2** | Week 2 | CLI Enhancement | Rich output, logging, error handling |
| **Phase 3** | Week 3 | Testing | Unit tests, integration tests, CLI tests |
| **Phase 4** | Week 4 | Code Quality | Refactoring, documentation, optimization |

---

## Phase 1: Security & Configuration (Week 1)

### Goals
- 🔒 Fix security vulnerabilities
- ⚙️ Implement environment-based configuration
- 📝 Add comprehensive error handling
- 📋 Add input validation

### Tasks

#### 1.1 Environment Configuration System
**Duration**: 2 hours
**Files**: `apps/api/config/` (new)

Create centralized configuration management:

```python
# apps/api/config/settings.py
from pydantic_settings import BaseSettings
from decimal import Decimal

class Settings(BaseSettings):
    # API Configuration
    API_HOST: str = "localhost"
    API_PORT: int = 8000

    # CORS Configuration
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["GET", "POST"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]

    # File Upload Configuration
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS: set[str] = {".txt"}
    UPLOAD_TEMP_DIR: str = "/tmp/wincap"

    # Session Configuration
    SESSION_TTL_HOURS: int = 24
    CLEANUP_INTERVAL_HOURS: int = 6

    # Processing Configuration
    VAT_RATE_DEFAULT: Decimal = Decimal("1.20")
    MAX_PARALLEL_FILES: int = 4

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

**Deliverable**: `apps/api/config/settings.py`

**Tests**:
```python
# tests/test_config.py
def test_settings_from_env():
    assert settings.API_PORT == 8000

def test_max_file_size():
    assert settings.MAX_FILE_SIZE == 50 * 1024 * 1024
```

---

#### 1.2 CORS Fix
**Duration**: 1 hour
**Files**: `apps/api/api.py`

Update `api.py` to use configuration:

```python
# Before:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# After:
from config.settings import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)
```

**Tests**:
```python
def test_cors_configuration():
    # Verify origins don't include wildcard
    assert "*" not in settings.CORS_ORIGINS
```

---

#### 1.3 File Validation
**Duration**: 2 hours
**Files**: `apps/api/api.py`, new validators module

Create file validation utilities:

```python
# apps/api/src/validators.py
from pathlib import Path
from config.settings import settings

def validate_fec_file(file_path: Path, file_size: int) -> tuple[bool, str]:
    """
    Validate FEC file before processing.

    Returns: (is_valid, error_message)
    """
    # Check extension
    if file_path.suffix.lower() not in settings.ALLOWED_EXTENSIONS:
        return False, f"Invalid file type: {file_path.suffix}"

    # Check size
    if file_size > settings.MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
        return False, f"File too large: {size_mb:.1f}MB (max {max_mb:.0f}MB)"

    # Check minimum size (avoid empty files)
    if file_size < 100:
        return False, "File too small: minimum 100 bytes"

    return True, ""
```

Update upload endpoint:

```python
@app.post("/api/upload")
async def upload_fec(files: List[UploadFile] = File(...)):
    for file in files:
        content = await file.read()

        # Validate
        is_valid, error = validate_fec_file(Path(file.filename), len(content))
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)

        # Safe filename
        safe_filename = Path(file.filename).name
        ...
```

**Tests**:
```python
def test_file_validation_large():
    oversized = Path("huge_file.txt")
    is_valid, error = validate_fec_file(oversized, 100 * 1024 * 1024)
    assert not is_valid

def test_file_validation_invalid_type():
    is_valid, error = validate_fec_file(Path("data.csv"), 1000)
    assert not is_valid
```

---

#### 1.4 Custom Exception Hierarchy
**Duration**: 1.5 hours
**Files**: `apps/api/src/exceptions.py` (new)

Create domain-specific exceptions:

```python
# apps/api/src/exceptions.py
class WincapException(Exception):
    """Base exception for Wincap."""
    pass

class FECParsingError(WincapException):
    """FEC file parsing failed."""
    pass

class ValidationError(WincapException):
    """Data validation failed."""
    pass

class ConfigurationError(WincapException):
    """Configuration is invalid."""
    pass

class ExportError(WincapException):
    """Report export failed."""
    pass
```

Update error handling in `api.py`:

```python
from src.exceptions import FECParsingError, ValidationError

try:
    parser = FECParser(str(file_path))
    entries = parser.parse()
except FECParsingError as e:
    raise HTTPException(status_code=400, detail=f"Invalid FEC format: {str(e)}")
except Exception as e:
    logger.error(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

**Tests**:
```python
def test_exception_hierarchy():
    assert issubclass(FECParsingError, WincapException)
```

---

#### 1.5 Update .env.example
**Duration**: 0.5 hours
**Files**: `apps/api/.env.example`

```
# API Configuration
API_HOST=localhost
API_PORT=8000

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST

# File Upload
MAX_FILE_SIZE=52428800  # 50 MB in bytes
ALLOWED_EXTENSIONS=.txt

# Session Management
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_HOURS=6

# Processing
VAT_RATE_DEFAULT=1.20
MAX_PARALLEL_FILES=4

# Logging
LOG_LEVEL=INFO
LOG_FILE=null
```

---

### Phase 1 Deliverables
- ✅ `apps/api/config/settings.py` - Centralized configuration
- ✅ Updated `apps/api/api.py` - Uses settings
- ✅ `apps/api/src/validators.py` - Input validation
- ✅ `apps/api/src/exceptions.py` - Custom exceptions
- ✅ Updated `.env.example` - Environment template
- ✅ Tests for all new code

**Phase 1 Acceptance Criteria**:
- [ ] CORS configuration loads from environment
- [ ] File validation rejects oversized/invalid files
- [ ] Proper HTTP error codes returned
- [ ] No hardcoded origins in code

---

## Phase 2: CLI Enhancement & Logging (Week 2)

### Goals
- 🎨 Add Rich library for colored, formatted output
- 📊 Add progress indicators and tables
- 📝 Implement structured logging
- 🧹 Cleanup temporary files
- 🔍 Add public properties to FECParser

### Tasks

#### 2.1 Add Rich Dependency
**Duration**: 0.5 hours
**Files**: `apps/api/pyproject.toml`

```toml
dependencies = [
    # ... existing ...
    "rich>=13.0",
    "pydantic-settings>=2.0",
]
```

Install: `pip install rich pydantic-settings`

---

#### 2.2 Logging Infrastructure
**Duration**: 2 hours
**Files**: `apps/api/src/logging_config.py` (new), `apps/api/main.py`

Create logging configuration:

```python
# apps/api/src/logging_config.py
import logging
import logging.handlers
from pathlib import Path
from config.settings import settings

def setup_logging():
    """Configure logging for CLI and API."""
    logger = logging.getLogger("wincap")
    logger.setLevel(logging.DEBUG)

    # Console handler
    console_handler = logging.StreamHandler()
    console_level = getattr(logging, settings.LOG_LEVEL)
    console_handler.setLevel(console_level)

    # File handler (if configured)
    if settings.LOG_FILE:
        Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        logger.addHandler(file_handler)

    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger

logger = setup_logging()
```

Update `main.py`:

```python
import logging
from src.logging_config import logger

@cli.command()
def generate(...):
    """Generate financial reports from FEC file(s)."""
    logger.info(f"Processing {len(fec_files)} file(s)")

    for fec_file in fec_files:
        try:
            logger.info(f"Parsing: {fec_file}")
            entries = parser.parse()
            logger.debug(f"Loaded {len(entries)} entries")
        except Exception as e:
            logger.error(f"Failed to parse {fec_file}: {e}", exc_info=True)
            raise
```

---

#### 2.3 Rich CLI Output
**Duration**: 3 hours
**Files**: `apps/api/main.py`, new `src/cli/output.py`

Create output formatting utilities:

```python
# apps/api/src/cli/output.py
from rich.console import Console
from rich.table import Table
from rich.progress import Progress
from rich.panel import Panel
from decimal import Decimal

console = Console()

def print_header(title: str):
    """Print formatted header."""
    console.print(f"\n[bold cyan]{title}[/bold cyan]")

def print_success(message: str):
    """Print success message."""
    console.print(f"[green]✓[/green] {message}")

def print_error(message: str):
    """Print error message."""
    console.print(f"[red]✗[/red] {message}")

def print_warning(message: str):
    """Print warning message."""
    console.print(f"[yellow]⚠[/yellow] {message}")

def print_financial_summary(pl_list):
    """Print formatted financial summary table."""
    table = Table(title="Financial Summary")
    table.add_column("Fiscal Year", style="cyan")
    table.add_column("Revenue", justify="right", style="magenta")
    table.add_column("EBITDA", justify="right")
    table.add_column("EBITDA %", justify="right")
    table.add_column("Net Income", justify="right")

    for pl in pl_list:
        table.add_row(
            str(pl.year),
            f"{float(pl.revenue/1000):,.0f} k€",
            f"{float(pl.ebitda/1000):,.0f} k€",
            f"{float(pl.ebitda_margin):.1f}%",
            f"{float(pl.net_income/1000):,.0f} k€"
        )

    console.print(table)

def print_account_distribution(entries):
    """Print account class distribution."""
    table = Table(title="Account Distribution")
    table.add_column("Account Class", style="cyan")
    table.add_column("Count", justify="right")
    table.add_column("Total Amount", justify="right")

    # Group by account class...
    for cls, data in sorted(distribution.items()):
        table.add_row(f"Class {cls}", str(data['count']), f"{data['amount']:,.0f} €")

    console.print(table)

def print_panel(title: str, content: str):
    """Print content in a panel."""
    console.print(Panel(content, title=title))
```

Update `main.py` to use Rich:

```python
from src.cli.output import (
    console, print_header, print_success, print_error,
    print_financial_summary
)
from rich.progress import Progress

@cli.command()
def generate(...):
    """Generate financial reports from FEC file(s)."""

    with Progress() as progress:
        task = progress.add_task("[cyan]Parsing files...", total=len(fec_files))
        for fec_file in fec_files:
            parser = FECParser(fec_file)
            entries = parser.parse()
            progress.update(task, advance=1)
            print_success(f"Parsed {fec_file}: {len(entries)} entries")

    print_header("Building Financial Statements")
    # ... build statements ...
    print_success("P&L statements built")

    print_header("Generating Exports")
    # ... generate files ...

    print_financial_summary(pl_list)
```

---

#### 2.4 Make FECParser Properties Public
**Duration**: 1 hour
**Files**: `apps/api/src/parser/fec_parser.py`

Add public properties:

```python
class FECParser:
    def __init__(self, filepath: str):
        self._encoding = None  # Keep for internal use
        self._delimiter = None
        # ... initialization ...

    @property
    def encoding(self) -> str:
        """Get detected file encoding (UTF-8, Latin-1, CP1252)."""
        return self._encoding

    @property
    def delimiter(self) -> str:
        """Get detected field delimiter (\\t, ;, |)."""
        return self._delimiter

    @property
    def years(self) -> set[int]:
        """Get fiscal years present in file."""
        return set(e.fiscal_year for e in self.entries) if self.entries else set()
```

Update `api.py` and `main.py` to use public properties:

```python
# Before:
"encoding": parser._encoding,
"delimiter": parser._delimiter,

# After:
"encoding": parser.encoding,
"delimiter": parser.delimiter,
```

---

#### 2.5 Temporary File Cleanup
**Duration**: 1.5 hours
**Files**: `apps/api/api.py`, new `src/cleanup.py`

Create cleanup utilities:

```python
# apps/api/src/cleanup.py
import shutil
import time
from pathlib import Path
from datetime import datetime, timedelta
import atexit
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

def cleanup_old_sessions():
    """Remove sessions older than TTL."""
    session_root = Path(settings.UPLOAD_TEMP_DIR)
    if not session_root.exists():
        return

    cutoff_time = time.time() - (settings.SESSION_TTL_HOURS * 3600)

    for session_dir in session_root.iterdir():
        if session_dir.is_dir() and session_dir.stat().st_mtime < cutoff_time:
            try:
                shutil.rmtree(session_dir)
                logger.info(f"Cleaned up old session: {session_dir.name}")
            except Exception as e:
                logger.warning(f"Failed to cleanup {session_dir}: {e}")

# Register cleanup on exit
atexit.register(cleanup_old_sessions)
```

Add periodic cleanup in `api.py`:

```python
import asyncio
from src.cleanup import cleanup_old_sessions

@app.on_event("startup")
async def startup_event():
    """Run cleanup on startup."""
    cleanup_old_sessions()
    logger.info("Wincap API started")

# Optional: Background cleanup task
async def periodic_cleanup():
    """Run cleanup periodically."""
    while True:
        await asyncio.sleep(settings.CLEANUP_INTERVAL_HOURS * 3600)
        cleanup_old_sessions()

# Start cleanup task (optional)
# asyncio.create_task(periodic_cleanup())
```

---

#### 2.6 Extract Constants
**Duration**: 1.5 hours
**Files**: `apps/api/src/config/constants.py` (new)

Create constants file:

```python
# apps/api/src/config/constants.py
from decimal import Decimal
from datetime import datetime

# Date/Time Formats
DATE_FORMAT = "%Y-%m-%d"
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"
TIMESTAMP_FORMAT = "%Y%m%d_%H%M%S"

# File Naming
EXCEL_FILENAME_TEMPLATE = "Databook_{timestamp}.xlsx"
PDF_FILENAME_TEMPLATE = "Rapport_DD_{timestamp}.pdf"
JSON_FILENAME_TEMPLATE = "dashboard_data_{timestamp}.json"

# Account Classes (PCG French)
ACCOUNT_CLASSES = {
    "assets": ["1", "2", "3", "4", "5"],
    "liabilities": ["2", "3", "4"],
    "equity": ["1"],
    "revenue": ["7"],
    "expenses": ["6"],
}

# Precision
DECIMAL_PLACES = 2
CURRENCY_PRECISION = Decimal("0.01")

# Defaults
DEFAULT_VAT_RATE = Decimal("1.20")
DEFAULT_COMPANY_NAME = "Financial Report"
DEFAULT_AUTHOR = "Wincap"

# Validation
VALID_VAT_RATES = {
    "France": Decimal("1.20"),
    "Luxembourg": Decimal("1.17"),
    "Spain": Decimal("1.21"),
    "Germany": Decimal("1.19"),
}

# Trial Balance Tolerance
TRIAL_BALANCE_TOLERANCE = Decimal("0.01")
```

Use in code:

```python
from src.config.constants import EXCEL_FILENAME_TEMPLATE, TIMESTAMP_FORMAT

# Before:
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
excel_path = output_dir / f"Databook_{timestamp}.xlsx"

# After:
timestamp = datetime.now().strftime(TIMESTAMP_FORMAT)
excel_path = output_dir / EXCEL_FILENAME_TEMPLATE.format(timestamp=timestamp)
```

---

### Phase 2 Deliverables
- ✅ `apps/api/src/logging_config.py` - Centralized logging
- ✅ `apps/api/src/cli/output.py` - Rich output utilities
- ✅ Updated `apps/api/main.py` - Uses Rich and logging
- ✅ Updated `apps/api/src/parser/fec_parser.py` - Public properties
- ✅ `apps/api/src/cleanup.py` - Session cleanup
- ✅ `apps/api/src/config/constants.py` - Constants extraction
- ✅ Updated `pyproject.toml` - Rich dependency
- ✅ Tests for all changes

**Phase 2 Acceptance Criteria**:
- [ ] CLI output uses colors and formatting (Rich)
- [ ] Progress bars shown for long operations
- [ ] Structured logging to file and console
- [ ] Old sessions cleaned up automatically
- [ ] All magic strings extracted to constants
- [ ] FECParser public API doesn't expose private attributes

---

## Phase 3: Testing Infrastructure (Week 3)

### Goals
- 🧪 Unit tests for builders and calculators
- 🔗 Integration tests for CLI commands
- 🌐 API endpoint tests
- 📋 Export format validation tests
- 📊 Data integrity tests

### Tasks

#### 3.1 Unit Tests for Builders
**Duration**: 4 hours
**Files**: `apps/api/tests/test_*.py`

Test structure:

```python
# tests/test_pl_builder.py
import pytest
from decimal import Decimal
from src.engine.pl_builder import PLBuilder
from src.models.entry import JournalEntry
from datetime import date

@pytest.fixture
def sample_entries():
    return [
        JournalEntry(
            date=date(2024, 1, 15),
            account_num="701000",
            label="Revenue",
            debit=Decimal("1000"),
            credit=Decimal("0"),
        ),
        JournalEntry(
            date=date(2024, 1, 20),
            account_num="611000",
            label="Supplies",
            debit=Decimal("0"),
            credit=Decimal("200"),
        ),
    ]

def test_pl_builder_revenue(sample_entries):
    builder = PLBuilder(AccountMapper())
    pl = builder.build_single_year(sample_entries, 2024)
    assert pl.revenue == Decimal("1000")

def test_pl_builder_ebitda(sample_entries):
    # ... test EBITDA calculation ...
```

---

#### 3.2 Integration Tests for CLI
**Duration**: 4 hours
**Files**: `apps/api/tests/test_cli_generate.py`

Test CLI commands:

```python
# tests/test_cli_generate.py
import pytest
from click.testing import CliRunner
from main import cli
from pathlib import Path
import tempfile

@pytest.fixture
def runner():
    return CliRunner()

@pytest.fixture
def sample_fec_file():
    # Create minimal FEC file
    content = """JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tDebitAmnt\tCreditAmnt
VT\tVentes\t1\t20240101\t701000\tVente\t1000\t0
BQ\tBanque\t2\t20240101\t512000\tBank\t0\t1000"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(content)
        return f.name

def test_generate_command_basic(runner, sample_fec_file):
    with tempfile.TemporaryDirectory() as tmpdir:
        result = runner.invoke(cli, [
            'generate',
            '-f', sample_fec_file,
            '-n', 'Test Company',
            '-o', tmpdir,
            '--excel',
            '--no-pdf'
        ])

        assert result.exit_code == 0
        output_files = list(Path(tmpdir).glob("*.xlsx"))
        assert len(output_files) > 0
```

---

#### 3.3 API Endpoint Tests
**Duration**: 3 hours
**Files**: `apps/api/tests/test_api_endpoints.py`

Test FastAPI endpoints:

```python
# tests/test_api_endpoints.py
import pytest
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_upload_fec(sample_fec_file):
    with open(sample_fec_file, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"files": ("test.txt", f)}
        )

    assert response.status_code == 200
    assert "session_id" in response.json()
```

---

#### 3.4 Data Integrity Tests
**Duration**: 2 hours
**Files**: `apps/api/tests/test_data_integrity.py`

Test financial calculations:

```python
# tests/test_data_integrity.py
def test_trial_balance_balanced(sample_entries):
    """Verify debits equal credits."""
    total_debit = sum(e.debit for e in sample_entries)
    total_credit = sum(e.credit for e in sample_entries)
    assert total_debit == total_credit

def test_pl_consistency(pl_list):
    """Verify P&L calculations."""
    for pl in pl_list:
        # EBIT = EBITDA - Depreciation
        assert pl.ebit == (pl.ebitda - pl.depreciation)

        # Revenue >= EBITDA (typically)
        assert pl.revenue >= pl.ebitda or pl.ebitda < 0
```

---

#### 3.5 Setup pytest Configuration
**Duration**: 1 hour
**Files**: `apps/api/pytest.ini`, `apps/api/tests/conftest.py`

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --cov=src
```

```python
# tests/conftest.py
import pytest
from pathlib import Path
from src.parser.fec_parser import FECParser

@pytest.fixture(scope="session")
def test_data_dir():
    return Path(__file__).parent / "data"

@pytest.fixture
def sample_fec_path(test_data_dir):
    return test_data_dir / "sample_fy2024.txt"
```

---

### Phase 3 Deliverables
- ✅ `apps/api/tests/` directory structure
- ✅ Unit tests for all builders (20+ tests)
- ✅ Integration tests for CLI (15+ tests)
- ✅ API endpoint tests (10+ tests)
- ✅ Data integrity tests (10+ tests)
- ✅ `pytest.ini` and `conftest.py`
- ✅ Test sample data files

**Phase 3 Acceptance Criteria**:
- [ ] All tests pass: `pytest apps/api/tests/`
- [ ] Code coverage > 70%
- [ ] No regressions introduced
- [ ] Test run time < 30 seconds

**Run Tests**:
```bash
cd apps/api
pip install pytest pytest-cov
pytest tests/ --cov=src --cov-report=html
```

---

## Phase 4: Code Quality & Documentation (Week 4)

### Goals
- 📝 Code organization and refactoring
- 📚 API documentation
- ⚡ Performance optimization
- 🎯 Code quality standards

### Tasks

#### 4.1 Code Organization (API Module Split)
**Duration**: 3 hours
**Files**: `apps/api/routers/` (new)

Create modular endpoint structure:

```
apps/api/routers/
├── __init__.py
├── upload.py      # Upload endpoints
├── process.py     # Processing endpoints
└── export.py      # Export endpoints
```

```python
# apps/api/routers/upload.py
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload")
async def upload_fec(files: List[UploadFile] = File(...)):
    """Upload FEC file(s) for processing."""
    # ... implementation ...
```

Update `api.py`:

```python
from fastapi import FastAPI
from routers import upload, process, export

app = FastAPI(...)

app.include_router(upload.router)
app.include_router(process.router)
app.include_router(export.router)
```

---

#### 4.2 Code Quality Tools
**Duration**: 2 hours

Install and configure:

```bash
pip install black ruff mypy
```

```toml
# pyproject.toml
[tool.black]
line-length = 100
target-version = ["py310"]

[tool.ruff]
line-length = 100
select = ["E", "F", "W", "I"]
ignore = ["E501"]  # Line too long (black handles this)

[tool.mypy]
python_version = "3.10"
warn_return_any = true
warn_unused_configs = true
```

Run:
```bash
black apps/api/src/ --check
ruff check apps/api/
mypy apps/api/src/
```

---

#### 4.3 API Documentation
**Duration**: 1 hour

FastAPI auto-generates docs. Enhance with docstrings:

```python
@app.post("/api/process")
async def process_fec(request: ProcessRequest):
    """
    Process uploaded FEC data and generate financial statements.

    This endpoint takes FEC entries from a previous upload session
    and generates financial statements, KPIs, and variance analysis.

    **Parameters:**
    - `session_id`: ID from previous upload
    - `company_name`: Company name for reports
    - `years`: Specific fiscal years to include
    - `detailed`: Include detailed analysis (monthly, account detail)
    - `vat_rate`: VAT rate for DSO/DPO calculations

    **Returns:**
    - Financial statements (P&L, Balance Sheet)
    - KPIs and cash flow analysis
    - Monthly breakdown (if detailed=true)
    - Variance analysis (if multi-year)

    **Examples:**
    ```json
    {
        "session_id": "uuid-here",
        "company_name": "ACME Inc",
        "years": [2023, 2024],
        "detailed": true,
        "vat_rate": 1.20
    }
    ```
    """
```

Access at: `http://localhost:8000/api/docs`

---

#### 4.4 Performance Optimization
**Duration**: 2 hours

```python
# apps/api/src/cache.py
from functools import lru_cache
from src.mapper.account_mapper import AccountMapper

@lru_cache(maxsize=1)
def get_account_mapper() -> AccountMapper:
    """Cache account mapper (expensive to load)."""
    return AccountMapper()

# Usage:
mapper = get_account_mapper()
```

Lazy-load expensive imports:

```python
# Before:
import weasyprint  # Heavy import

# After:
def generate_pdf(...):
    import weasyprint  # Import only when needed
    ...
```

---

#### 4.5 Update README and CONTRIBUTING
**Duration**: 1.5 hours

Create `CONTRIBUTING.md`:

```markdown
# Contributing to Wincap

## Development Setup

```bash
cd apps/api
pip install -e ".[dev]"
```

## Code Standards

- **Format**: Black (`black src/`)
- **Lint**: Ruff (`ruff check src/`)
- **Type**: MyPy (`mypy src/`)
- **Tests**: Pytest (`pytest tests/`)

## Running Tests

```bash
pytest tests/ -v --cov=src
```

## Before Committing

```bash
black src/
ruff check src/
mypy src/
pytest tests/
```
```

---

### Phase 4 Deliverables
- ✅ Refactored API routers
- ✅ Code quality configuration (Black, Ruff, MyPy)
- ✅ Enhanced API documentation
- ✅ Performance optimizations
- ✅ `CONTRIBUTING.md` guide
- ✅ Pre-commit hooks configuration

**Phase 4 Acceptance Criteria**:
- [ ] Code passes Black, Ruff, MyPy checks
- [ ] API docs accessible at `/api/docs`
- [ ] Performance benchmarks show 10%+ improvement
- [ ] Code review checklist complete

---

## Implementation Timeline

```
Week 1 (Phase 1):
  Mon-Tue: Config system, CORS, validation
  Wed-Thu: Exception handling, logging
  Fri: Testing, documentation

Week 2 (Phase 2):
  Mon-Tue: Rich library integration
  Wed-Thu: Cleanup, constants extraction
  Fri: Testing, integration

Week 3 (Phase 3):
  Mon-Wed: Unit tests (builders)
  Thu-Fri: Integration tests (CLI, API)

Week 4 (Phase 4):
  Mon-Tue: Code organization, quality tools
  Wed-Thu: Documentation, optimization
  Fri: Final review, release prep
```

---

## Success Metrics

### Phase 1 (Security)
- [ ] 0 hardcoded secrets in code
- [ ] All file uploads validated
- [ ] No CORS wildcard
- [ ] Configuration via environment

### Phase 2 (UX/Observability)
- [ ] CLI output uses colors/formatting
- [ ] All events logged
- [ ] Temp files cleaned automatically
- [ ] Constants extracted

### Phase 3 (Quality)
- [ ] Code coverage > 70%
- [ ] No critical/high vulnerabilities
- [ ] All tests passing
- [ ] Performance < 2s per FEC

### Phase 4 (Maintainability)
- [ ] Code passes static analysis
- [ ] API docs complete
- [ ] Contributing guide exists
- [ ] Code review standards documented

---

## Rollback Plan

If any phase fails critical acceptance criteria:

1. **Phase 1 Failure**: Revert config changes, keep hardcoded defaults
2. **Phase 2 Failure**: Keep logging only (no Rich), use basic text output
3. **Phase 3 Failure**: Keep existing test structure, add more gradually
4. **Phase 4 Failure**: Skip refactoring, keep monolithic API

---

## Post-Implementation Tasks

After all 4 phases:

- [ ] Deploy to staging environment
- [ ] Run 48-hour stability test
- [ ] Performance profiling
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor logs and metrics
- [ ] Gather feedback

---

## Future Roadmap (Post-Phase 4)

- **Phase 5** (Weeks 5-6): Multi-instance deployment (Redis sessions)
- **Phase 6** (Weeks 7-8): User authentication (Supabase Auth)
- **Phase 7** (Weeks 9-10): Database integration (PostgreSQL)
- **Phase 8** (Weeks 11-12): Advanced analytics (forecasting, ML)

