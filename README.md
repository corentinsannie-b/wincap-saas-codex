# Wincap SaaS

Financial Due Diligence Report Automation Platform.

Transform French FEC (Fichier des Écritures Comptables) accounting files into professional DD reports with P&L, Balance Sheet, Cash Flow, KPIs, and QoE analysis.

## Architecture

```
wincap-saas/
├── apps/
│   ├── api/          # Python FastAPI backend
│   │   ├── src/      # Core processing engines
│   │   ├── api.py    # REST API endpoints
│   │   └── main.py   # CLI tool
│   └── web/          # React frontend
│       └── src/
│           ├── components/
│           └── modules/dd-report/
├── packages/
│   └── shared/       # Shared types/schemas
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/wincap/wincap-saas.git
cd wincap-saas

# Install frontend dependencies
cd apps/web && npm install && cd ../..

# Install backend dependencies
cd apps/api && pip install -e . && cd ../..

# Install root dependencies
npm install
```

### Development

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev:api    # Backend on http://localhost:8000
npm run dev:web    # Frontend on http://localhost:8080
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/upload` | POST | Upload FEC file(s) |
| `/api/process` | POST | Process FEC and generate reports |
| `/api/export/xlsx` | GET | Download Excel Databook |
| `/api/export/pdf` | GET | Download PDF Report |
| `/api/export/pptx` | GET | Download PowerPoint |

## Features

- **FEC Parsing**: Auto-detect encoding, delimiter, date formats
- **Multi-Year Analysis**: Compare up to 5 fiscal years
- **Financial Statements**: P&L, Balance Sheet, Cash Flow
- **KPI Dashboard**: EBITDA, DSO, DPO, DIO, margins
- **QoE Adjustments**: Quality of Earnings analysis
- **Export Formats**: XLSX, PDF, PPTX
- **Interactive Charts**: Waterfall, trends, concentration

## Tech Stack

- **Backend**: Python, FastAPI, Pandas, OpenPyXL, ReportLab
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts
- **Database**: PostgreSQL (planned)
- **Auth**: Supabase Auth (planned)

## License

Proprietary - Wincap Opérations
