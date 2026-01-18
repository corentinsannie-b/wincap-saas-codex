# Internal Deployment Guide - Wincap SaaS

**Purpose:** Deploy Wincap on private network for 2-user testing (no authentication required)

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm/pnpm
- Anthropic API key (for Claude agent chat)
- Private network (localhost or internal IP only)

---

## Step 1: Clone & Setup

```bash
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex

# Create .env from template
cp .env.example .env

# Edit .env with your settings
nano .env  # or your favorite editor
```

**Critical .env Variables to Set:**

```env
# Backend
API_HOST=0.0.0.0              # Listen on all interfaces
API_PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:8080,http://192.168.x.x:8080  # Add internal IPs

# Frontend
VITE_API_URL=http://localhost:8000  # Or internal IP

# AI Integration (REQUIRED for chat to work)
ANTHROPIC_API_KEY=sk-ant-...   # Your Claude API key
```

---

## Step 2: Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Install Python dependencies for backend
cd apps/api
pip install -e .
```

---

## Step 3: Start Backend

```bash
# Terminal 1: Start FastAPI server
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex/apps/api
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

---

## Step 4: Build & Start Frontend

```bash
# Terminal 2: Build and serve frontend
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex/apps/web
npm run build
npm run preview -- --host 0.0.0.0 --port 8080
```

Or for development with hot reload:
```bash
npm run dev -- --host 0.0.0.0 --port 8080
```

You should see:
```
  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.x.x:8080/
```

---

## Step 5: Access the Application

**From Same Machine:**
```
http://localhost:8080
```

**From Other Machine on Network:**
```
http://192.168.x.x:8080
```

(Replace 192.168.x.x with your actual internal IP)

---

## Testing the Flow: Upload → Process → Chat

### 1. Upload FEC File

1. Go to http://localhost:8080
2. Click "Upload FEC File"
3. Select a test FEC file (e.g., `Tests WINCAP/INPUT-4118190FEC*.txt`)
4. Click upload

Expected: File processes, shows "Processing..." spinner (30-60 seconds)

### 2. View Dashboard

After processing completes, you should see:
- P&L Statement (Compte de Résultat)
- Balance Sheet (Bilan)
- KPI Cards (Production, EBITDA, etc.)

### 3. Chat with Claude Agent

1. Click **"Ask Questions"** button (bottom right)
2. Type a question in French or English:
   - "Montre-moi le P&L 2024" (Show me the 2024 P&L)
   - "Pourquoi l'EBITDA a baissé?" (Why did EBITDA decrease?)
   - "Quels sont les hotspots?" (What are the hotspots?)

Expected: Claude analyzes the data and responds with insights

---

## Troubleshooting

### Error: "Cannot reach server"
- **Fix:** Check if backend is running on `http://localhost:8000`
- **Fix:** Ensure VITE_API_URL is set correctly in .env
- **Fix:** Check CORS_ORIGINS includes your frontend URL

### Error: "ANTHROPIC_API_KEY not set"
- **Fix:** Add to .env: `ANTHROPIC_API_KEY=sk-ant-...`
- **Fix:** Restart backend: `Ctrl+C` then re-run

### Error: "429 Too Many Requests" from Claude
- **Fix:** You've exceeded API quota - wait a few moments before retrying
- **Fix:** Check Anthropic dashboard for usage

### Error: "File upload failed"
- **Fix:** Ensure file is .txt or .csv format
- **Fix:** File must contain FEC data (check file size > 100 bytes)
- **Fix:** Check `/tmp/wincap/` has write permissions

### Chat returns no response
- **Fix:** Claude might be analyzing - wait 10-20 seconds
- **Fix:** Check browser console for errors (F12)
- **Fix:** Check backend logs for API errors

---

## File Organization

```
/tmp/wincap/                           # Temporary upload directory
├── {session_id}/                      # Each session gets its own folder
│   ├── input_fec_*.txt                # Original FEC files
│   ├── parsed_entries.json            # Parsed journal entries
│   ├── processed_data.json            # Financial statements
│   └── chat_history.json              # Chat messages
```

**Note:** These files auto-delete after 24 hours (configurable in .env)

---

## Environment Variables Reference

### Backend Settings
```env
API_HOST=0.0.0.0              # Address to bind to
API_PORT=8000                 # Port number
API_WORKERS=1                 # Worker processes (keep 1 for dev)
ENVIRONMENT=development       # development or production
CORS_ORIGINS=...              # Comma-separated allowed URLs
LOG_LEVEL=INFO                # DEBUG, INFO, WARNING, ERROR, CRITICAL
UPLOAD_TEMP_DIR=/tmp/wincap   # Where to store uploaded files
SESSION_TTL_HOURS=24          # How long to keep sessions
CLEANUP_INTERVAL_HOURS=6      # How often to clean old sessions
```

### Frontend Settings
```env
VITE_API_URL=http://localhost:8000    # Backend URL (visible to browser)
```

### AI Integration
```env
ANTHROPIC_API_KEY=sk-ant-...   # Claude API key (required for chat)
```

---

## Monitoring & Logs

### Backend Logs
```bash
# Watch backend logs in real-time
tail -f /var/log/wincap.log  # If configured in .env
```

### Frontend Network Requests
Open browser DevTools (F12) → Network tab to see API calls:
- POST `/api/upload` - File upload
- POST `/api/process` - Data processing
- POST `/api/agent/{sessionId}/chat` - Chat queries

### Check API Health
```bash
curl http://localhost:8000/health
```

Should return:
```json
{"status": "healthy", "version": "1.0.0"}
```

---

## Demo Workflow

**Time Estimate:** 5-10 minutes

1. **Prepare** (1 min)
   - Start backend and frontend
   - Have test FEC file ready

2. **Upload** (2 min)
   - Upload a test FEC file
   - Wait for processing to complete

3. **Explore Dashboard** (2 min)
   - Show P&L and Balance Sheet
   - Point out KPI cards

4. **Chat Demo** (3-5 min)
   - Ask about P&L: "Montre-moi le P&L 2024"
   - Ask about trends: "L'EBITDA a-t-il augmenté?"
   - Ask about anomalies: "Y a-t-il des éléments inhabituels?"

---

## Performance Notes

- **Upload:** 10-50 MB FEC files take ~30 seconds to process
- **Chat:** First response takes 5-15 seconds (Claude API latency)
- **Memory:** Backend uses ~200MB base + 50MB per concurrent session

---

## Stopping the Application

```bash
# Terminal 1: Stop backend
Ctrl+C

# Terminal 2: Stop frontend
Ctrl+C

# Clean up temp files (optional)
rm -rf /tmp/wincap
```

---

## Next Steps: Production Deployment

When ready to move to production:

1. **Add Authentication** - Implement OAuth or API keys
2. **Database** - Replace in-memory sessions with PostgreSQL
3. **SSL/TLS** - Use HTTPS instead of HTTP
4. **Rate Limiting** - Prevent abuse
5. **Monitoring** - Add error tracking and alerting
6. **Backup** - Regular database backups

See `CHRISTOPHE_FORENSIC_AUDIT_FINAL.md` for detailed recommendations.

---

**Last Updated:** 2026-01-18
**Status:** Ready for Internal Testing
