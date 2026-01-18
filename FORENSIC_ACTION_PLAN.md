# FORENSIC ACTION PLAN - WINCAP SAAS CODEX
## Critical Bug Fixes & Production Roadmap

---

## CRITICAL BUGS - FIX IMMEDIATELY (4 Hours)

### BUG #1: App.tsx Missing X-API-Key Header

**File:** `apps/web/src/App.tsx`
**Lines:** 35-44
**Severity:** 🔴 CRITICAL - Breaks core feature

**Current Code:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/process`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    session_id: sessionId,
    company_name: processing?.companyName || 'Company',
  }),
});
```

**Fixed Code:**
```typescript
import { processFEC } from './services/api';

const response = await processFEC({
  session_id: sessionId,
  company_name: processing?.companyName || 'Company',
});
```

**Why:** The processFEC() function in api.ts already handles headers correctly.

**Test:** Run app, upload file, verify processing works without 401 error.

---

### BUG #2: EnrichedDashboard Missing X-API-Key Headers

**File:** `apps/web/src/components/EnrichedDashboard.tsx`
**Lines:** Multiple (summary, anomalies, export calls)
**Severity:** 🔴 CRITICAL - Breaks dashboard features

**Current Code Pattern:**
```typescript
const summaryRes = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/summary`);
const anomaliesRes = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/anomalies`);
const response = await fetch(`${API_BASE_URL}/api/export/xlsx/${sessionId}`);
```

**Fixed Code:**
```typescript
import {
  getAgentSummary,
  getAgentAnomalies,
  downloadExcel,
  downloadPDF,
} from '../services/api';

const summaryRes = await getAgentSummary(sessionId);
const anomaliesRes = await getAgentAnomalies(sessionId);
await downloadExcel(sessionId);  // Already handles auth + download
```

**Why:** Use existing api service functions that properly include headers.

**Test:** Verify dashboard loads summary and anomalies, exports work.

---

### BUG #3: ChatInterface Missing X-API-Key Header

**File:** `apps/web/src/components/ChatInterface.tsx`
**Lines:** Chat endpoint fetch
**Severity:** 🔴 CRITICAL - Chat feature broken

**Current Code:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/agent/${sessionId}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
});
```

**Fixed Code:**
```typescript
import { sendChatMessage } from '../services/api';

const result = await sendChatMessage(sessionId, message);
```

**Why:** sendChatMessage() already handles authentication properly.

**Test:** Verify chat works without 401 errors.

---

### BUG #4: API_KEY Logged to Console

**File:** `apps/web/src/services/api.ts`
**Line:** 219
**Severity:** 🔴 CRITICAL - Security exposure

**Current Code:**
```typescript
console.log('Uploading files with API_KEY:', API_KEY);
console.log('Files count:', files.length);
```

**Fixed Code:**
```typescript
// Remove the console.log that shows API_KEY
// Can keep: console.log('Files count:', files.length);
```

**Why:** API keys should never be logged or visible in console.

**Test:** Upload file, verify no API key in console output.

---

## SECURITY FIXES - Complete This Week

### SECURITY FIX #1: Remove Hardcoded Default API Key

**File:** `apps/web/src/services/api.ts`
**Line:** 30

**Current Code:**
```typescript
export const API_KEY = import.meta.env.VITE_API_KEY || 'development-api-key-change-in-production';
```

**Fixed Code:**
```typescript
export const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error(
    'FATAL: VITE_API_KEY environment variable is not set. ' +
    'Please set VITE_API_KEY in your .env file.'
  );
}
```

**Why:** Should never allow a default key to fall back. Require explicit configuration.

**Deployment Impact:** Build will fail if VITE_API_KEY not set (this is good).

---

### SECURITY FIX #2: Validate ANTHROPIC_API_KEY on Startup

**File:** `apps/api/api.py`
**Location:** After settings loaded, around line 160

**Add Code:**
```python
# After app initialization
import os

anthropic_key = os.getenv("ANTHROPIC_API_KEY")
if not anthropic_key or anthropic_key.startswith("sk-ant-..."):
    logger.warning("ANTHROPIC_API_KEY not properly configured for AI features")
    # In production, this should fail
    if settings.ENVIRONMENT == "production":
        raise ConfigurationError("ANTHROPIC_API_KEY must be set in production")
```

**Why:** Prevent broken Claude integration in production.

---

### SECURITY FIX #3: Rotate All Exposed Keys

**Action Items:**
1. Regenerate API_KEY (development-api-key-change-in-production is now public)
2. Regenerate ANTHROPIC_API_KEY (sk-ant-... pattern now public)
3. Update .env with new keys
4. Remove old .env from git history (git filter-branch)
5. Add .env to .gitignore if not already there

---

### SECURITY FIX #4: Add .env to .gitignore

**File:** `.gitignore`

**Add Line:**
```
.env
.env.local
.env.*.local
```

**Current Status:** ✅ Already in .gitignore, good!

---

## ARCHITECTURE FIXES - Complete This Month

### ARCH FIX #1: Implement Persistent Session Storage

**Why:** Current in-memory SESSIONS dict loses data on server restart.

**Implementation Plan:**

**Step 1: Create PostgreSQL Schema**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  data JSONB NOT NULL,
  processed JSONB,
  status VARCHAR(50) DEFAULT 'uploading'
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Step 2: Create SQLAlchemy Model**
```python
# apps/api/src/models/session.py
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timedelta
import uuid

class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    data = Column(JSON)
    processed = Column(JSON)
    status = Column(String(50), default="uploading")

    def is_expired(self):
        return datetime.utcnow() > self.expires_at
```

**Step 3: Replace SESSIONS Dict**
```python
# apps/api/api.py
# Remove: SESSIONS = {}
# Remove: SESSIONS_LOCK = threading.Lock()

# Add database query instead:
async def get_session(session_id: str, db: Session) -> SessionModel:
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id
    ).first()
    if not session or session.is_expired():
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session
```

**Effort:** 2 days
**Risk:** Medium (need to test migration)

---

### ARCH FIX #2: Add User Authentication

**Why:** Currently anyone can access any session.

**Implementation Plan:**

**Step 1: Create User Model**
```python
from fastapi_users import FastAPIUsers
from fastapi_users.db import SQLAlchemyUserDatabase

class User(Base):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
```

**Step 2: Add FastAPI-Users Integration**
```python
from fastapi_users.authentication import JWTAuthentication

auth_backend = JWTAuthentication(
    secret="your-secret-key",
    lifetime_seconds=3600,
)

fastapi_users = FastAPIUsers(
    user_db,
    [auth_backend],
)

current_user = fastapi_users.current_user()
```

**Step 3: Protect Endpoints**
```python
@app.post("/api/process")
async def process_fec(
    request: ProcessRequest,
    user: User = Depends(current_user),
):
    # Now each session is tied to user
    session = get_session(request.session_id, db)
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    # ...
```

**Effort:** 3 days
**Risk:** High (changes auth architecture)

---

### ARCH FIX #3: Replace API Key Auth with JWT

**Why:** Current API key is shared between all users, not scalable.

**Implementation Plan:**

**Step 1: Replace Header Auth**
```python
# BEFORE
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> str:
    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# AFTER - Already done in Step 2 above with fastapi_users
```

**Step 2: Frontend Update**
```typescript
// Before: send X-API-Key header
headers: { 'X-API-Key': API_KEY }

// After: send Authorization header
headers: { 'Authorization': `Bearer ${token}` }
```

**Effort:** 1 day
**Risk:** Medium (breaking change for API consumers)

---

## TEST FIXES - Complete This Week

### TEST FIX #1: Add Authentication Tests

**File:** `apps/api/tests/test_api_endpoints.py`

**Add Tests:**
```python
def test_upload_without_api_key():
    """Should reject requests without X-API-Key header"""
    response = client.post("/api/upload", files=(...))
    assert response.status_code == 401

def test_process_without_api_key():
    """Should reject process requests without authentication"""
    response = client.post("/api/process", json={...})
    assert response.status_code == 401

def test_session_expiration():
    """Should reject expired sessions"""
    # Create session with past expiration
    # Try to access it
    assert response.status_code == 404
```

**Effort:** 4 hours
**Impact:** Prevents auth regressions

---

### TEST FIX #2: Add Frontend Integration Tests

**File:** `apps/web/src/test/`

**Add Tests:**
```typescript
describe('API Service', () => {
  test('should include X-API-Key header in requests', async () => {
    const mockFetch = jest.fn();
    await uploadFEC([...]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': expect.any(String),
        }),
      })
    );
  });
});
```

**Effort:** 8 hours
**Impact:** Catches auth bugs in CI/CD

---

## CONFIGURATION FIXES

### CONFIG FIX #1: Standardize ENV Files

**File:** `.env.example`

**Replace with:**
```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
ENVIRONMENT=production

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com

# Session Configuration
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_HOURS=1

# Processing
VAT_RATE_DEFAULT=1.20
MAX_PARALLEL_FILES=4

# Logging
LOG_LEVEL=INFO

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_API_KEY=your-api-key-here

# Secrets (DO NOT COMMIT)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@localhost/wincap
REDIS_URL=redis://localhost:6379
```

**Update:** `.env` to match structure, add comments explaining each setting.

---

### CONFIG FIX #2: Build-Time Validation

**File:** `apps/web/package.json`

**Update build script:**
```json
{
  "scripts": {
    "build": "npm run validate-env && vite build",
    "validate-env": "node scripts/validate-env.js"
  }
}
```

**Create:** `apps/web/scripts/validate-env.js`
```javascript
const requiredVars = ['VITE_API_URL', 'VITE_API_KEY'];
const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('Missing required env vars:', missing);
  process.exit(1);
}
```

**Effort:** 1 hour
**Impact:** Prevents broken production builds

---

## IMMEDIATE TASK LIST (Next 48 Hours)

- [ ] Fix App.tsx fetch to use processFEC() (1 hour)
- [ ] Fix EnrichedDashboard to use api service functions (2 hours)
- [ ] Fix ChatInterface to use sendChatMessage() (30 min)
- [ ] Remove API_KEY from console.log (15 min)
- [ ] Test all features work without 401 errors (1 hour)
- [ ] Regenerate API keys (30 min)
- [ ] Verify fixes in both dev and production (1 hour)

**Total: 6 hours**

---

## 1-WEEK ROADMAP

**Monday-Tuesday:**
- [ ] Implement all critical bug fixes
- [ ] Add security validations
- [ ] Test everything thoroughly
- [ ] Update documentation

**Wednesday-Thursday:**
- [ ] Set up PostgreSQL database
- [ ] Implement session persistence
- [ ] Add user authentication
- [ ] Migrate from in-memory storage

**Friday:**
- [ ] Add comprehensive tests
- [ ] Performance optimization
- [ ] Security audit of changes
- [ ] Prepare for deployment

---

## 1-MONTH ROADMAP

**Week 1:** Fix critical bugs + security hardening
**Week 2:** Implement database persistence + user auth
**Week 3:** Comprehensive testing + documentation
**Week 4:** Production deployment + monitoring setup

---

## SUCCESS CRITERIA

After fixes are complete:
- ✅ All API endpoints work without 401 errors
- ✅ No secrets exposed in code or console
- ✅ All user sessions persistent across restarts
- ✅ Authentication works end-to-end
- ✅ Test coverage > 80%
- ✅ No security vulnerabilities in OWASP top 10
- ✅ App passes load testing (100 concurrent users)

---

## TESTING CHECKLIST

Before declaring "production ready":

- [ ] Upload single FEC file → see it parse correctly
- [ ] Upload multiple FEC files → see multi-year analysis
- [ ] Click Process → see processing without 401
- [ ] Dashboard loads → shows summary and anomalies
- [ ] Chat works → sends message and gets Claude response
- [ ] Export to Excel → file downloads and opens correctly
- [ ] Export to PDF → file downloads and opens correctly
- [ ] Delete session → cleans up temporary files
- [ ] Restart server → sessions persist (once DB implemented)
- [ ] Invalid API key → receives 401 error
- [ ] Missing auth header → receives 401 error
- [ ] Expired session → receives 404 error
- [ ] SQL injection attempt → rejected safely
- [ ] Path traversal attempt → rejected safely
- [ ] Load test (100 users) → no crashes

---

## DEPLOYMENTS CHECKLIST

Before deploying to production:

- [ ] All secrets removed from repository
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring and alerting enabled
- [ ] Backup procedures tested
- [ ] Disaster recovery plan documented
- [ ] Load balancer configured
- [ ] Rate limiting enabled
- [ ] CORS properly restricted
- [ ] Headers security configured (CSP, HSTS, etc.)

---

*This action plan should take 4-6 weeks to complete fully.*
*Current blockers must be fixed in 48 hours before any testing.*
