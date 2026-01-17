# Wincap SaaS - Architecture Documentation

## System Overview

Wincap SaaS is a financial due diligence (DD) report automation platform that transforms French FEC (Fichier des Écritures Comptables) accounting files into professional multi-year financial reports.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Wincap SaaS Monorepo                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐      ┌──────────────────────────┐ │
│  │   apps/api (Python)      │      │  apps/web (React/TS)     │ │
│  │  ─────────────────────── │      │  ──────────────────────  │ │
│  │                          │      │                          │ │
│  │  ┌──────────────────┐   │      │  ┌──────────────────┐   │ │
│  │  │  api.py (FastAPI)│   │      │  │  React Components│   │ │
│  │  │  - REST Endpoints│   │      │  │  - Dashboard     │   │ │
│  │  │  - File Upload   │   │      │  │  - Reports       │   │ │
│  │  │  - CORS Support  │   │      │  │  - Charts        │   │ │
│  │  └──────────────────┘   │      │  └──────────────────┘   │ │
│  │                          │      │                          │ │
│  │  ┌──────────────────┐   │      └──────────────────────────┘ │
│  │  │  main.py (CLI)   │   │                                    │
│  │  │  - Click Commands│   │      ┌──────────────────────────┐ │
│  │  │  - Standalone    │   │      │ packages/shared (Types) │ │
│  │  │  - Batch Proc.   │   │      │ ────────────────────── │ │
│  │  └──────────────────┘   │      │ TypeScript Type Defs   │ │
│  │                          │      └──────────────────────────┘ │
│  │  ┌─────────────────────────────────────────────────────┐   │
│  │  │           Financial Processing Pipeline             │   │
│  │  │  ─────────────────────────────────────────────────  │   │
│  │  │                                                     │   │
│  │  │  PARSER         MAPPER        BUILDERS    EXPORT   │   │
│  │  │  ──────         ──────        ────────    ──────   │   │
│  │  │                                                     │   │
│  │  │  FECParser → AccountMapper → PLBuilder → Excel     │   │
│  │  │     ↓            ↓             ↓           ↓       │   │
│  │  │  Encoding   Account Mapping   Balance   PDF        │   │
│  │  │  Detection  Classification    Sheet     JSON       │   │
│  │  │  Delimiter  Hierarchy         KPIs               │   │
│  │  │  Date Parse               CashFlow              │   │
│  │  │                           Monthly               │   │
│  │  │                           Variance              │   │
│  │  │                           Details               │   │
│  │  └─────────────────────────────────────────────────────┘   │
│  │                                                            │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Parser Module (`src/parser/`)

**FECParser** - Reads and parses French FEC accounting files

- **Responsibilities**:
  - Auto-detect file encoding (UTF-8, Latin-1, CP1252)
  - Handle variable delimiters (tab, semicolon, pipe)
  - Parse date formats (DD/MM/YYYY, YYYY-MM-DD)
  - Extract fiscal year from filename (e.g., `FEC20241231.txt` → 2024)
  - Validate accounting entries (debit/credit pairs)

- **Input**: Raw FEC file text
- **Output**: List of `JournalEntry` objects

- **Key Methods**:
  - `parse()`: Main entry point
  - `_auto_detect_encoding()`: Determine file encoding
  - `_auto_detect_delimiter()`: Identify field separator
  - `_extract_fiscal_year()`: Get year from filename

**Data Classes**:
```python
@dataclass
class JournalEntry:
    date: date
    account_num: str
    label: str
    debit: Decimal
    credit: Decimal
    source_year: Optional[int]  # From filename

    @property
    def fiscal_year(self) -> int        # From entry date
    @property
    def effective_year(self) -> int     # Prefers source_year
```

---

### 2. Mapper Module (`src/mapper/`)

**AccountMapper** - Maps raw accounts to financial statement line items

- **Responsibilities**:
  - Load account mapping configuration (YAML)
  - Classify accounts by type (Revenue, Expenses, Assets, Liabilities)
  - Apply account hierarchy and rollups
  - Support custom mapping via config files

- **Account Classifications** (French PCG):
  - **700-799**: Revenue (Produits)
  - **600-699**: Expenses (Charges)
  - **1-5xx**: Assets (Actif)
  - **2-4xx**: Liabilities & Equity (Passif)

- **Key Methods**:
  - `get_category(account_num)`: Return account classification
  - `load_config(filepath)`: Load custom YAML mapping
  - `normalize_account(raw_num)`: Standardize account format

---

### 3. Models Module (`src/models/`)

**Core Data Structures**

#### ProfitLoss (P&L Statement)
```python
@dataclass
class ProfitLoss:
    year: int
    revenue: Decimal
    purchases: Decimal
    external_charges: Decimal
    personnel: Decimal
    depreciation: Decimal
    financial_income/expense: Decimal
    exceptional_income/expense: Decimal
    income_tax: Decimal

    # Properties:
    - production: revenue + other_revenue
    - ebitda: production - total_charges
    - ebit: ebitda - depreciation
    - net_income: ebit + fin_result + exc_result - tax
    - ebitda_margin: ebitda / production
```

#### BalanceSheet
```python
@dataclass
class BalanceSheet:
    year: int
    # Assets
    current_assets: Dict[str, Decimal]
    fixed_assets: Dict[str, Decimal]
    total_assets: Decimal

    # Liabilities
    current_liabilities: Dict[str, Decimal]
    long_term_debt: Dict[str, Decimal]
    equity: Decimal
```

#### KPIs
```python
@dataclass
class KPIs:
    year: int
    dso: Decimal          # Days Sales Outstanding
    dpo: Decimal          # Days Payable Outstanding
    dio: Decimal          # Days Inventory Outstanding
    roic: Decimal         # Return on Invested Capital
    roe: Decimal          # Return on Equity
    debt_to_ebitda: Decimal
    interest_coverage: Decimal
    current_ratio: Decimal
```

---

### 4. Engine Module (`src/engine/`)

Financial statement builders and calculators

#### PLBuilder
- Aggregates journal entries into P&L statement
- Handles multi-year P&L construction
- Computes derived metrics (EBITDA, EBIT, net income)

#### BalanceBuilder
- Constructs cumulative balance sheets
- Calculates BFR (Working Capital Requirement)
- Tracks asset/liability evolution

#### KPICalculator
- Computes efficiency and profitability ratios
- Applies Quality of Earnings (QoE) adjustments
- Handles VAT rate adjustments for DSO/DPO

#### MonthlyBuilder
- Breaks down revenue and costs by month
- Calculates monthly EBITDA
- Generates quarterly summaries
- Computes seasonality indices

#### VarianceBuilder
- Compares consecutive fiscal years
- Builds EBITDA bridge (shows year-over-year changes)
- Computes cost breakdown variance
- Calculates KPI evolution

#### CashFlowBuilder
- Converts accrual P&L to cash basis
- Tracks working capital changes
- Computes free cash flow

#### DetailBuilder
- Extracts top accounts by magnitude
- Builds category breakdown by revenue/expense type
- Generates account-level detail reports

---

### 5. Export Module (`src/export/`)

#### ExcelWriter
- Generates multi-sheet XLSX workbooks
- Creates sheets for: P&L, Balance Sheet, KPIs, Monthly, Variance, etc.
- Applies formatting (colors, fonts, number formats)
- Supports Dashboard JSON export

#### PDFWriter
- Generates styled PDF reports using ReportLab
- Creates cover page, financial statements, KPI tables
- Pure Python implementation (no system dependencies)

#### TemplateWriter
- Renders Jinja2 templates for custom reports
- Supports PPTX generation (via python-pptx)

---

### 6. API Layer (`api.py`)

FastAPI REST endpoints for web integration

**Endpoints**:
- `POST /api/upload`: Upload FEC file(s)
- `POST /api/process`: Process and generate reports
- `GET /api/export/xlsx`: Download Excel
- `GET /api/export/pdf`: Download PDF
- `GET /api/export/json`: Get JSON data

**Session Management**:
- In-memory storage of processed results
- Temporary file management
- CORS support for frontend

---

### 7. CLI Layer (`main.py`)

Click-based command-line interface for batch processing

**Current Commands**:
- `generate`: Main command for report generation
  - Options: FEC files, company name, output directory
  - Flags: `--excel`, `--pdf`, `--json`, `--detailed`
  - Filtering: `--years` for specific fiscal years

---

## Data Flow

### Batch Processing (CLI)
```
User Input
    ↓
[CLI main.py]
    ↓
Load FEC Files → FECParser
    ↓
Parse Entries (list[JournalEntry])
    ↓
Filter by Year (optional)
    ↓
Initialize AccountMapper
    ↓
Build Financial Statements:
  - PLBuilder → list[ProfitLoss]
  - BalanceBuilder → list[BalanceSheet]
  - KPICalculator → list[KPIs]
  - CashFlowBuilder → list[CashFlow]
  - MonthlyBuilder → dict[monthly data]
  - VarianceBuilder → dict[variance data]
    ↓
Export:
  - ExcelWriter → .xlsx
  - PDFWriter → .pdf
  - JSON Export → .json
    ↓
Output Files
```

### Web API Flow
```
User (React Frontend)
    ↓
[FastAPI api.py]
    ↓
POST /api/upload → Save FEC file
    ↓
POST /api/process → Run pipeline (same as CLI)
    ↓
GET /api/export/* → Retrieve generated files
    ↓
Response to Frontend
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **CLI** | Click | >=8.1 |
| **API** | FastAPI | >=0.109.0 |
| **Server** | Uvicorn | >=0.27.0 |
| **Data** | Pandas | >=2.0 |
| **Excel** | OpenPyXL | >=3.1 |
| **PDF** | ReportLab | >=60.0 |
| **Templates** | Jinja2 | >=3.1 |
| **Config** | PyYAML | >=6.0 |
| **Frontend** | React | >=18 |
| **Frontend Build** | Vite | >=5.0 |
| **Styling** | Tailwind CSS | >=3.0 |
| **Charts** | Recharts | >=2.0 |
| **Testing** | pytest | >=7.0 |

---

## File Structure

```
wincap-saas/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── parser/
│   │   │   │   ├── __init__.py
│   │   │   │   └── fec_parser.py
│   │   │   ├── mapper/
│   │   │   │   ├── __init__.py
│   │   │   │   └── account_mapper.py
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── entry.py
│   │   │   │   └── financials.py
│   │   │   ├── engine/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pl_builder.py
│   │   │   │   ├── balance_builder.py
│   │   │   │   ├── kpi_calculator.py
│   │   │   │   ├── monthly_builder.py
│   │   │   │   ├── variance_builder.py
│   │   │   │   ├── cashflow_builder.py
│   │   │   │   └── detail_builder.py
│   │   │   ├── export/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── excel_writer.py
│   │   │   │   ├── pdf_writer.py
│   │   │   │   └── template_writer.py
│   │   │   └── __init__.py
│   │   ├── config/
│   │   │   └── account_mapping.yaml
│   │   ├── templates/
│   │   │   ├── excel/
│   │   │   └── pdf/
│   │   ├── api.py           # FastAPI app
│   │   ├── main.py          # CLI entrypoint
│   │   ├── pyproject.toml
│   │   └── README.md
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── modules/
│   │   │   │   └── dd-report/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── config/              # Shared env config
├── packages/
│   └── shared/              # Shared TS types
├── docs/
│   ├── ARCHITECTURE.md      # This file
│   ├── TECHNICAL_DEBT.md
│   ├── CLI_SPEC.md
│   └── IMPLEMENTATION_PLAN.md
├── docker-compose.yml
├── package.json             # Root monorepo config
├── README.md
└── .git/
```

---

## Key Design Patterns

### 1. **Pipeline Pattern**
Sequential processing: Parser → Mapper → Builders → Export

### 2. **Builder Pattern**
Each financial metric type has dedicated builder class

### 3. **Dataclass Models**
Immutable, type-safe representations of financial concepts

### 4. **Decimal Arithmetic**
All monetary values use Python's `Decimal` for precision

### 5. **Multi-Layer Architecture**
- CLI for batch processing
- FastAPI for web services
- Shared core business logic

---

## Performance Characteristics

| Operation | Time (est.) | Notes |
|-----------|------------|-------|
| Parse 50MB FEC | 2-5s | Auto-detect encoding + delimiter |
| Build P&L (3 years) | <100ms | In-memory aggregation |
| Export to Excel | 500ms-1s | Includes formatting |
| Generate PDF | 1-2s | ReportLab rendering |
| API response (typical) | <2s | File upload + processing + export |

---

## Testing Coverage

**Current Status**: 0 tests (test infrastructure planned)

**Planned Test Structure**:
- Unit tests for builders/calculators
- Integration tests for CLI commands
- API endpoint tests
- Export format validation
- Data integrity checks (trial balance, etc.)

---

## Known Limitations & TODOs

1. **Session Management**: In-memory only (should use Redis/DB)
2. **Authentication**: Not implemented (Supabase Auth planned)
3. **Database**: No persistent storage (PostgreSQL planned)
4. **Error Handling**: Limited validation for invalid input files
5. **CLI Output**: Basic text (Rich library planned for colors/tables)
6. **Tests**: No test suite (comprehensive tests planned)
7. **PDF Generation**: WeasyPrint with system dependencies (ReportLab fallback added)

---

## Dependency Management

### Backend (`pyproject.toml`)
- Core: pandas, openpyxl, jinja2, pyyaml
- CLI: click
- API: fastapi, uvicorn
- Exports: weasyprint, reportlab
- Dev: pytest, pytest-cov, black, ruff, mypy

### Frontend (`apps/web/package.json`)
- Framework: react, react-router-dom
- Build: vite, typescript
- Styling: tailwind
- Charts: recharts
- Form handling: react-hook-form, zod

---

## Future Roadmap

1. **Phase 1**: CLI enhancement with Rich (colors, progress bars, tables)
2. **Phase 2**: Comprehensive test coverage (unit + integration + E2E)
3. **Phase 3**: Database integration (PostgreSQL + session persistence)
4. **Phase 4**: User authentication (Supabase)
5. **Phase 5**: Advanced analytics (trend analysis, forecasting)
6. **Phase 6**: Multi-language support (FR, EN, ES)

