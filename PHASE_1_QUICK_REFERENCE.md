# PHASE 1 QUICK REFERENCE GUIDE
## Fast-Track Checklist for Implementation

---

## KEY CHANGES SUMMARY

### What's Being Replaced

| Old | New | Why |
|-----|-----|-----|
| In-memory `SESSIONS = {}` dict | PostgreSQL `session` table | Persistence across restarts |
| `X-API-Key` header auth | JWT Bearer token auth | Scalable, user-specific |
| Single shared API key | Per-user tokens | Multi-user support |
| No user accounts | User + Team models | Team workspaces |
| Temporary files cleanup | Database with soft deletes | Audit trail |

### Key Files to Create

```
apps/api/
├── config/
│   └── database.py (NEW)
├── src/
│   ├── models/
│   │   ├── user.py (NEW)
│   │   ├── team.py (NEW)
│   │   ├── session.py (NEW)
│   │   └── report.py (NEW)
│   ├── auth/
│   │   ├── security.py (NEW)
│   │   ├── schemas.py (NEW)
│   │   ├── dependencies.py (NEW)
│   ├── services/
│   │   └── session_service.py (NEW)
│   └── routes/
│       └── auth.py (NEW)
├── migrations/
│   └── 001_initial_schema.sql (NEW)

apps/web/src/
├── services/
│   └── auth.ts (NEW)
├── pages/
│   ├── LoginPage.tsx (NEW)
│   └── SignupPage.tsx (NEW)
├── components/
│   └── ProtectedRoute.tsx (NEW)
└── tests/
    └── auth.test.ts (NEW)
```

### Key Files to Modify

```
apps/api/
├── api.py (MAJOR - remove SESSIONS dict, add JWT auth)
├── config/settings.py (ADD - JWT_SECRET_KEY, DATABASE_URL)
└── requirements.txt (ADD - fastapi-users, sqlalchemy, psycopg2)

apps/web/src/
├── App.tsx (ADD - auth routes, ProtectedRoute)
├── services/api.ts (MAJOR - replace X-API-Key with Bearer)
└── package.json (ADD - react-router-dom if not present)
```

---

## IMPLEMENTATION ROADMAP BY DAY

### ✅ Day 1: Database Foundation (3 hours)

**Task 1: Create PostgreSQL Database**
```bash
# Create database
createdb wincap

# Or use Docker Compose to spin up PostgreSQL
docker-compose up postgres
```

**Task 2: Database Schema**
- Copy schema from PHASE_1_IMPLEMENTATION_SPECS.md section 1.1.1
- Run SQL file: `psql -U wincap_user -d wincap -f apps/api/migrations/001_initial_schema.sql`

**Task 3: Create database.py**
- File: `apps/api/config/database.py`
- Includes: Engine, SessionLocal, Base, get_db, init_db functions
- Copy from PHASE_1_IMPLEMENTATION_SPECS.md section 1.1.3

**Verify:** `python -c "from apps.api.config.database import engine; print(engine.execute('SELECT 1'))"`

---

### ✅ Day 2: Backend Authentication (4 hours)

**Task 1: Create SQLAlchemy Models**
- `apps/api/src/models/user.py`
- `apps/api/src/models/team.py`
- `apps/api/src/models/session.py`
- `apps/api/src/models/report.py`

Copy from PHASE_1_IMPLEMENTATION_SPECS.md sections 1.1.2

**Task 2: Auth Infrastructure**
- `apps/api/src/auth/security.py` (password hashing, JWT)
- `apps/api/src/auth/schemas.py` (Pydantic models)
- `apps/api/src/auth/dependencies.py` (FastAPI dependencies)

Copy from PHASE_1_IMPLEMENTATION_SPECS.md sections 1.2.1-1.2.2

**Task 3: Auth Endpoints**
- `apps/api/src/routes/auth.py` (register, login, me)
- Copy from PHASE_1_IMPLEMENTATION_SPECS.md section 1.2.3

**Task 4: Update Settings**
- Add to `apps/api/config/settings.py`:
  ```python
  JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
  DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://...")
  ```

**Task 5: Update Requirements**
- Add to `apps/api/requirements.txt`:
  ```
  fastapi-users>=12.0.0
  python-jose[cryptography]>=3.3.0
  passlib[bcrypt]>=1.7.4
  sqlalchemy>=2.0
  psycopg2-binary>=2.9.0
  pydantic-settings>=2.0
  ```

**Verify:**
```bash
cd apps/api
python -m pytest tests/test_auth.py::test_register_user -v
```

---

### ✅ Day 3: Backend Session Migration (4 hours)

**Task 1: Create Session Service**
- File: `apps/api/src/services/session_service.py`
- Contains: Static methods for CRUD on sessions
- Copy from PHASE_1_IMPLEMENTATION_SPECS.md section 1.3.1

**Task 2: Update API Endpoints**
- Modify `apps/api/api.py`:
  - REMOVE: `SESSIONS = {}`, `SESSIONS_LOCK`
  - REMOVE: `verify_api_key` function and dependency
  - UPDATE: Import SessionService
  - UPDATE: All endpoints to use JWT auth via `current_user` dependency
  - UPDATE: All endpoints to use SessionService for session access

Key changes:
- `/api/upload` - Use `current_user` and `current_team` dependencies
- `/api/process` - Same pattern
- `/api/data/{id}` - Same pattern
- ADD: `/api/sessions` - List all user sessions
- ADD: `/api/sessions/{id}` - Delete session
- ADD: Background cleanup task in startup event

Reference: PHASE_1_IMPLEMENTATION_SPECS.md section 1.3.2

**Task 3: Test Database Interactions**
```python
# Quick test script
from apps.api.config.database import SessionLocal
from apps.api.src.models.user import User

db = SessionLocal()
user = db.query(User).first()
print(f"Users in DB: {db.query(User).count()}")
```

**Verify:**
- `POST /api/upload` requires JWT token
- `GET /api/sessions` lists only user's own sessions
- Session data stored in PostgreSQL
- Sessions expire correctly

---

### ✅ Day 4: Frontend Authentication (4 hours)

**Task 1: Auth Service**
- File: `apps/web/src/services/auth.ts`
- Contains: Login, register, logout, token management
- Copy from PHASE_1_IMPLEMENTATION_SPECS.md section 1.4.1

**Task 2: Update API Service**
- File: `apps/web/src/services/api.ts`
- REMOVE: `API_KEY` constant and default fallback
- UPDATE: `getHeaders()` function to use JWT Bearer token
- UPDATE: All API calls to use auth service
- Reference: PHASE_1_IMPLEMENTATION_SPECS.md section 1.4.2

**Task 3: Create Auth Pages**
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/pages/SignupPage.tsx`
- Copy from PHASE_1_IMPLEMENTATION_SPECS.md section 1.4.3

**Task 4: Create Protected Routes**
- File: `apps/web/src/components/ProtectedRoute.tsx`
- Redirects unauthenticated users to login
- Copy from PHASE_1_IMPLEMENTATION_SPECS.md section 1.4.4

**Task 5: Update App Router**
- Modify `apps/web/src/App.tsx`
- Add routes for /login, /signup
- Wrap existing routes in ProtectedRoute
- Reference: PHASE_1_IMPLEMENTATION_SPECS.md section 1.4.5

**Task 6: Update Dependencies**
- Add to `apps/web/package.json`:
  ```json
  "dependencies": {
    "react-router-dom": "^6.20.0"
  }
  ```

**Verify:**
- Can register new account
- Can login with email/password
- Token stored in localStorage
- Accessing `/` redirects to `/login` if not authenticated
- Authenticated users can see dashboard

---

### ✅ Day 5: Integration Testing (3 hours)

**Task 1: End-to-End Workflow**
- [ ] Start backend: `uvicorn apps.api.api:app --reload`
- [ ] Start frontend: `npm run dev`
- [ ] Register new user → check email in DB
- [ ] Login → check token in localStorage
- [ ] Upload FEC file → check session in DB
- [ ] Process file → check processed data in session
- [ ] Export to Excel → should work
- [ ] Logout → should redirect to login

**Task 2: Database Persistence Test**
- [ ] Create session and upload file
- [ ] Restart backend server
- [ ] Query sessions table directly: `SELECT * FROM session;`
- [ ] Verify session still exists with same data

**Task 3: Error Scenarios**
- [ ] Login with wrong password → 401
- [ ] Access endpoint without token → 403
- [ ] Access another user's session → 404
- [ ] Expired session → 410

**Task 4: Regression Testing**
- [ ] Financial calculations still accurate
- [ ] KPI values match old system
- [ ] Multi-year statements correct
- [ ] No regressions in business logic

**Task 5: Bug Fixes**
- [ ] Document any issues found
- [ ] Prioritize by severity
- [ ] Fix critical bugs same day
- [ ] Schedule non-critical bugs

---

## CRITICAL IMPLEMENTATION DETAILS

### Database Connection String

**Development:**
```
postgresql://wincap_user:secure_password@localhost:5432/wincap
```

**Production:**
```
postgresql://prod_user:${DB_PASSWORD}@prod-db.aws.com:5432/wincap
```

**Set in .env:**
```env
DATABASE_URL=postgresql://wincap_user:secure_password@localhost:5432/wincap
```

### JWT Configuration

**In settings.py:**
```python
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ConfigurationError("JWT_SECRET_KEY must be set")

# For development
if ENVIRONMENT == "development":
    JWT_SECRET_KEY = "dev-secret-key-not-for-production"
```

**In .env:**
```env
JWT_SECRET_KEY=your-super-secret-key-at-least-32-characters
```

### API Authentication Pattern

**OLD (Remove):**
```typescript
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': 'development-api-key-change-in-production'
}
```

**NEW (Use):**
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`
}
```

---

## CRITICAL FILES TO REVIEW BEFORE STARTING

1. **PHASE_1_IMPLEMENTATION_SPECS.md** - Complete implementation details
2. **CHRISTOPHE_FORENSIC_AUDIT_COMPLETE.md** - Current state analysis
3. **WHISPER_ROADMAP.md** - Overall product vision

---

## GIT WORKFLOW

**Create feature branch:**
```bash
git checkout -b feat/phase-1-auth-database
```

**Commit incrementally:**
```bash
# After database setup
git add apps/api/config/database.py apps/api/src/models/
git commit -m "feat: add database models and configuration"

# After auth endpoints
git add apps/api/src/auth/ apps/api/src/routes/auth.py
git commit -m "feat: implement JWT authentication endpoints"

# After session service
git add apps/api/src/services/session_service.py
git commit -m "feat: replace in-memory sessions with database"

# After API migration
git add apps/api/api.py
git commit -m "feat: migrate API endpoints to JWT auth"

# After frontend
git add apps/web/src/services/auth.ts apps/web/src/pages/ apps/web/src/components/ProtectedRoute.tsx
git commit -m "feat: implement frontend authentication and routing"
```

**Create pull request:**
```bash
git push origin feat/phase-1-auth-database
# Create PR on GitHub
```

---

## TROUBLESHOOTING GUIDE

### Database Connection Fails
```
Error: "psycopg2.OperationalError: could not connect to server"
```
**Solution:**
1. Verify PostgreSQL running: `psql --version`
2. Check connection string in .env
3. Verify user/password correct
4. Check database exists: `psql -l | grep wincap`

### JWT Token Invalid
```
Error: "Invalid token" or "Token has expired"
```
**Solution:**
1. Check JWT_SECRET_KEY is same on all restarts
2. Verify token not tampered with in localStorage
3. Check token expiration time in settings.py

### Session Not Found After Restart
```
Error: "Session not found or expired"
```
**Solution:**
1. Verify PostgreSQL contains session data
2. Check user_id matches in session and auth token
3. Verify session hasn't expired (check expires_at timestamp)

### Circular Import Errors
```
Error: "ImportError: cannot import name X from Y"
```
**Solution:**
1. Verify import paths are correct
2. Check for circular dependencies between modules
3. Use absolute imports: `from apps.api.src.models.user import User`

---

## TESTING CHECKLIST

### Backend Tests
- [ ] `test_register_user` - Can create new account
- [ ] `test_login_user` - Can login with credentials
- [ ] `test_upload_fec` - Can upload and create session
- [ ] `test_process_fec` - Can process FEC data
- [ ] `test_session_ownership` - Can't access other user's session
- [ ] `test_session_expiration` - Expired sessions return 410
- [ ] `test_token_validation` - Invalid tokens rejected

### Frontend Tests
- [ ] Can navigate to login page
- [ ] Can register new account
- [ ] Can login with valid credentials
- [ ] Login redirects to dashboard
- [ ] Logout clears token
- [ ] Protected routes redirect to login
- [ ] API calls include Authorization header

### Integration Tests
- [ ] Full workflow: Register → Login → Upload → Process → Export
- [ ] Multi-user: Two users can't see each other's sessions
- [ ] Persistence: Restart backend, sessions still exist
- [ ] Error handling: All error cases handled gracefully

---

## DEFINITION OF DONE

Phase 1 is complete when:

✅ **All Code Written**
- [ ] Database schema created and tested
- [ ] SQLAlchemy models defined
- [ ] Auth endpoints implemented
- [ ] Session service created
- [ ] Frontend auth pages built
- [ ] API endpoints migrated

✅ **All Tests Passing**
- [ ] Backend auth tests: 100% pass rate
- [ ] Frontend auth tests: 100% pass rate
- [ ] Integration tests: 100% pass rate
- [ ] No regressions: Financial calculations identical

✅ **Code Review Complete**
- [ ] PR reviewed by at least one other engineer
- [ ] All comments addressed
- [ ] No outstanding issues

✅ **Manual Testing Complete**
- [ ] Can register → login → upload → process
- [ ] Sessions persist across server restart
- [ ] All error scenarios handled correctly
- [ ] Performance acceptable (<500ms per API call)

✅ **Documentation Updated**
- [ ] README.md updated with new setup instructions
- [ ] API documentation updated with JWT auth
- [ ] Environment variables documented
- [ ] Deployment guide updated

✅ **Deployment Ready**
- [ ] All secrets moved to environment variables
- [ ] No hardcoded credentials
- [ ] Database migrations documented
- [ ] Rollback procedure documented

---

## SUCCESS METRICS

| Metric | Target | Actual |
|--------|--------|--------|
| Phase 1 timeline | 5 days | ___ |
| Code review time | <2 hours | ___ |
| All tests passing | 100% | ___ |
| Backend test coverage | >70% | ___ |
| Frontend test coverage | >60% | ___ |
| Integration tests | 8/8 passing | ___ |
| Performance (API calls) | <500ms | ___ |
| Database queries | <50ms | ___ |
| No regressions | Yes | ___ |

---

## NEXT PHASE (Phase 2)

After Phase 1 is complete and stable for 48 hours:

- Build Report Editor UI
- Implement chat → report integration
- Build Trace Feature (click number → see source accounts)
- Add report persistence to database

See WHISPER_ROADMAP.md for Phase 2 details.

---

*This quick reference should be printed and posted by your desk during implementation.*
