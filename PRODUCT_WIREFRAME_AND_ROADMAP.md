# Wincap SaaS - Product Wireframe & Roadmap

**Project:** Wincap - Financial Due Diligence Report Generator
**Version:** 1.0.0 (In Development)
**Status:** Phase 1-4 Complete, Implementation Phase Pending

---

## PRODUCT OVERVIEW

Wincap SaaS is a **financial intelligence platform** that transforms raw accounting data (French FEC files) into actionable financial insights through automated analysis, visualization, and reporting.

### Core Value Proposition
- **Input:** French FEC accounting files (CSV format)
- **Processing:** Automated parsing, classification, and financial analysis
- **Output:** Professional financial reports (Excel, PDF, Dashboard)
- **Use Case:** Due diligence, M&A analysis, financial audits, business intelligence

---

## CURRENT FUNCTIONALITY (What Works Today)

### ✅ Phase 1-4 Features Implemented

#### 1. FILE UPLOAD & PARSING
- [x] Upload FEC files (`.txt` format)
- [x] Auto-detect encoding (UTF-8, Latin-1, CP1252)
- [x] Auto-detect delimiter (tab, semicolon, pipe)
- [x] Validate file size (max 50MB)
- [x] Extract fiscal year from filename or file content
- [x] Parse 50k+ journal entries efficiently
- [x] Error tracking with detailed validation logs

#### 2. DATA PROCESSING & MAPPING
- [x] Parse journal entries (date, account, amount, description)
- [x] Map accounts to French PCG (General Chart of Accounts)
- [x] Classify accounts into 7 categories:
  - Assets (fixed, current, cash)
  - Liabilities (long-term, current)
  - Equity/Capital
  - Revenue
  - Expenses (cost of goods, operating, financial, exceptional)
  - Tax & duties
  - Depreciation

#### 3. FINANCIAL STATEMENT GENERATION
- [x] **Profit & Loss Statement**
  - Revenue, purchases, operating charges
  - EBITDA (with margin %)
  - EBIT, depreciation, financial charges
  - Net income (with margin %)
  - Multi-year comparison

- [x] **Balance Sheet**
  - Fixed assets, current assets, cash
  - Long-term debt, current liabilities
  - Equity, retained earnings
  - Working capital calculation
  - Net debt calculation

- [x] **Key Performance Indicators (KPIs)**
  - DSO (Days Sales Outstanding) - receivables collection period
  - DPO (Days Payable Outstanding) - payment delay
  - DIO (Days Inventory Outstanding) - inventory holding
  - Cash Conversion Cycle
  - ROE (Return on Equity)
  - ROIC (Return on Invested Capital)
  - Current Ratio & Quick Ratio
  - Debt-to-EBITDA ratio
  - Interest Coverage Ratio

#### 4. ANALYSIS & INSIGHTS
- [x] Year-over-year variance analysis
- [x] Trend detection (revenue CAGR, margin changes)
- [x] Anomaly detection (statistical outliers, round numbers)
- [x] Account distribution analysis
- [x] Trial balance validation

#### 5. EXPORT & REPORTING
- [x] **Excel Export** - Professional "Databook" with:
  - Multiple sheets (P&L, Balance, KPIs, Entries)
  - Formatted tables with styling
  - Charts and visualizations
  - Year-over-year comparisons

- [x] **PDF Export** - Formatted financial report with:
  - Executive summary
  - Key metrics dashboard
  - Detailed statements
  - Analysis and insights

#### 6. USER INTERFACES

**CLI (Command Line)**
- [x] `wincap generate` - Full report generation
- [x] `wincap analyze` - Quick financial analysis
- [x] `wincap accounts` - Account distribution view
- [x] Rich console output with colors and tables
- [x] Progress indicators for long operations
- [x] Comprehensive error messages

**REST API**
- [x] `POST /upload` - File upload endpoint
- [x] `GET /api/summary/{session_id}` - Executive summary
- [x] `GET /api/pl/{session_id}` - P&L statement
- [x] `GET /api/balance/{session_id}` - Balance sheet
- [x] `GET /api/kpis/{session_id}` - Key metrics
- [x] `GET /api/entries/{session_id}` - Journal entries
- [x] `GET /api/accounts/{session_id}` - Account distribution
- [x] `GET /api/download/excel/{session_id}` - Download Excel
- [x] `GET /api/download/pdf/{session_id}` - Download PDF

#### 7. INFRASTRUCTURE
- [x] Configuration management (environment-based)
- [x] Logging system (console + file)
- [x] Exception handling (custom exception hierarchy)
- [x] Input validation (file, amount, account codes)
- [x] Session management (temporary storage)
- [x] Automatic cleanup (session TTL, exit handlers)
- [x] CORS security (no wildcard origins)

#### 8. TESTING & QUALITY
- [x] 85+ unit and integration tests
- [x] Test fixtures and mocking
- [x] Pytest configuration with markers
- [x] Code linting (Ruff configuration)
- [x] Type checking setup (MyPy configuration)
- [x] Makefile for development commands

#### 9. DOCUMENTATION
- [x] API Reference (600+ lines)
- [x] Development Guide (400+ lines)
- [x] Deployment Guide (500+ lines)
- [x] Project Summary (800+ lines)
- [x] Inline code documentation

---

## DETAILED WIREFRAMES

### 1. CLI APPLICATION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                         WINCAP CLI                              │
└─────────────────────────────────────────────────────────────────┘

                          wincap --help
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌─────▼──────┐  ┌────▼──────┐  ┌──▼──────────┐
         │  GENERATE  │  │  ANALYZE  │  │  ACCOUNTS   │
         └─────┬──────┘  └────┬──────┘  └──┬──────────┘
               │              │            │
    ┌──────────▼──────────┐   │            │
    │ Select FEC File(s)  │   │            │
    └──────────┬──────────┘   │            │
               │              │            │
    ┌──────────▼──────────────────────────────────────┐
    │   PARSING & PROCESSING                          │
    │  ✓ Detect encoding & delimiter                  │
    │  ✓ Parse journal entries                        │
    │  ✓ Map to accounting categories                 │
    │  ✓ Validate trial balance                       │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │   ANALYSIS ENGINE                               │
    │  ├─ Financial Statement Builder (P&L)           │
    │  ├─ Balance Sheet Builder                       │
    │  ├─ KPI Calculator                             │
    │  ├─ Variance Analyzer                          │
    │  └─ Anomaly Detector                           │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │   EXPORT & OUTPUT                               │
    │  ├─ Excel Databook (xlsx)                       │
    │  ├─ PDF Report (pdf)                           │
    │  └─ Console Display (Rich formatting)           │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │   ✓ COMPLETE!                                   │
    │  Files saved to output directory                │
    └──────────────────────────────────────────────────┘
```

### 2. REST API ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                        │
│  (React Web App, Mobile App, Third-party integrations)           │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   FASTAPI APPLICATION   │
                    │        (api.py)         │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼──────┐  ┌──────▼──────┐  ┌────▼────────┐
        │   UPLOAD     │  │   RETRIEVAL │  │   EXPORT    │
        │   ENDPOINTS  │  │   ENDPOINTS │  │  ENDPOINTS  │
        └───────┬──────┘  └──────┬──────┘  └────┬────────┘
                │                │              │
        ┌───────▼──────────────┐ │              │
        │ POST /upload         │ │              │
        │ - File validation    │ │              │
        │ - Parsing            │ │              │
        │ - Session creation   │ │              │
        └───────┬──────────────┘ │              │
                │                │              │
                │    ┌───────────▼──────────┐   │
                │    │ IN-MEMORY SESSION    │   │
                │    │ {session_id: data}   │   │
                │    └───────────┬──────────┘   │
                │                │              │
        ┌───────▼──────────┐ ┌───▼──────────┐ ┌▼──────────────┐
        │ GET /api/summary │ │ GET /api/pl  │ │GET /download/ │
        │ GET /api/balance │ │ GET /api/kpi │ │excel/{id}     │
        │ GET /api/kpis    │ │ GET /api/    │ │GET /download/ │
        │ GET /api/entries │ │ entries/{id} │ │pdf/{id}       │
        │ GET /api/accounts│ │              │ │               │
        └────────┬─────────┘ └────┬─────────┘ └┬──────────────┘
                 │                │            │
                 └────────────────┼────────────┘
                                  │
                    ┌─────────────▼──────────┐
                    │   JSON RESPONSE        │
                    │ (P&L, Balance, KPIs,   │
                    │  Entries, Downloads)   │
                    └───────────────────────┘
```

### 3. DATA PROCESSING PIPELINE

```
FEC FILE (.txt)
      │
      ▼
┌─────────────────────────┐
│  ENCODING DETECTION     │  Tries: UTF-8, Latin-1, CP1252, ISO-8859-1, GB2312
│  DELIMITER DETECTION    │  Tries: \t, ;, |, , (comma)
│  YEAR EXTRACTION        │  From filename or file content
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  FEC PARSER             │  Reads CSV into memory
│  Journal Entry Creation │  Creates 50k-200k entries
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  ACCOUNT MAPPER         │  Maps to French PCG categories
│  Classification         │  7 main classes + subclasses
└────────────┬────────────┘
             │
             ├──────────────────────────────────┐
             │                                  │
             ▼                                  ▼
    ┌──────────────────┐           ┌──────────────────┐
    │   BUILDERS       │           │   ANALYZERS      │
    ├──────────────────┤           ├──────────────────┤
    │ PLBuilder        │           │ VarianceBuilder  │
    │  ├─ Revenue      │           │  ├─ YoY changes  │
    │  ├─ EBITDA       │           │  ├─ CAGR         │
    │  ├─ EBIT         │           │  └─ Margins      │
    │  └─ Net Income   │           │                  │
    │                  │           │ AnomalyDetector  │
    │ BalanceBuilder   │           │  ├─ Outliers    │
    │  ├─ Assets       │           │  ├─ Round #s    │
    │  ├─ Liabilities  │           │  └─ Z-scores    │
    │  └─ Equity       │           │                  │
    │                  │           │ MetricsExtractor │
    │ KPIBuilder       │           │  ├─ DSO/DPO/DIO │
    │  ├─ Efficiency   │           │  ├─ Ratios      │
    │  ├─ Liquidity    │           │  └─ Trends      │
    │  └─ Leverage     │           │                  │
    └──────────────────┘           └──────────────────┘
             │                                 │
             └────────────┬────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │  EXPORT GENERATION          │
            ├─────────────────────────────┤
            │ ExcelWriter                 │
            │  ├─ Sheets: P&L, Balance    │
            │  ├─ Charts & formatting     │
            │  └─ Multi-year compare      │
            │                             │
            │ PDFWriter                   │
            │  ├─ Executive summary       │
            │  ├─ Formatted statements    │
            │  └─ Analysis insights       │
            └────────────┬────────────────┘
                         │
                         ▼
            ┌─────────────────────────────┐
            │  OUTPUT                     │
            ├─────────────────────────────┤
            │ 📊 Databook.xlsx            │
            │ 📄 Rapport_DD.pdf           │
            │ 📋 JSON Data                │
            └─────────────────────────────┘
```

### 4. WEB UI WIREFRAME (Future - Phase 5)

```
┌────────────────────────────────────────────────────────────────────────┐
│  WINCAP DASHBOARD                                      🏠 About Account │
├────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  UPLOAD SECTION                                                  │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  [Drag & Drop or Click to Upload FEC File]                       │  │
│  │  📁 Select File (.txt) [50MB max]                                │  │
│  │                                                                   │  │
│  │  Optional Settings:                                              │  │
│  │  VAT Rate: [1.20] ▼  Period: [2024] ▼  [PROCESS]                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  RECENT ANALYSES                                                 │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  📊 Company A - FY2024      [Processing...] 45% Complete        │  │
│  │  📊 Company B - FY2023      ✓ Complete  [View Report] [↓ Export] │  │
│  │  📊 Company C - FY2022      ✓ Complete  [View Report] [↓ Export] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  DEAL PAGE (After Upload)                                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Deal Analysis             [📄 Excel Download] [📕 PDF Download]      │
│  1,250 écritures • 2024                                               │
│                                                                          │
│  ┌──────┬────────┬────────┬────────┬───────────┐                      │
│  │ 📊   │ 📈 P&L │ 💰 Bilan│ 📋 Entries│⚠️ Anomalies│                │
│  └──────┴────────┴────────┴────────┴───────────┘                      │
│                                                                          │
│  SYNTHÈSE Tab Active:                                                  │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  KEY METRICS                                                    │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ CA            │  │ EBITDA       │  │ Marge EBITDA │         │   │
│  │  │ 500 k€        │  │ 125 k€       │  │ 25.0%        │         │   │
│  │  │ 🔍 trace     │  │ 🔍 trace     │  │ 🔍 trace     │         │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ BFR          │  │ DSO (jours)  │  │ DPO (jours)  │         │   │
│  │  │ 75 k€        │  │ 58 jours     │  │ 69 jours     │         │   │
│  │  │ 🔍 trace     │  │ 🔍 trace     │  │ 🔍 trace     │         │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │                                                                 │   │
│  │  TRENDS                                                         │   │
│  │  CAGR CA: +12.5%  |  Evol CA totale: +12.5%  |  Δ Marge: +2.5  │   │
│  │                                                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  P&L Tab:                                                              │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                         FY2024    FY2023    Change             │   │
│  │  Chiffre d'affaires     500 k€    444 k€    +12.6%  🔍        │   │
│  │  Production              50 k€     50 k€     0.0%   🔍        │   │
│  │  Achats               (200 k€)  (177 k€)    +12.9%  🔍        │   │
│  │  Charges externes      (75 k€)   (66 k€)    +13.6%  🔍        │   │
│  │  Personnel             (75 k€)   (66 k€)    +13.6%  🔍        │   │
│  │  ─────────────────────────────────────────────                │   │
│  │  EBITDA                135 k€    118 k€    +14.4%  🔍        │   │
│  │  Marge EBITDA           27.0%    26.7%    +0.3pts 🔍        │   │
│  │  Amortissements        (10 k€)    (9 k€)    +11.1% 🔍        │   │
│  │  ─────────────────────────────────────────────                │   │
│  │  EBIT                  125 k€    109 k€    +14.6%  🔍        │   │
│  │  Résultat Net           85 k€     75 k€    +13.3%  🔍        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  TRACE MODAL (When clicking on P&L line items)                         │
├────────────────────────────────────────────────────────────────────────┤
│  Trace: revenue (FY2024)                                  [X]         │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ 1,250 écritures                                                 │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ Date      │ Compte │ Libellé         │ Débit    │ Crédit       │  │
│  ├───────────┼────────┼─────────────────┼──────────┼──────────────┤  │
│  │ 2024-01-15│ 701    │ Sales Invoice   │ 5000.00  │              │  │
│  │ 2024-01-20│ 411    │ Payment Received│          │ 5000.00      │  │
│  │ 2024-02-10│ 701    │ Services        │ 3500.00  │              │  │
│  │ ... (scroll for more)                                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### 5. CHAT INTERFACE (Future - Phase 7)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ASSISTANT                                                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Bonjour ! Je suis prêt à analyser les données de ce deal.             │
│  Posez-moi vos questions sur la performance financière.                │
│                                                                          │
│  💬 QUICK QUESTIONS:                                                    │
│  [Pourquoi l'EBITDA a baissé ?] [Quelles anomalies ?] [Explique BFR]  │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  USER: Pourquoi l'EBITDA a baissé de 10% ?                             │
│                                                                          │
│  ASSISTANT: L'EBITDA a baissé de 10% (FY2024 vs FY2023) principalement │
│  à cause de :                                                           │
│  1. Augmentation des charges de personnel (+15%) sans croissance        │
│     proportionnelle du CA (+12%)                                        │
│  2. Augmentation des charges externes (+13%) liée aux coûts énergétiques│
│  3. Érosion de marge brute (-1.2pts) sur les ventes                     │
│                                                                          │
│  Recommandation : Optimiser structure de coûts                         │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  [Type your question...] [Send ➤]                                       │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## FEATURE BREAKDOWN - DETAILED

### Current Features (Implemented ✅)

#### Financial Statement Generation
| Statement | Features | Status |
|-----------|----------|--------|
| **P&L** | Revenue, costs, EBITDA, EBIT, net income | ✅ Complete |
| **P&L** | Margins %, multi-year comparison | ✅ Complete |
| **Balance** | Assets, liabilities, equity | ✅ Complete |
| **Balance** | Working capital, net debt | ✅ Complete |
| **KPIs** | DSO, DPO, DIO, CCC | ✅ Complete |
| **KPIs** | ROE, ROIC, ratios | ✅ Complete |

#### Analysis & Insights
| Feature | Details | Status |
|---------|---------|--------|
| Variance Analysis | YoY changes, CAGR, trends | ✅ Complete |
| Anomaly Detection | Statistical outliers, round numbers | ✅ Complete |
| Account Distribution | By class and subclass | ✅ Complete |
| Trial Balance | Validation of journal entries | ✅ Complete |

#### Export Formats
| Format | Features | Status |
|--------|----------|--------|
| Excel | Multiple sheets, charts, formatting | ✅ Complete |
| PDF | Formatted report with summary | ✅ Complete |
| JSON | API response format | ✅ Complete |

#### User Interfaces
| Interface | Status | Coverage |
|-----------|--------|----------|
| CLI | ✅ Complete | 3 commands (generate, analyze, accounts) |
| REST API | ✅ Complete | 8+ endpoints |
| Web Dashboard | ❌ Not Started | Planned Phase 5 |

---

## PRODUCT ROADMAP TO FULL COMPLETION

### Phase 5: Authentication & Security (Weeks 1-2)
**Status:** NOT STARTED | **Priority:** CRITICAL | **Effort:** 2 weeks

**Goals:**
- [ ] Implement JWT authentication
- [ ] Add role-based access control
- [ ] Add rate limiting (100 requests/min per user)
- [ ] Implement audit logging

**Deliverables:**
```python
# New: src/auth/jwt_handler.py
# New: src/auth/permissions.py
# Modified: api.py (add auth middleware)
# Modified: config/settings.py (JWT secrets)
```

**Features:**
- ✅ User registration/login
- ✅ JWT token generation (30 min expiry)
- ✅ Token refresh mechanism
- ✅ Role-based endpoints (admin, user, viewer)
- ✅ Audit trail for all actions

**Tests:**
- Unit tests for JWT generation/validation
- Integration tests for protected endpoints
- Performance tests for token validation

---

### Phase 5: Database & Session Persistence (Weeks 3-4)
**Status:** NOT STARTED | **Priority:** CRITICAL | **Effort:** 2 weeks

**Goals:**
- [ ] Migrate from in-memory to PostgreSQL
- [ ] Implement Redis for caching
- [ ] Add session persistence
- [ ] Implement data retention policies

**Database Schema:**
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    roles TEXT[] DEFAULT ['user'],
    created_at TIMESTAMP,
    last_login TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    file_name VARCHAR,
    company_name VARCHAR,
    status ENUM ('uploading', 'processing', 'complete', 'error'),
    entries_count INT,
    years_processed INT[],
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    report_type ENUM ('excel', 'pdf', 'json'),
    file_path VARCHAR,
    generated_at TIMESTAMP,
    file_size INT
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR,
    resource_id UUID,
    timestamp TIMESTAMP,
    ip_address VARCHAR,
    details JSONB
);
```

**Deliverables:**
- Database schema with migrations
- ORM models (SQLAlchemy)
- Repository pattern for data access
- Connection pooling configuration

---

### Phase 6: React Web Dashboard (Weeks 5-8)
**Status:** NOT STARTED | **Priority:** HIGH | **Effort:** 4 weeks

**Technology Stack:**
- React 18 + TypeScript
- Vite (fast build)
- TailwindCSS (styling)
- Recharts (visualizations)
- React Query (data fetching)

**Pages & Components:**

#### 1. Landing Page
```
┌─────────────────────────────────┐
│ Wincap Logo                 [LOGIN]
├─────────────────────────────────┤
│                                 │
│  Financial Due Diligence        │
│  Report Generator               │
│                                 │
│  [Get Started] [Learn More]     │
│                                 │
│  Features:                      │
│  ✓ Fast FEC parsing             │
│  ✓ Professional reports         │
│  ✓ Real-time analysis           │
│                                 │
└─────────────────────────────────┘
```

#### 2. Dashboard Page
- Recent uploads/analyses
- Quick stats (total companies, reports generated)
- Action buttons (New Upload, View Reports)

#### 3. Upload Page
```
┌──────────────────────────────────┐
│ Upload FEC File                  │
├──────────────────────────────────┤
│ [Drag & Drop FEC File Here]      │
│ or [Browse Files]                │
│                                  │
│ Company Name: [_____________]    │
│ VAT Rate: [1.20]                 │
│ Period: [2024] ▼                 │
│                                  │
│ [UPLOAD & PROCESS] (disabled)    │
└──────────────────────────────────┘
```

#### 4. Deal Page (Main Analysis View)
```
┌──────────────────────────────────┐
│ Deal Analysis                    │
│ Tabs: Summary | P&L | Balance    │
│       | Entries | Anomalies      │
├──────────────────────────────────┤
│                                  │
│ KEY METRICS (Clickable for trace)│
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│ │ CA │ │EBIT│ │ ROE│ │DSO │    │
│ │500k│ │125k│ │22% │ │ 58d│    │
│ └────┘ └────┘ └────┘ └────┘    │
│                                  │
│ P&L TABLE (Year-over-year)       │
│ ─────────────────────────────────  │
│ Metric        │ 2024   │ 2023   │
│ Revenue       │ 500k€  │ 444k€  │
│ EBITDA        │ 125k€  │ 118k€  │
│ ...                              │
│                                  │
└──────────────────────────────────┘
```

#### 5. Trace Modal
```
┌──────────────────────────────────┐
│ Trace: Revenue (FY2024)      [X] │
├──────────────────────────────────┤
│ 1,250 entries found              │
│ ─────────────────────────────────  │
│ Date  │ Account │ Amount   │ Type│
│ ...   │ ...     │ ...      │ ... │
│ ─────────────────────────────────  │
│ [Export CSV] [Copy]              │
└──────────────────────────────────┘
```

#### 6. Reports Download Page
```
┌──────────────────────────────────┐
│ Generated Reports                │
├──────────────────────────────────┤
│ ✓ Databook_20240117.xlsx [↓]    │
│ ✓ Rapport_DD_20240117.pdf [↓]   │
│ ✓ dashboard_data.json [↓]       │
│                                  │
│ [Export All as ZIP]              │
└──────────────────────────────────┘
```

**Component Library:**
- KPICard: Display single metric with trend
- PLTable: Formatted P&L statement
- BalanceTable: Formatted balance sheet
- EntriesTable: Filterable journal entries
- ChartComponent: Render charts (revenue trend, cost breakdown)
- TraceModal: Show journal entries behind metric
- FileUpload: Drag-and-drop file input
- ProgressBar: Upload/processing progress

**Features to Build:**
- [x] User authentication (login/register)
- [x] Upload page with drag-and-drop
- [x] Deal page with tabs and metrics
- [x] Click-to-trace functionality
- [x] Report downloads
- [x] Export to Excel/PDF from dashboard
- [x] Search and filter entries
- [x] Year-over-year comparison view

---

### Phase 7: Chat & AI Assistant (Weeks 9-10)
**Status:** NOT STARTED | **Priority:** HIGH | **Effort:** 2 weeks

**Technology:**
- Anthropic Claude API
- Tool calling for data queries
- React Chat component

**Agent Tools (8 total):**
```python
# src/agent/tools.py
tools = [
    {
        "name": "get_pl",
        "description": "Get P&L statement for year",
        "params": ["year (optional)"]
    },
    {
        "name": "get_balance",
        "description": "Get balance sheet",
        "params": ["year"]
    },
    {
        "name": "get_kpis",
        "description": "Get KPIs and metrics",
        "params": ["year"]
    },
    {
        "name": "explain_variance",
        "description": "Explain metric changes YoY",
        "params": ["metric", "year_from", "year_to"]
    },
    {
        "name": "find_anomalies",
        "description": "Find suspicious transactions",
        "params": ["year (optional)"]
    },
    {
        "name": "get_entries",
        "description": "Get filtered journal entries",
        "params": ["filters"]
    },
    {
        "name": "get_summary",
        "description": "Get executive summary",
        "params": []
    },
    {
        "name": "trace_metric",
        "description": "Show entries behind metric",
        "params": ["metric", "year"]
    }
]
```

**Chat Examples:**
```
USER: "Why did EBITDA drop 10%?"
CLAUDE: [Calls explain_variance("ebitda", 2024, 2023)]
RESPONSE: "EBITDA dropped due to 15% increase in personnel costs..."

USER: "Show me large transactions"
CLAUDE: [Calls find_anomalies(2024)]
RESPONSE: "Found 5 outliers with Z-scores > 3:..."

USER: "What are the top revenue accounts?"
CLAUDE: [Calls get_entries(filters), analyzes]
RESPONSE: "Account 701 (sales): 450k€, Account 702 (services): 50k€..."
```

---

### Phase 8: Advanced Analytics (Weeks 11-14)
**Status:** NOT STARTED | **Priority:** MEDIUM | **Effort:** 4 weeks

**Features:**

#### 8.1 Forecasting
- Time series forecasting (12-month revenue forecast)
- Seasonal decomposition
- Confidence intervals

#### 8.2 Benchmarking
- Industry comparison (if database of benchmarks available)
- Best practice metrics
- Peer company comparison

#### 8.3 Scenario Analysis
- What-if analysis: "If revenue grows 10%, what happens to..."
- Sensitivity analysis: Impact of cost changes
- Break-even analysis

#### 8.4 Custom Reports
- Template builder for custom reports
- Save/load report templates
- Scheduled report generation (email delivery)

#### 8.5 Data Quality Reporting
```
Data Quality Score: 98%

Issues Found:
- 3 unmatched accounts (0.2%)
- 0 trial balance errors
- 1 round number suspicious (0.08%)
- 5 large outliers detected (0.4%)

Recommendations:
✓ Data quality is excellent
✓ Ready for analysis
```

---

### Phase 9: Multi-Language & Localization (Weeks 15-16)
**Status:** NOT STARTED | **Priority:** MEDIUM | **Effort:** 2 weeks

**Languages to Support:**
- [x] French (default) - Fully French UI & accounting terms
- [x] English - Full English translation
- [x] Spanish - Spanish accounting standards (future)
- [x] German - German accounting standards (future)

**Translation Key Areas:**
- UI labels and buttons
- Report templates
- Error messages
- Financial statement names (Bilan, Compte de résultat, etc.)
- Account class names (French PCG specific)

**Implementation:**
```javascript
// i18n configuration
import i18n from 'i18next';

i18n.init({
  lng: 'fr',
  resources: {
    fr: { translation: {...} },
    en: { translation: {...} }
  }
});
```

---

### Phase 10: Mobile App (Weeks 17-20)
**Status:** NOT STARTED | **Priority:** LOW | **Effort:** 4 weeks

**Technology:**
- React Native or Flutter
- Offline capability
- Mobile-optimized UI

**Core Features:**
- View recent reports
- Quick metrics dashboard
- Download files
- Search entries
- Chat with assistant

---

### Phase 11: Integration & Automation (Weeks 21-22)
**Status:** NOT STARTED | **Priority:** MEDIUM | **Effort:** 2 weeks

**Integrations:**
- [x] Google Drive / OneDrive - Upload FEC files
- [x] Email - Scheduled report delivery
- [x] Zapier / Make - Workflow automation
- [x] Slack - Notifications for analysis complete
- [x] Power BI / Tableau - Direct data connection

**Webhooks:**
```python
# api.py - Webhook support
@app.post("/webhooks/analysis-complete")
async def webhook_analysis_complete(payload: dict):
    """Called when analysis completes"""
    # Send Slack notification
    # Email report to stakeholders
    # Update CRM
    pass
```

---

### Phase 12: Enterprise Features (Weeks 23-24)
**Status:** NOT STARTED | **Priority:** MEDIUM | **Effort:** 2 weeks

**Features:**
- [x] Team collaboration (share reports, comments)
- [x] Permission levels (admin, analyst, viewer)
- [x] Bulk upload/processing
- [x] API keys for programmatic access
- [x] White-labeling (custom branding)
- [x] Custom domain (https://company.wincap.io)

---

## TIMELINE VISUALIZATION

```
Phase 1-4: Complete ✅ (Already done)
├─ Security & Config
├─ CLI Enhancement
├─ Testing Infrastructure
└─ Code Quality & Documentation

Phase 5: Auth & Database ⏳ (Weeks 1-4) [2-3 weeks remaining]
├─ JWT Authentication
├─ PostgreSQL Migration
├─ Redis Caching
└─ Audit Logging

Phase 6: React Dashboard ⏳ (Weeks 5-8)
├─ Upload Page
├─ Deal Analysis Page
├─ Reports Dashboard
└─ Trace Modal

Phase 7: AI Assistant ⏳ (Weeks 9-10)
├─ Chat Component
├─ 8 Agent Tools
├─ Claude Integration
└─ Tool Calling

Phase 8: Advanced Analytics ⏳ (Weeks 11-14)
├─ Forecasting
├─ Benchmarking
├─ Scenario Analysis
└─ Custom Reports

Phase 9: Localization ⏳ (Weeks 15-16)
├─ French (Completed)
├─ English
├─ Spanish
└─ German

Phase 10: Mobile App ⏳ (Weeks 17-20)
├─ React Native/Flutter
├─ Offline Support
└─ Mobile UI

Phase 11: Integrations ⏳ (Weeks 21-22)
├─ Cloud Storage
├─ Email/Webhooks
├─ Zapier/Make
└─ BI Tools

Phase 12: Enterprise ⏳ (Weeks 23-24)
├─ Team Collaboration
├─ White-labeling
├─ API Keys
└─ Custom Domain

Total Timeline: ~6 months for full MVP
```

---

## FEATURE PRIORITY MATRIX

### Must Have (MVP - Phase 5-7)
- [x] Authentication & Authorization
- [x] Persistent database storage
- [x] Web dashboard UI
- [x] File upload with progress
- [x] Financial statements (P&L, Balance)
- [x] KPI metrics dashboard
- [x] Report downloads (Excel, PDF)
- [x] Trace functionality
- [x] Basic AI assistant

### Should Have (Phase 8-9)
- [ ] Advanced analytics (forecasting, benchmarking)
- [ ] Scenario analysis
- [ ] Multi-language support
- [ ] Email report delivery
- [ ] Custom report templates
- [ ] Data quality scoring

### Nice to Have (Phase 10-12)
- [ ] Mobile app
- [ ] Team collaboration features
- [ ] Third-party integrations
- [ ] White-labeling
- [ ] Enterprise SSO
- [ ] Advanced API access

---

## SUCCESS METRICS

### Phase-by-Phase Goals

**Phase 5 (Auth):**
- ✓ 0 unauthorized access incidents
- ✓ 100% of API endpoints require authentication
- ✓ Average token validation < 10ms

**Phase 6 (Dashboard):**
- ✓ 95%+ file upload success rate
- ✓ Dashboard loads in < 2 seconds
- ✓ Trace modal shows results in < 500ms

**Phase 7 (AI):**
- ✓ Chat response time < 2 seconds
- ✓ Tool call accuracy > 95%
- ✓ User satisfaction > 4.5/5

**Overall Success:**
- ✓ User onboarding < 5 minutes
- ✓ Report generation < 30 seconds
- ✓ 99% uptime SLA
- ✓ 10,000+ reports generated per month
- ✓ Customer retention > 90%

---

## BUDGET & RESOURCE ESTIMATION

### Development Team
- Backend Engineers: 2 (Python/FastAPI)
- Frontend Engineers: 2 (React/TypeScript)
- DevOps/Infrastructure: 1
- QA/Testing: 1
- Project Manager: 1

### Total Effort
- **Phase 5-7 (MVP):** 12 weeks
- **Phase 8-9 (Enhancement):** 8 weeks
- **Phase 10-12 (Advanced):** 10 weeks
- **Total:** ~30 weeks (~7 months)

### Estimated Costs
- Development: €200k-300k
- Infrastructure/Hosting: €2k-5k/month
- Third-party services (AI, storage): €1k-3k/month

---

## CONCLUSION

Wincap SaaS is a well-architected financial analysis platform with clear potential for enterprise adoption. The current Phase 1-4 foundation is solid, and the planned roadmap to full completion is aggressive but achievable within 6-7 months with a focused team.

**Next Steps:**
1. ✅ Complete critical fixes from audit
2. ⏳ Implement Phase 5 (Authentication & Database)
3. ⏳ Build Phase 6 (React Dashboard)
4. ⏳ Add Phase 7 (AI Assistant)

The platform will achieve MVP status after Phase 7, ready for beta launch and enterprise customer acquisition.
