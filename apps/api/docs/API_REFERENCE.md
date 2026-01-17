# Wincap API Reference

## Overview

The Wincap API provides RESTful endpoints for financial data processing and analysis. It handles FEC (Fichier des Écritures Comptables) file uploads, financial statement generation, and KPI calculations.

**Base URL:** `http://localhost:8000/api`

**Version:** 1.0.0

---

## Authentication

Currently, the API does not require authentication. This should be implemented for production deployments.

---

## File Upload Endpoints

### Upload FEC File

Upload a French FEC (accounting entries) file for processing.

**Endpoint:**
```
POST /upload
```

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (file, required): FEC file (`.txt`)
  - `vat_rate` (number, optional): VAT rate for calculations (default: 1.20)

**Response (201 Created):**
```json
{
  "session_id": "sess_abc123def456",
  "message": "File uploaded and processed successfully",
  "file_name": "fec_2024.txt",
  "entries_count": 1250,
  "encoding": "utf-8",
  "delimiter": "\t",
  "years_processed": [2024]
}
```

**Response (400 Bad Request):**
```json
{
  "detail": "Invalid file type: .xlsx"
}
```

**Response (413 Payload Too Large):**
```json
{
  "detail": "File too large: 75.5 MB (max 50.0 MB)"
}
```

**Errors:**
- `400`: Invalid file extension or file too small
- `413`: File exceeds maximum size limit
- `422`: Missing required fields

---

## Financial Data Endpoints

### Get Summary

Retrieve executive summary of processed financial data.

**Endpoint:**
```
GET /api/summary/{session_id}
```

**Parameters:**
- `session_id` (path, required): Session ID from file upload

**Response (200 OK):**
```json
{
  "session_id": "sess_abc123def456",
  "company_name": "Example Corp",
  "total_entries": 1250,
  "years_available": [2024],
  "latest_year": 2024,
  "latest_revenue": 500000.00,
  "latest_ebitda": 125000.00,
  "latest_margin": 25.0,
  "trends": {
    "revenue_cagr_pct": 12.5,
    "revenue_change_total_pct": 12.5,
    "margin_change_pts": 2.5
  },
  "file_processing_time_seconds": 2.35
}
```

**Response (404 Not Found):**
```json
{
  "detail": "Session not found: invalid_session_id"
}
```

**Errors:**
- `404`: Session does not exist or has expired

---

### Get P&L Statement

Retrieve Profit & Loss statement data.

**Endpoint:**
```
GET /api/pl/{session_id}
```

**Query Parameters:**
- `year` (optional): Filter by specific fiscal year

**Response (200 OK):**
```json
{
  "data": [
    {
      "year": 2024,
      "revenue": 500000.00,
      "purchases": 200000.00,
      "external_charges": 75000.00,
      "personnel_charges": 75000.00,
      "tax_and_duties": 5000.00,
      "depreciation": 10000.00,
      "financial_charges": 2000.00,
      "exceptional_charges": 0.00,
      "ebitda": 135000.00,
      "ebitda_margin_pct": 27.0,
      "ebit": 125000.00,
      "net_income": 85000.00,
      "net_margin_pct": 17.0
    },
    {
      "year": 2023,
      "revenue": 444000.00,
      "purchases": 177600.00,
      "external_charges": 66600.00,
      "personnel_charges": 66600.00,
      "tax_and_duties": 4440.00,
      "depreciation": 9000.00,
      "financial_charges": 1800.00,
      "exceptional_charges": 0.00,
      "ebitda": 118360.00,
      "ebitda_margin_pct": 26.67,
      "ebit": 109360.00,
      "net_income": 74804.40,
      "net_margin_pct": 16.85
    }
  ]
}
```

**Errors:**
- `404`: Session not found

---

### Get Balance Sheet

Retrieve Balance Sheet data.

**Endpoint:**
```
GET /api/balance/{session_id}
```

**Query Parameters:**
- `year` (optional): Filter by specific fiscal year

**Response (200 OK):**
```json
{
  "data": [
    {
      "year": 2024,
      "fixed_assets": 250000.00,
      "current_assets": 150000.00,
      "cash": 50000.00,
      "receivables": 80000.00,
      "inventory": 20000.00,
      "total_assets": 400000.00,
      "long_term_debt": 100000.00,
      "current_liabilities": 75000.00,
      "total_liabilities": 175000.00,
      "equity": 225000.00,
      "working_capital": 75000.00,
      "net_debt": 50000.00
    }
  ]
}
```

**Errors:**
- `404`: Session not found

---

### Get KPIs

Retrieve Key Performance Indicators.

**Endpoint:**
```
GET /api/kpis/{session_id}
```

**Query Parameters:**
- `year` (optional): Filter by specific fiscal year

**Response (200 OK):**
```json
{
  "data": [
    {
      "year": 2024,
      "dso": 58.24,
      "dpo": 68.96,
      "dio": 36.50,
      "cash_conversion_cycle": 25.78,
      "roe": 37.78,
      "roic": 28.30,
      "current_ratio": 2.0,
      "quick_ratio": 1.73,
      "debt_to_ebitda": 0.74,
      "interest_coverage": 62.50
    }
  ]
}
```

**Field Descriptions:**
- `dso`: Days Sales Outstanding (receivables collection period)
- `dpo`: Days Payable Outstanding (payment delay period)
- `dio`: Days Inventory Outstanding (inventory holding period)
- `cash_conversion_cycle`: Time to convert investments back to cash
- `roe`: Return on Equity (profit margin on shareholder capital)
- `roic`: Return on Invested Capital (efficiency of capital use)
- `current_ratio`: Short-term liquidity (current assets / current liabilities)
- `quick_ratio`: Immediate liquidity (excludes inventory)
- `debt_to_ebitda`: Leverage ratio (ability to pay debt)
- `interest_coverage`: Interest payment ability (EBIT / interest expense)

**Errors:**
- `404`: Session not found

---

## Account & Entry Endpoints

### Get Journal Entries

Retrieve journal entries with filtering.

**Endpoint:**
```
GET /api/entries/{session_id}
```

**Query Parameters:**
- `year` (optional): Filter by fiscal year
- `account_prefix` (optional): Filter by account code prefix (e.g., "4" for receivables)
- `min_amount` (optional): Minimum transaction amount
- `max_amount` (optional): Maximum transaction amount
- `label_contains` (optional): Filter by description text
- `limit` (optional): Maximum number of entries to return (default: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "total": 1250,
  "count": 100,
  "offset": 0,
  "data": [
    {
      "date": "2024-01-15",
      "journal_code": "VE",
      "account_number": "411",
      "account_label": "Clients",
      "description": "Invoice #2024-001",
      "debit": 5000.00,
      "credit": 0.00,
      "fiscal_year": 2024
    },
    {
      "date": "2024-01-16",
      "journal_code": "BA",
      "account_number": "512",
      "account_label": "Bank",
      "description": "Payment received",
      "debit": 0.00,
      "credit": 5000.00,
      "fiscal_year": 2024
    }
  ]
}
```

**Errors:**
- `404`: Session not found

---

### Get Accounts Distribution

Retrieve account class distribution and totals.

**Endpoint:**
```
GET /api/accounts/{session_id}
```

**Query Parameters:**
- `year` (optional): Filter by fiscal year

**Response (200 OK):**
```json
{
  "data": {
    "4": {
      "name": "Clients (Receivables)",
      "count": 450,
      "total": 120000.00,
      "entries": [...]
    },
    "401": {
      "name": "Fournisseurs (Payables)",
      "count": 380,
      "total": 85000.00,
      "entries": [...]
    },
    "7": {
      "name": "Produits (Revenue)",
      "count": 120,
      "total": 500000.00,
      "entries": [...]
    },
    "6": {
      "name": "Charges (Expenses)",
      "count": 680,
      "total": 375000.00,
      "entries": [...]
    }
  }
}
```

**Errors:**
- `404`: Session not found

---

## Download Endpoints

### Download Excel Report

Download comprehensive financial report in Excel format.

**Endpoint:**
```
GET /api/download/excel/{session_id}
```

**Response (200 OK):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Body: Excel file (XLSX format)

**Response (404 Not Found):**
```json
{
  "detail": "Session not found"
}
```

**Errors:**
- `404`: Session not found

---

### Download PDF Report

Download comprehensive financial report in PDF format.

**Endpoint:**
```
GET /api/download/pdf/{session_id}
```

**Response (200 OK):**
- Content-Type: `application/pdf`
- Body: PDF file

**Response (404 Not Found):**
```json
{
  "detail": "Session not found"
}
```

**Errors:**
- `404`: Session not found

---

## Error Handling

All error responses follow this format:

```json
{
  "detail": "Error description",
  "status": 400,
  "type": "ValidationError"
}
```

### Common HTTP Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request (validation error)
- `404 Not Found`: Resource not found (e.g., session expired)
- `413 Payload Too Large`: Uploaded file exceeds size limit
- `422 Unprocessable Entity`: Request entity cannot be processed
- `500 Internal Server Error`: Server error

---

## Rate Limiting

Currently, there are no rate limits implemented. Rate limiting should be added for production.

---

## CORS Headers

**Allowed Origins:**
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (React dev server)

**Allowed Methods:** GET, POST, OPTIONS

**Allowed Headers:** Content-Type, Authorization

---

## Example Usage

### 1. Upload File and Get Summary

```bash
# Step 1: Upload FEC file
curl -X POST http://localhost:8000/upload \
  -F "file=@fec_2024.txt" \
  -F "vat_rate=1.20" \
  > response.json

SESSION_ID=$(jq -r '.session_id' response.json)

# Step 2: Get summary
curl http://localhost:8000/api/summary/$SESSION_ID
```

### 2. Get All Financial Data

```bash
# Get P&L for all years
curl http://localhost:8000/api/pl/$SESSION_ID

# Get Balance Sheet for 2024
curl "http://localhost:8000/api/balance/$SESSION_ID?year=2024"

# Get KPIs
curl http://localhost:8000/api/kpis/$SESSION_ID
```

### 3. Filter Journal Entries

```bash
# Get all client (account 4xx) transactions
curl "http://localhost:8000/api/entries/$SESSION_ID?account_prefix=4&limit=50"

# Get large transactions
curl "http://localhost:8000/api/entries/$SESSION_ID?min_amount=10000"
```

### 4. Download Reports

```bash
# Download Excel
curl http://localhost:8000/api/download/excel/$SESSION_ID \
  -o Databook.xlsx

# Download PDF
curl http://localhost:8000/api/download/pdf/$SESSION_ID \
  -o Rapport_DD.pdf
```

---

## Session Management

### Session Lifecycle

1. **Upload** (creates session):
   - File is validated and parsed
   - Session ID is returned
   - Data is stored in temporary directory

2. **Active** (session valid):
   - Endpoints can be accessed
   - Data is available for analysis and export
   - Default TTL: 24 hours

3. **Expired** (session removed):
   - Session directory is automatically cleaned
   - Endpoints return 404
   - Resources are freed

### Cleanup

Expired sessions are automatically cleaned based on `SESSION_TTL_HOURS` setting. Manual cleanup is triggered on application exit.

---

## Configuration

API behavior is controlled by environment variables in `.env`:

```bash
# API
API_HOST=localhost
API_PORT=8000

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Files
MAX_FILE_SIZE=52428800  # 50 MB
ALLOWED_EXTENSIONS=.txt
UPLOAD_TEMP_DIR=/tmp/wincap

# Session
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_HOURS=6

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/api.log
```

---

## Performance

### Typical Response Times

- File upload (1 MB): < 1 second
- Summary retrieval: < 100 ms
- P&L calculation: < 200 ms
- Balance Sheet: < 150 ms
- KPIs: < 300 ms
- Excel export: 2-5 seconds
- PDF export: 5-10 seconds

### Optimization Tips

1. Use `year` filter to reduce data volume
2. Pagination on large entry lists
3. Cache summary results client-side
4. Compress large requests/responses

---

## Changelog

### Version 1.0.0
- Initial release
- File upload and validation
- Financial data endpoints
- Export functionality (Excel, PDF)
- Session management
- Error handling
