# MVP Testing Checklist

## Pre-Flight Checks

### Backend
- [ ] Python 3.10+: `python3 --version`
- [ ] Dependencies: `cd apps/api && pip install -e .`
- [ ] API starts: `cd apps/api && uvicorn api:app --reload --port 8000`
- [ ] OpenAPI available: http://localhost:8000/docs

### Frontend
- [ ] Node 18+: `node --version`
- [ ] Dependencies: `npm install` (from root)
- [ ] Build succeeds: `npm run build`
- [ ] Web starts: `cd apps/web && npm run dev` → http://localhost:8080

---

## Full E2E Flow Test

### Step 1: Start Both Services

```bash
# Terminal 1: Start Backend
cd apps/api
uvicorn api:app --reload --port 8000

# Terminal 2: Start Frontend
cd apps/web
npm run dev
```

Expected:
- Backend: http://localhost:8000 (OpenAPI at /docs)
- Frontend: http://localhost:8080 (Upload page)

### Step 2: Test Upload Interface

**In browser: http://localhost:8080**

- [ ] Page loads (Wincap logo, upload zone)
- [ ] Drag & drop file → shows filename
- [ ] Click file input → can select file
- [ ] Invalid file format → error message
- [ ] Upload button disabled until file selected
- [ ] Click "Upload & Process" → shows loading

Expected:
- Spinner appears
- "Processing FEC File..." screen shows
- Takes 30-60 seconds

### Step 3: Test Dashboard

After processing completes, should see:

- [ ] **Header**: Company name, year, session ID
- [ ] **Key Metrics** (6 cards):
  - Revenue (green)
  - EBITDA (blue) with margin%
  - Net Income (indigo)
  - Equity (purple)
  - Working Capital (orange)
  - Total Assets (gray)

- [ ] **Working Capital Metrics** (3 cards):
  - DSO (days)
  - DPO (days)
  - DIO (days)

- [ ] **Data Quality**:
  - ✓ Entries parsed
  - ✓ Years available
  - ✓ Validation passed

- [ ] **Hotspots** (if anomalies found):
  - Up to 5 hotspots listed
  - Account code shown
  - Amount shown
  - Status badge (HIGH/MEDIUM)

- [ ] **Download Buttons**:
  - "Download Databook (Excel)" → clicking works
  - "Download Report (PDF)" → clicking works
  - Files download with correct names

- [ ] **Chat Button**: "💬 Start Chat Analysis" visible

### Step 4: Test Downloads

- [ ] **Excel File**:
  - Name: `{CompanyName}_Databook.xlsx`
  - Can open in Excel/Numbers
  - Contains expected sheets
  - Numbers match dashboard

- [ ] **PDF File**:
  - Name: `{CompanyName}_Report.pdf`
  - Can open in PDF viewer
  - Contains financial statements
  - Professional formatting

### Step 5: Test Chat Interface

Click "Start Chat Analysis"

- [ ] Chat interface loads
- [ ] Header shows "Financial Analysis Chat"
- [ ] Previous messages visible
- [ ] Input field focused
- [ ] Suggested questions visible (clickable)

**Send a message** (e.g., "Montre-moi le P&L 2024")

- [ ] "Claude is thinking..." spinner appears
- [ ] Response appears after ~10 seconds
- [ ] Response is in French
- [ ] Multiple messages can be sent

Suggested test messages:
```
1. "Montre-moi le P&L 2024"
2. "Pourquoi l'EBITDA a baissé?"
3. "Quels sont les hotspots?"
4. "Analyse la trésorerie nette"
```

- [ ] Each response is relevant
- [ ] Chat history preserved
- [ ] Can scroll up to see previous messages

### Step 6: Test Navigation

- [ ] Click back arrow from chat → returns to dashboard
- [ ] From dashboard, click chat button → returns to chat
- [ ] All state preserved (no re-fetching data)

### Step 7: Error Handling

**Test error scenarios:**

- [ ] Invalid file format → error message, can select new file
- [ ] API not running → clear error, can try again
- [ ] Failed download → error toast, can retry
- [ ] Chat API error → error message in chat

---

## Bundle & Performance

- [ ] Build size < 200KB (uncompressed)
- [ ] Gzip size < 60KB
- [ ] Load time < 3 seconds
- [ ] Chat response < 20 seconds

Current:
```
dist/index.html         0.52 kB
dist/assets/*.css      70.50 kB (gzip: 12.26 kB)
dist/assets/*.js      165.08 kB (gzip: 51.63 kB)
Total gzip: ~64 kB ✅
```

---

## Exported Exports

### Files Generated Should Match

**Excel (Databook):**
- [ ] P&L statement (all years)
- [ ] Balance sheet (all years)
- [ ] Cash flow (all years)
- [ ] KPIs
- [ ] Compare to reference: `/Users/amelielebon/Desktop/Cresus/Tests Wincap/Output - Occitanie Rayonnage - Databook.xlsx`

**PDF (Report):**
- [ ] Professional cover page
- [ ] Financial statements
- [ ] KPI dashboard
- [ ] Charts/tables
- [ ] Compare to reference: `/Users/amelielebon/Desktop/Cresus/Tests Wincap/Output pdf - Occitanie Rayonnage.pdf`

---

## Success Criteria

✅ All of the above checks pass

✅ Full flow works: Upload → Process → Dashboard → Downloads → Chat

✅ No console errors

✅ Exports match expected format/content

---

## Known Limitations (MVP)

- Chat responses are text-only (no tables/charts yet)
- No trace modals when clicking numbers (coming later)
- PPTX export not implemented (backend only has PDF now)
- No persistent storage (session-based only)
- Single project at a time
- No user authentication

---

## Next Steps (After MVP Launch)

1. Add trace modals (click metric → GL entries)
2. Add chart renderers (variance bridges, waterfall)
3. Add PPTX export
4. Add persistent storage (PostgreSQL)
5. Add user authentication
6. Add multi-project support
7. Add company-wide analytics
