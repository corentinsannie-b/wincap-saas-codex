# Wincap MVP - Quick Start

**Get it running in 2 minutes**

---

## 1. Install Dependencies (once)

```bash
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex

npm install

cd apps/api && pip install -e . && cd ../..
```

---

## 2. Start Services

### Option A: Start Both (Recommended)
```bash
npm run dev
```

This starts both backend (port 8000) and frontend (port 8080) in parallel.

### Option B: Start Separately

**Terminal 1 - Backend:**
```bash
npm run dev:api
# Runs on http://localhost:8000
# OpenAPI docs: http://localhost:8000/docs
```

**Terminal 2 - Frontend:**
```bash
npm run dev:web
# Runs on http://localhost:8080
```

---

## 3. Test It

### Open Browser
```
http://localhost:8080
```

### Upload a File

Use any FEC file from:
```
/Users/amelielebon/Desktop/Cresus/Tests Wincap/
```

Example files:
- `INPUT-4118190FEC20221231.txt` (2022)
- `INPUT-4118190FEC20231231.txt` (2023)
- `INPUT-4118190FEC20241231.txt` (2024)

**Upload all 3 at once for multi-year analysis!**

### What Happens

1. **Upload Page** - Drag & drop file(s)
2. **Processing** - Spinner (30-60 seconds)
3. **Dashboard** - Metrics appear
4. **Downloads** - Excel + PDF buttons
5. **Chat** - Try asking questions

---

## 4. Quick Interactions

### Dashboard
- Scroll to see all metrics
- Note: Hotspots show if data has anomalies

### Chat Examples
```
Montre-moi le P&L 2024
Pourquoi l'EBITDA a baissé?
Quels sont les hotspots?
Analyse la trésorerie
```

---

## 5. Troubleshooting

### Port Already in Use?
```bash
# Find process using port 8000
lsof -i :8000
kill -9 <PID>

# Same for 8080
lsof -i :8080
kill -9 <PID>
```

### Backend Not Responding?
```bash
# Check it's running
curl http://localhost:8000/api/health

# If error, check Python
python3 -c "from src.parser.fec_parser import FECParser; print('✓ OK')"
```

### Chat Not Working?
```bash
# Set API key
export ANTHROPIC_API_KEY="your-key-here"

# Restart backend
npm run dev:api
```

---

## 6. Build for Production

```bash
npm run build
```

Creates optimized bundle in `apps/web/dist/`

---

## Files to Know

| What | Where |
|------|-------|
| **Upload page** | `apps/web/src/components/UploadInterface.tsx` |
| **Dashboard** | `apps/web/src/components/EnrichedDashboard.tsx` |
| **Chat** | `apps/web/src/components/ChatInterface.tsx` |
| **App state** | `apps/web/src/App.tsx` |
| **Backend API** | `apps/api/api.py` |
| **FEC Parser** | `apps/api/src/parser/fec_parser.py` |
| **Financial Engines** | `apps/api/src/engine/*.py` |
| **Agent Tools** | `apps/api/src/agent/tools.py` |

---

## Next Steps

1. **Test with real FEC files** ✅ (in Tests Wincap folder)
2. **Download exports** - Excel & PDF
3. **Chat with data** - Try the 8 agent tools
4. **Check console** - No errors?
5. **Read** `MVP_TESTING_CHECKLIST.md` for complete QA

---

## Key URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:8080 | Upload & Dashboard |
| Backend API | http://localhost:8000 | JSON endpoints |
| API Docs | http://localhost:8000/docs | Interactive Swagger UI |
| OpenAPI Schema | http://localhost:8000/openapi.json | Machine-readable API spec |

---

## Architecture

```
┌─────────────────────────┐
│   Frontend (React)      │
│  http://8080            │
│  - Upload               │
│  - Dashboard            │
│  - Chat                 │
└────────────┬────────────┘
             │ HTTP/JSON
             ↓
┌─────────────────────────┐
│  Backend (FastAPI)      │
│  http://8000            │
│  - FEC Parser           │
│  - Financial Engines    │
│  - Claude Integration   │
│  - Export Writers       │
└─────────────────────────┘
```

---

## Success Indicators

✅ Page loads at http://localhost:8080
✅ Can upload FEC file
✅ Dashboard appears after processing
✅ Can see metrics (Revenue, EBITDA, etc.)
✅ Can download Excel file
✅ Can download PDF file
✅ Chat button visible
✅ Can chat with Claude

---

**That's it! Enjoy 🚀**
