# Wincap SaaS - Technical Debt Inventory

## Priority: CRITICAL

### 1. Session Management (In-Memory)
**Location**: `apps/api/api.py:51`

**Issue**:
```python
SESSIONS = {}  # In-memory dictionary
```

**Problems**:
- Sessions lost on server restart
- No scalability for multiple instances
- Memory leak risk (sessions never cleaned up)
- Not suitable for production

**Impact**: High - Breaks multi-instance deployments

**Recommended Fix**:
- Implement Redis-based session store
- Add session expiration (TTL: 24 hours)
- Cleanup endpoint to manually clear old sessions
- Alternative: PostgreSQL with `sessions` table

**Estimated Effort**: 4-6 hours

---

### 2. CORS Configuration (Hardcoded Origins)
**Location**: `apps/api/api.py:42-47`

**Issue**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],  # Includes wildcard!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Problems**:
- Wildcard `"*"` allows any origin (security risk)
- Hardcoded localhost origins (not suitable for production)
- Allows credentials with wildcard origins (contradictory)
- No environment-based configuration

**Impact**: High - Security vulnerability

**Recommended Fix**:
```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
```

**Estimated Effort**: 1 hour

---

### 3. Error Handling (Generic Exception Catching)
**Location**: `apps/api/api.py:125-136`

**Issue**:
```python
try:
    parser = FECParser(str(file_path))
    entries = parser.parse()
except Exception as e:  # Too broad
    raise HTTPException(status_code=400, detail=f"Failed to parse {file.filename}: {str(e)}")
```

**Problems**:
- Catches all exceptions (masks programming errors)
- Exposes internal error details to clients
- No logging for debugging
- No distinction between user errors and system errors

**Impact**: Medium - Makes debugging difficult

**Recommended Fix**:
```python
from src.exceptions import FECParsingError

try:
    parser = FECParser(str(file_path))
    entries = parser.parse()
except FECParsingError as e:
    logger.warning(f"FEC parse failed: {e}")
    raise HTTPException(status_code=400, detail="Invalid FEC file format")
except Exception as e:
    logger.error(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

**Estimated Effort**: 3-4 hours

---

## Priority: HIGH

### 4. Magic Strings & Hardcoded Values
**Locations**: Multiple files

**Examples**:

a) **Timestamp Format** (`apps/api/main.py:257`)
```python
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
```

b) **File Naming** (`apps/api/main.py:262`)
```python
f"Databook_{timestamp}.xlsx"
f"Rapport_DD_{timestamp}.pdf"
```

c) **Account Classes** (scattered across code)
```python
# Hardcoded "700" for revenue, "60" for expenses
```

d) **VAT Rate Default** (`apps/api/api.py:184`)
```python
vat_rate=Decimal(str(request.vat_rate))  # No validation
```

**Problems**:
- Difficult to test (constants in code)
- Hard to change globally
- No validation of values
- Repeated string literals

**Impact**: Medium - Makes codebase harder to maintain

**Recommended Fix**: Create `src/config/constants.py`
```python
# Timestamp formats
DATE_FORMAT = "%Y-%m-%d"
TIMESTAMP_FORMAT = "%Y%m%d_%H%M%S"

# File naming
EXCEL_FILENAME_TEMPLATE = "Databook_{timestamp}.xlsx"
PDF_FILENAME_TEMPLATE = "Rapport_DD_{timestamp}.pdf"

# Account classes
ACCOUNT_CLASSES = {
    "revenue": "70",
    "expenses": "6",
    "assets": "1-5",
    "liabilities": "2-4",
}

# VAT rates (validation)
VALID_VAT_RATES = {
    "France": Decimal("1.20"),
    "Germany": Decimal("1.19"),
}
DEFAULT_VAT_RATE = Decimal("1.20")
```

**Estimated Effort**: 2-3 hours

---

### 5. CLI Output Formatting (Text Only)
**Location**: `apps/api/main.py` (entire CLI)

**Issue**:
```python
click.echo(f"WincapAgent - Processing {len(fec_files)} file(s)...")
click.echo(f"  Parsing: {fec_file}")
click.echo(f"    → {len(entries)} entries loaded")
```

**Problems**:
- No colors or formatting
- No progress indicators for long operations
- No structured output (table format)
- Hard to scan large outputs
- No option for machine-readable output (JSON mode)

**Impact**: Low - UX issue, not functional

**Recommended Enhancement**: Implement Rich library
```python
from rich.console import Console
from rich.table import Table
from rich.progress import Progress

console = Console()

# Colored output
console.print("[green]✓ Processing complete[/green]")

# Table output
table = Table(title="Financial Summary")
table.add_column("Metric", style="cyan")
table.add_column("Value", style="magenta")
for pl in pl_list:
    table.add_row(f"FY{pl.year} Revenue", f"{float(pl.revenue/1000):,.0f} k€")
console.print(table)

# Progress bar
with Progress() as progress:
    task = progress.add_task("[cyan]Processing files...", total=len(fec_files))
    for file in fec_files:
        # Process file
        progress.update(task, advance=1)
```

**Estimated Effort**: 3-4 hours

---

### 6. File Validation (Missing Input Validation)
**Location**: `apps/api/api.py:103-136`

**Issue**:
```python
for file in files:
    file_path = session_dir / file.filename  # No validation!
    content = await file.read()  # No size check
    with open(file_path, "wb") as f:
        f.write(content)
```

**Problems**:
- No file type validation (could upload any file)
- No file size limits (DoS risk)
- No filename sanitization (path traversal risk)
- No duplicate filename handling

**Impact**: High - Security vulnerability

**Recommended Fix**:
```python
# Add to config
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".txt"}

for file in files:
    # Validate file type
    if Path(file.filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Invalid file type: {file.filename}")

    # Check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large")

    # Sanitize filename
    safe_filename = Path(file.filename).name  # Remove path traversal
    file_path = session_dir / safe_filename
```

**Estimated Effort**: 2 hours

---

### 7. Private Attribute Access
**Location**: `apps/api/api.py:133-134`

**Issue**:
```python
"encoding": parser._encoding,        # Accessing private attribute
"delimiter": parser._delimiter,      # Accessing private attribute
```

And in `apps/api/main.py:319-320`:
```python
click.echo(f"Encoding: {parser._encoding}")
click.echo(f"Delimiter: {repr(parser._delimiter)}")
```

**Problems**:
- Breaks encapsulation
- Makes refactoring harder
- Relies on undocumented API

**Impact**: Low - Design smell

**Recommended Fix**: Add public properties to `FECParser`
```python
@property
def encoding(self) -> str:
    """Get detected file encoding."""
    return self._encoding

@property
def delimiter(self) -> str:
    """Get detected field delimiter."""
    return self._delimiter
```

**Estimated Effort**: 1 hour

---

## Priority: MEDIUM

### 8. Missing Logging Infrastructure
**Impact**: Medium - Difficulty debugging production issues

**Issue**: No centralized logging
```python
# Current approach: no logging anywhere
# Only CLI echo statements
```

**Recommended Fix**:
```python
import logging
import logging.handlers

# Setup logging
logger = logging.getLogger(__name__)
handler = logging.FileHandler("wincap.log")
handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
))
logger.addHandler(handler)

# Use throughout
logger.info(f"Processing {len(files)} FEC files")
logger.warning(f"Trial balance imbalance in FY{year}")
logger.error(f"Failed to parse file: {e}", exc_info=True)
```

**Estimated Effort**: 2-3 hours

---

### 9. Testing Infrastructure (Zero Tests)
**Impact**: High - No regression detection

**Issue**: No test coverage

**Current State**:
- 0 unit tests
- 0 integration tests
- 0 API tests
- 0 CLI tests

**Recommended Approach**:
1. Unit tests for calculators (KPICalculator, builders)
2. Integration tests for CLI commands
3. API endpoint tests
4. Export format validation tests

**Estimated Effort**: 20-30 hours (full suite)

---

### 10. Temporary File Management
**Location**: `apps/api/api.py:111-112`

**Issue**:
```python
session_dir = Path(tempfile.gettempdir()) / "wincap" / session_id
session_dir.mkdir(parents=True, exist_ok=True)
```

**Problems**:
- No cleanup of temporary files
- Directory accumulates indefinitely
- No TTL on temporary sessions

**Impact**: Medium - Disk space leak

**Recommended Fix**:
```python
import atexit
import shutil

# Cleanup on exit
def cleanup_old_sessions():
    session_root = Path(tempfile.gettempdir()) / "wincap"
    if session_root.exists():
        # Remove sessions older than 24 hours
        cutoff = time.time() - (24 * 3600)
        for session_dir in session_root.iterdir():
            if session_dir.is_dir() and session_dir.stat().st_mtime < cutoff:
                shutil.rmtree(session_dir, ignore_errors=True)

atexit.register(cleanup_old_sessions)
```

**Estimated Effort**: 1-2 hours

---

### 11. Configuration Management
**Impact**: Medium - Hard to deploy to different environments

**Issue**: Hardcoded configuration values

**Current**:
- Hardcoded CORS origins
- Hardcoded file paths
- Hardcoded defaults

**Recommended Fix**: Use environment variables and `.env` file
```python
# .env.example (existing but incomplete)
# Add:
DATABASE_URL=postgresql://localhost/wincap
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:5173,https://app.wincap.io
LOG_LEVEL=INFO
MAX_FILE_SIZE_MB=50
SESSION_TTL_HOURS=24
```

**Estimated Effort**: 2 hours

---

### 12. API Documentation (Missing)
**Impact**: Low - Makes API integration harder

**Issue**: No OpenAPI/Swagger documentation

**Recommended Fix**: Automatic from FastAPI
```python
app = FastAPI(
    title="Wincap API",
    description="Financial Due Diligence Report Generation",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)
```

**Estimated Effort**: 0 hours (FastAPI does this automatically)

---

## Priority: LOW

### 13. Performance Optimizations
**Impact**: Low - System is fast enough for current scale

**Potential Improvements**:
1. Cache account mapping on first load
2. Lazy-load templates
3. Stream large file uploads
4. Parallel processing of multiple FEC files

**Estimated Effort**: 8-12 hours

---

### 14. Code Organization
**Minor Issues**:
- `main.py` is 400+ lines (split into modules)
- `api.py` could be split by endpoint group
- No separation of concerns (parsing, business logic, API)

**Recommended**: Create `apps/api/routers/` directory
```
routers/
├── upload.py     # Upload endpoints
├── process.py    # Processing endpoints
└── export.py     # Export endpoints
```

**Estimated Effort**: 4-6 hours

---

## Summary Table

| Issue | Priority | Impact | Effort | Status |
|-------|----------|--------|--------|--------|
| In-Memory Sessions | CRITICAL | System breaks at scale | 4-6h | TODO |
| CORS Wildcard | CRITICAL | Security vulnerability | 1h | TODO |
| Broad Exception Handling | CRITICAL | Hard to debug | 3-4h | TODO |
| File Validation | CRITICAL | Security vulnerability | 2h | TODO |
| Magic Strings | HIGH | Hard to maintain | 2-3h | TODO |
| CLI Formatting | HIGH | Poor UX | 3-4h | TODO |
| Logging | MEDIUM | Hard to debug prod | 2-3h | TODO |
| Test Suite | MEDIUM | No regression detection | 20-30h | TODO |
| Temp File Cleanup | MEDIUM | Disk space leak | 1-2h | TODO |
| Config Management | MEDIUM | Hard to deploy | 2h | TODO |
| Private Attributes | LOW | Design smell | 1h | TODO |
| API Documentation | LOW | Poor integration | 0h | ✓ Auto-done |
| Performance | LOW | Not needed yet | 8-12h | TODO |
| Code Organization | LOW | Hard to navigate | 4-6h | TODO |

---

## Quick Wins (Implement First)

1. ✅ Add Rich formatting to CLI (3-4h) → Big UX improvement
2. ✅ Fix CORS configuration (1h) → Security fix
3. ✅ Add file validation (2h) → Security fix
4. ✅ Create constants.py (2-3h) → Easier to maintain
5. ✅ Add public properties to FECParser (1h) → Better API

**Total Quick Wins**: ~10 hours

---

## Phase Implementation Plan

**Phase 1** (Weeks 1-2): Security & Configuration
- Fix CORS
- Add file validation
- Config management via environment variables
- Add logging infrastructure

**Phase 2** (Weeks 3-4): Testing Foundation
- Unit tests for builders
- Integration tests for CLI
- API endpoint tests

**Phase 3** (Weeks 5-6): Code Quality
- Rich CLI formatting
- Constants extraction
- Code organization (module split)
- Public API improvements

**Phase 4** (Weeks 7-8): Production Readiness
- Session management (Redis/DB)
- Temporary file cleanup
- Performance optimization
- API documentation enhancement

