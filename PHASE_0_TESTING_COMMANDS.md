# PHASE 0 TESTING GUIDE
## Complete Testing Commands

---

## 🔧 SETUP: Terminal Windows

You'll need **3 terminal windows** open:

1. **Terminal 1:** Backend server
2. **Terminal 2:** Frontend dev server
3. **Terminal 3:** API testing (curl commands)

---

## ✅ TEST 1: Start Backend Server

**Terminal 1:**

```bash
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex/apps/api

# Option A: Development with auto-reload
python -m uvicorn api:app --reload --port 8000 --host 0.0.0.0

# Option B: Production mode (if Option A fails)
uvicorn api:app --port 8000 --host 0.0.0.0
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**If it fails:**
- Check Python installed: `python --version`
- Install requirements: `pip install -r requirements.txt`
- Verify port 8000 free: `lsof -i :8000`

---

## ✅ TEST 2: Start Frontend Dev Server

**Terminal 2:**

```bash
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex/apps/web

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**If it fails:**
- Check Node: `node --version` (should be v16+)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check port 5173 free: `lsof -i :5173`

---

## ✅ TEST 3: Manual Browser Testing

**Terminal 3 (for monitoring):**

Open DevTools in browser to watch network requests and console.

```bash
# Open browser
open http://localhost:5173/

# Or macOS alternative
start http://localhost:5173/

# Or Linux
firefox http://localhost:5173/ &
```

---

## 🧪 TEST SCENARIOS

### Test 3.1: Health Check (Verify Backend Running)

**Terminal 3:**

```bash
# Test backend is running
curl -X GET http://localhost:8000/api/health \
  -H "X-API-Key: development-api-key-change-in-production"
```

**Expected Response:**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

### Test 3.2: Upload FEC File

**Using Browser UI:**

1. Go to http://localhost:5173/
2. You should see **Upload Interface**
3. Click "Select Files"
4. Choose a test FEC file (`.txt` format)
   - Or create one: `echo "test data" > test_FEC2024.txt`
5. Enter company name: "Test Company"
6. Click "Upload"
7. **Watch DevTools → Network tab for upload request**
   - Should see `POST /api/upload`
   - Should see `X-API-Key` header (removed now, should work without 401)
   - Status should be **200** (not 401)

**If using curl:**

```bash
# Create test FEC file
cat > /tmp/test_FEC2024.txt << 'EOF'
JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|DebitCredit|Montant|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
VT|Ventes|1|2024-01-01|401000|Client A|D|1000.00|||||
VT|Ventes|2|2024-01-02|411000|Revenue|C|1000.00|||||
EOF

# Upload file
SESSION_ID=$(curl -X POST http://localhost:8000/api/upload \
  -F "files=@/tmp/test_FEC2024.txt" \
  -F "company_name=Test Company" \
  -H "X-API-Key: development-api-key-change-in-production" \
  2>/dev/null | jq -r '.session_id')

echo "Session ID: $SESSION_ID"
```

**Expected Response:**
```json
{
  "session_id": "12345678-...",
  "company_name": "Test Company",
  "files_count": 1,
  "status": "uploaded"
}
```

---

### Test 3.3: Process FEC Data

**Using Browser UI:**

1. After upload completes, you should see "Processing..." message
2. Wait for processing to complete (30-60 seconds)
3. Should see **Dashboard** load automatically
4. **Watch DevTools → Network for `/api/process` request**
   - Should return **200** (not 401)

**If using curl:**

```bash
# Process the uploaded FEC
SESSION_ID="your-session-id-from-upload"

curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -H "X-API-Key: development-api-key-change-in-production" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"company_name\": \"Test Company\"
  }"
```

**Expected Response:**
```json
{
  "session_id": "12345678-...",
  "status": "complete",
  "company_name": "Test Company"
}
```

---

### Test 3.4: View Dashboard - Get Summary

**Using Browser UI:**

1. Dashboard should show **Summary tab**
2. Should display KPIs: Revenue, EBITDA, Margins, etc.
3. **Watch DevTools → Network for `/api/agent/.../summary`**
   - Should see **200** (not 401)
   - Should have `X-API-Key` header (but removed, should still work)

**If using curl:**

```bash
SESSION_ID="your-session-id"

curl -X GET http://localhost:8000/api/agent/$SESSION_ID/summary \
  -H "X-API-Key: development-api-key-change-in-production"
```

**Expected Response:**
```json
{
  "company": {...},
  "latest_year": 2024,
  "financial_metrics": {
    "revenue": 1000.00,
    "ebitda": 500.00,
    ...
  }
}
```

---

### Test 3.5: View Dashboard - Get Anomalies

**Using Browser UI:**

1. Click **Hotspots tab**
2. Should display anomalies table
3. **Watch DevTools → Network for `/api/agent/.../anomalies`**
   - Should return **200** (not 401)

**If using curl:**

```bash
SESSION_ID="your-session-id"

curl -X GET http://localhost:8000/api/agent/$SESSION_ID/anomalies \
  -H "X-API-Key: development-api-key-change-in-production"
```

**Expected Response:**
```json
{
  "year": 2024,
  "anomaly_count": 2,
  "entries": [...]
}
```

---

### Test 3.6: Export to Excel

**Using Browser UI:**

1. On Dashboard, click **"Download Excel"** button
2. File should download: `Databook_2024-01-18.xlsx`
3. **Watch DevTools → Network for `/api/export/xlsx`**
   - Should return **200** with file blob (not 401)

**If using curl:**

```bash
SESSION_ID="your-session-id"

curl -X GET http://localhost:8000/api/export/xlsx/$SESSION_ID \
  -H "X-API-Key: development-api-key-change-in-production" \
  -o /tmp/databook.xlsx

# Verify file downloaded
ls -lh /tmp/databook.xlsx
```

---

### Test 3.7: Export to PDF

**Using Browser UI:**

1. On Dashboard, click **"Download PDF"** button
2. File should download: `Rapport_DD_2024-01-18.pdf`
3. **Watch DevTools → Network for `/api/export/pdf`**
   - Should return **200** with file blob (not 401)

**If using curl:**

```bash
SESSION_ID="your-session-id"

curl -X GET http://localhost:8000/api/export/pdf/$SESSION_ID \
  -H "X-API-Key: development-api-key-change-in-production" \
  -o /tmp/report.pdf

# Verify file downloaded
ls -lh /tmp/report.pdf
```

---

### Test 3.8: Chat with Claude

**Using Browser UI:**

1. On Dashboard, click **"Chat" button** (right panel)
2. You should see chat interface
3. Type a question: "Show me the P&L"
4. Click send (or press Ctrl+Enter)
5. **Watch DevTools → Network for `/api/agent/.../chat`**
   - Should return **200** (not 401)
   - Claude should respond with financial data

**If using curl:**

```bash
SESSION_ID="your-session-id"

curl -X POST http://localhost:8000/api/agent/$SESSION_ID/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: development-api-key-change-in-production" \
  -d "{\"message\": \"Show me the P&L\"}"
```

**Expected Response:**
```json
{
  "role": "assistant",
  "content": "Here's the P&L statement...[financial data]"
}
```

---

### Test 3.9: Get Databook (Full Financial Data)

**If using curl:**

```bash
SESSION_ID="your-session-id"

curl -X GET http://localhost:8000/api/data/$SESSION_ID \
  -H "X-API-Key: development-api-key-change-in-production" | jq .
```

**Expected Response:**
```json
{
  "session_id": "...",
  "company_name": "Test Company",
  "status": "complete",
  "data": {
    "pl": [...],
    "balance": [...],
    "kpis": [...]
  }
}
```

---

### Test 3.10: Verify NO Hardcoded API Key

**Terminal 3:**

```bash
# Check api.ts doesn't have hardcoded key
grep -n "development-api-key-change-in-production" \
  /Users/amelielebon/Desktop/Cresus/wincap-saas-codex/apps/web/src/services/api.ts

# Should return: (no results = ✅ GOOD)
# If it returns lines, we need to fix them
```

---

### Test 3.11: Verify NO API Key in Console

**Browser DevTools:**

1. Open browser console: F12 → Console tab
2. Upload a file
3. Watch console output
4. **Should NOT see any console.log with "API_KEY"**
5. Should only see normal logs

---

---

## 🔍 COMPLETE AUTOMATED TEST SCRIPT

**Create file:** `/tmp/test_phase0.sh`

```bash
#!/bin/bash

echo "╔════════════════════════════════════════════╗"
echo "║   PHASE 0 AUTOMATED TEST SCRIPT           ║"
echo "╚════════════════════════════════════════════╝"
echo ""

API_URL="http://localhost:8000"
API_KEY="development-api-key-change-in-production"

# Test 1: Health check
echo "TEST 1: Health Check"
echo "───────────────────────────"
HEALTH=$(curl -s -X GET $API_URL/api/health \
  -H "X-API-Key: $API_KEY")
echo "Response: $HEALTH"
if echo $HEALTH | grep -q '"status":"ok"'; then
  echo "✅ PASS: Backend is running"
else
  echo "❌ FAIL: Backend health check failed"
  exit 1
fi
echo ""

# Test 2: Create test FEC file
echo "TEST 2: Create Test FEC File"
echo "───────────────────────────"
cat > /tmp/test_FEC2024.txt << 'EOF'
JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|DebitCredit|Montant|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
VT|Ventes|1|2024-01-01|401000|Client A|D|1000.00|||||
VT|Ventes|2|2024-01-02|411000|Revenue|C|1000.00|||||
AC|Achats|3|2024-01-03|401100|Supplier|C|500.00|||||
AC|Achats|4|2024-01-04|401100|Supplier|D|500.00|||||
EOF
echo "✅ PASS: Test file created"
echo ""

# Test 3: Upload FEC
echo "TEST 3: Upload FEC File"
echo "───────────────────────────"
UPLOAD=$(curl -s -X POST $API_URL/api/upload \
  -F "files=@/tmp/test_FEC2024.txt" \
  -F "company_name=Test Company" \
  -H "X-API-Key: $API_KEY")
echo "Response: $UPLOAD"
SESSION_ID=$(echo $UPLOAD | jq -r '.session_id // empty')
if [ -z "$SESSION_ID" ]; then
  echo "❌ FAIL: Upload failed"
  exit 1
fi
echo "✅ PASS: File uploaded, Session ID: $SESSION_ID"
echo ""

# Test 4: Process FEC
echo "TEST 4: Process FEC Data"
echo "───────────────────────────"
PROCESS=$(curl -s -X POST $API_URL/api/process \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"session_id\": \"$SESSION_ID\", \"company_name\": \"Test Company\"}")
echo "Response: $PROCESS"
if echo $PROCESS | grep -q '"status":"complete"'; then
  echo "✅ PASS: Processing complete"
else
  echo "❌ FAIL: Processing failed"
fi
echo ""

# Test 5: Get Summary
echo "TEST 5: Get Summary"
echo "───────────────────────────"
SUMMARY=$(curl -s -X GET $API_URL/api/agent/$SESSION_ID/summary \
  -H "X-API-Key: $API_KEY")
echo "Response: $SUMMARY"
if echo $SUMMARY | grep -q "financial_metrics"; then
  echo "✅ PASS: Summary retrieved"
else
  echo "❌ FAIL: Summary retrieval failed"
fi
echo ""

# Test 6: Get Anomalies
echo "TEST 6: Get Anomalies"
echo "───────────────────────────"
ANOMALIES=$(curl -s -X GET $API_URL/api/agent/$SESSION_ID/anomalies \
  -H "X-API-Key: $API_KEY")
echo "Response: $ANOMALIES"
if echo $ANOMALIES | grep -q "anomaly_count"; then
  echo "✅ PASS: Anomalies retrieved"
else
  echo "❌ FAIL: Anomalies retrieval failed"
fi
echo ""

# Test 7: Check API key not in code
echo "TEST 7: Verify No Hardcoded API Key"
echo "───────────────────────────"
HARDCODED=$(grep -c "development-api-key-change-in-production" \
  /Users/amelielebon/Desktop/Cresus/wincap-saas-codex/apps/web/src/services/api.ts)
if [ "$HARDCODED" -eq 0 ]; then
  echo "✅ PASS: No hardcoded API key in code"
else
  echo "❌ FAIL: Found $HARDCODED hardcoded API keys"
fi
echo ""

echo "╔════════════════════════════════════════════╗"
echo "║   ALL TESTS COMPLETE                       ║"
echo "╚════════════════════════════════════════════╝"
```

**Run the test:**

```bash
chmod +x /tmp/test_phase0.sh
/tmp/test_phase0.sh
```

---

## 📋 MANUAL CHECKLIST

Print this and check off as you test:

```
PHASE 0 TEST CHECKLIST
═══════════════════════════════════════════

Backend
─────────────────────────────────────────
☐ Backend starts on port 8000
☐ No errors in backend console
☐ Health check returns 200 OK
☐ Can access /api/health endpoint

Frontend
─────────────────────────────────────────
☐ Frontend starts on port 5173
☐ No TypeScript errors
☐ Can access http://localhost:5173
☐ Upload interface displays

Upload
─────────────────────────────────────────
☐ Can select FEC file
☐ Can enter company name
☐ Click upload completes
☐ No 401 errors in DevTools
☐ Success message appears

Process
─────────────────────────────────────────
☐ Processing starts automatically
☐ "Processing..." message shows
☐ No 401 errors during processing
☐ Processing completes (30-60 sec)

Dashboard
─────────────────────────────────────────
☐ Dashboard loads after processing
☐ Summary tab shows KPIs
☐ Summary loads without 401 error
☐ Hotspots tab shows anomalies
☐ Anomalies load without 401 error

Exports
─────────────────────────────────────────
☐ "Download Excel" button visible
☐ Excel downloads without 401
☐ Excel file is valid (.xlsx)
☐ "Download PDF" button visible
☐ PDF downloads without 401
☐ PDF file is valid (.pdf)

Chat
─────────────────────────────────────────
☐ Chat button visible on dashboard
☐ Can click to open chat interface
☐ Chat loads without 401
☐ Can type message
☐ Can send message without 401
☐ Claude responds

Security
─────────────────────────────────────────
☐ No "development-api-key-..." in api.ts
☐ No API_KEY logged to console
☐ Browser console is clean
☐ DevTools shows X-API-Key headers sent

Overall
─────────────────────────────────────────
☐ No 401 errors anywhere
☐ All features work
☐ No console errors
☐ App is responsive
```

---

## 🚨 TROUBLESHOOTING

### Issue: Backend won't start

```bash
# Kill existing process on port 8000
lsof -i :8000
kill -9 <PID>

# Try again
cd apps/api
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
```

### Issue: Frontend won't start

```bash
# Clear cache and reinstall
cd apps/web
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: CORS errors in browser

```bash
# Backend should handle CORS. If not, check settings.py:
# CORS_ORIGINS should include http://localhost:5173
```

### Issue: 401 errors still appearing

```bash
# Check if fix was applied correctly
grep -A2 "getHeaders" apps/web/src/services/api.ts

# Should show headers without X-API-Key now
# If still there, reapply the fix
```

### Issue: Chat not working

```bash
# Check ANTHROPIC_API_KEY is set
echo $ANTHROPIC_API_KEY

# If empty, set it
export ANTHROPIC_API_KEY="sk-ant-your-key"

# Restart backend
```

---

## ✅ SUCCESS CRITERIA

All tests pass when:

1. ✅ Backend runs without errors
2. ✅ Frontend runs without errors
3. ✅ Can upload FEC file without 401
4. ✅ Can process data without 401
5. ✅ Dashboard loads without 401
6. ✅ Summary loads without 401
7. ✅ Anomalies load without 401
8. ✅ Exports download without 401
9. ✅ Chat sends without 401
10. ✅ No hardcoded API keys in code
11. ✅ No API keys logged to console
12. ✅ Browser console has no errors

---

## 🎯 Expected Outcomes

**If all tests pass:**
- Phase 0 is verified ✅
- Ready for Phase 1 implementation
- Can deploy to staging

**If tests fail:**
- Check specific error messages
- Review troubleshooting section
- Verify all fixes were applied

---

*Created: January 18, 2026*
*For: Phase 0 Testing & Verification*
