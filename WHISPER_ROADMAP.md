# WHISPER - Product Development Roadmap
## From Broken MVP to Production-Ready Deal Intelligence Workspace

**Vision:** "Whisper turns raw FEC into a deal-ready databook + an investigation assistant that helps teams reach decisions faster—without losing auditability."

**Current State:** 42/100 health score - Core financial engine excellent, infrastructure and features broken

**Target Timeline:** 4 weeks to MVP (Whisper vision-complete), 6 weeks to production-ready

---

## EXECUTIVE SUMMARY: WHAT WE HAVE vs. WHAT WE NEED

### ✅ What Works Well (Don't Change)
- FEC parsing engine (auto-encoding, error recovery)
- Multi-year financial statement builders
- KPI calculations (DSO, DPO, DIO, margins, cash conversion cycle)
- Claude AI integration with tool calling
- Basic Excel/PDF export

### 🔴 Critical Blockers (Must Fix First 48h)
1. **API authentication completely broken** - Frontend not sending X-API-Key headers to ANY endpoint
   - App.tsx process endpoint → 401
   - Dashboard summary/anomalies → 401
   - Chat interface → 401
   - Export functions → 401
2. **In-memory storage** - All data lost on server restart
3. **API key hardcoded** - Security risk, exposed in console
4. **No database** - Can't persist anything

### ❌ Missing Features (Build This Sprint)
1. **Report Editor** - Text editing + chat integration + PDF export
2. **Trace Feature** - Click any number → see source accounts & journal entries
3. **Deal Archives** - Persist completed analyses, versions, notes
4. **Team Workspaces** - User authentication, session ownership, collaboration
5. **Data Quality Warnings** - Comprehensive status + anomaly detection

### 🟠 Incomplete (Needs Enhancement)
1. **Hotspots/Anomalies** - Detected but not fully investigated
2. **Chat Memory** - Each session isolated, no cross-deal context
3. **Status Indicators** - Missing "what's wrong" warnings

---

## PHASE 0: EMERGENCY FIXES (48 Hours)
**Goal:** Make the app actually work (fix all 401 errors)

### Blockers
- [ ] Fix App.tsx - Use processFEC() instead of raw fetch
- [ ] Fix EnrichedDashboard - Use api service functions for all calls
- [ ] Fix ChatInterface - Use sendChatMessage() with proper auth
- [ ] Remove API_KEY from console.log
- [ ] Fix all missing X-API-Key headers

### Security
- [ ] Remove hardcoded default API key from api.ts
- [ ] Add VITE_API_KEY validation at build time
- [ ] Rotate exposed API keys (regenerate new ones)
- [ ] Validate ANTHROPIC_API_KEY on startup

### Testing
- [ ] Upload FEC → can process without 401
- [ ] Dashboard loads → summary and anomalies visible
- [ ] Chat works → can send messages without 401
- [ ] Export works → Excel and PDF download successfully
- [ ] No API keys in console or browser storage

**Effort:** 6 hours
**Owner:** Frontend engineer
**PR:** Critical fixes branch → main

---

## PHASE 1: MVP FOUNDATION (1 Week)
**Goal:** Production infrastructure - persistence, auth, team support

### 1.1 Database Implementation
- [ ] Set up PostgreSQL
- [ ] Create schema:
  - `users` table (id, email, hashed_password, is_active, created_at)
  - `teams` table (id, name, owner_id, created_at)
  - `sessions` table (id, user_id, team_id, created_at, expires_at, data JSONB, processed JSONB, status)
  - `deals` table (id, session_id, name, year, status, created_at, updated_at)
- [ ] Replace in-memory SESSIONS dict with database queries
- [ ] Implement session expiration with background cleanup task
- [ ] Add connection pooling

**Effort:** 2 days
**Files:**
- apps/api/src/models/session.py (new)
- apps/api/src/models/user.py (new)
- apps/api/src/models/team.py (new)
- apps/api/api.py (refactor session logic)
- apps/api/config/database.py (new)

### 1.2 User Authentication
- [ ] Add fastapi-users integration
- [ ] Implement JWT token-based auth (replace X-API-Key)
- [ ] Add user registration endpoint
- [ ] Add user login endpoint
- [ ] Add password hashing and validation
- [ ] Add token refresh mechanism
- [ ] Create user model with roles (user, admin)

**Effort:** 2 days
**Files:**
- apps/api/src/auth/ (new)
- apps/api/api.py (replace verify_api_key with current_user)

### 1.3 Session Ownership
- [ ] Tie each session to user_id
- [ ] Add session access check (verify user owns session)
- [ ] Implement soft deletes (mark as deleted, keep for audit)
- [ ] Add user-to-user sharing permissions (later phase)

**Effort:** 1 day
**Files:**
- apps/api/api.py (add permission checks to all endpoints)

### 1.4 Frontend Authentication
- [ ] Add login page (email + password)
- [ ] Implement token storage (localStorage + httpOnly cookie)
- [ ] Add Authorization header to all API calls (Bearer token)
- [ ] Redirect unauthenticated users to login
- [ ] Add logout functionality
- [ ] Add user profile page

**Effort:** 2 days
**Files:**
- apps/web/src/pages/LoginPage.tsx (new)
- apps/web/src/pages/SignupPage.tsx (new)
- apps/web/src/components/UserProfile.tsx (new)
- apps/web/src/services/auth.ts (new)
- apps/web/src/services/api.ts (update to use Bearer token)
- apps/web/src/App.tsx (add auth routing)

### 1.5 Testing
- [ ] Write authentication tests (login, token, permissions)
- [ ] Write session persistence tests
- [ ] Write user ownership tests
- [ ] Test database migration

**Effort:** 1 day

**Timeline:** Mon-Fri (5 days)
**Blockers:** None (after Phase 0)
**Risk:** Medium - changes core auth architecture

---

## PHASE 2: CORE FEATURES (1 Week)
**Goal:** Build signature Whisper features - Report editor + Trace

### 2.1 Report Editor UI
- [ ] Create Report page with:
  - [ ] Text editor (editable sections)
  - [ ] "Insert from chat" button
  - [ ] Live PDF preview
  - [ ] Export to PDF button
  - [ ] Version history dropdown
- [ ] Implement text sections (editable rich text)
- [ ] Add drag-to-reorder sections
- [ ] Add delete section button

**Effort:** 2 days
**Files:**
- apps/web/src/pages/ReportPage.tsx (new)
- apps/web/src/components/ReportEditor.tsx (new)
- apps/web/src/components/ReportPreview.tsx (new)
- apps/web/src/components/TextSection.tsx (new)

### 2.2 Report Backend Storage
- [ ] Create `reports` table (id, session_id, title, sections JSONB, version, created_at)
- [ ] Implement save report endpoint (POST /api/report)
- [ ] Implement load report endpoint (GET /api/report/{id})
- [ ] Implement list versions endpoint (GET /api/report/{id}/versions)
- [ ] Implement restore version endpoint (POST /api/report/{id}/restore/{version})

**Effort:** 1 day
**Files:**
- apps/api/src/models/report.py (new)
- apps/api/api.py (add report endpoints)

### 2.3 Chat → Report Integration
- [ ] Add "Insert to report" button in Chat interface
- [ ] Parse chat response into report section
- [ ] Send section to backend
- [ ] Update report in editor in real-time

**Effort:** 1 day
**Files:**
- apps/web/src/components/ChatInterface.tsx (add insert button)
- apps/web/src/services/api.ts (add insertToReport method)
- apps/api/api.py (add endpoint to add section)

### 2.4 Trace Feature (Click → Accounts)
- [ ] Modify P&L/Balance/KPI builders to store account mappings
  - For each line item (Revenue, EBITDA, etc.), store:
    - `source_accounts: [401xxx, 411xxx]` (GL codes)
    - `journal_entries: [{date, account, debit/credit, narrative}, ...]`
- [ ] Add click handler to dashboard numbers (Summary tab)
- [ ] Create Trace detail modal showing:
  - [ ] Line item name
  - [ ] Formula used
  - [ ] Source GL accounts
  - [ ] Journal entries table (date, account, amount, narrative)
  - [ ] Filter by date range
  - [ ] Export to Excel
- [ ] Add breadcrumb navigation ("Revenue > 401000 > entry details")

**Effort:** 2 days
**Files:**
- apps/api/src/models/trace_data.py (new)
- apps/api/src/engine/ (modify builders to track lineage)
- apps/web/src/components/TraceModal.tsx (new)
- apps/web/src/components/SummaryTab.tsx (add click handlers)

### 2.5 Testing
- [ ] Report CRUD tests
- [ ] Chat → Report insertion tests
- [ ] Trace data accuracy tests
- [ ] End-to-end report workflow test

**Effort:** 1 day

**Timeline:** Mon-Fri (5 days)
**Blockers:** Phase 1 complete
**Risk:** Medium - complex data lineage tracking

---

## PHASE 3: TEAM FEATURES (1 Week)
**Goal:** Multi-user support, collaboration, deal archives

### 3.1 Deal Archives
- [ ] Create Deal object that groups:
  - Sessions (multiple if re-run with new years)
  - Reports (versions)
  - Chat history
  - Input files
  - Metadata (company, years, status, notes)
- [ ] Implement list deals page (dashboard showing all past deals)
- [ ] Implement deal detail page (see all versions, notes, outputs)
- [ ] Add deal tagging system (client, status, risk level)
- [ ] Add deal search (company name, date range)

**Effort:** 2 days
**Files:**
- apps/api/src/models/deal.py (new)
- apps/web/src/pages/DealsListPage.tsx (new)
- apps/web/src/pages/DealDetailPage.tsx (new)
- apps/web/src/components/DealCard.tsx (new)

### 3.2 Team Workspaces
- [ ] Create Team management page
- [ ] Add "Create team" workflow
- [ ] Implement team invitation system (email invites)
- [ ] Add role-based access (owner, analyst, viewer)
- [ ] Scope all deals to teams
- [ ] Add team switcher in navigation

**Effort:** 2 days
**Files:**
- apps/web/src/pages/TeamSettingsPage.tsx (new)
- apps/web/src/components/InviteTeamMember.tsx (new)
- apps/api/src/auth/permissions.py (new - role checks)

### 3.3 Data Quality Dashboard
- [ ] Add status indicators showing:
  - Missing years (e.g., "2021-2023 data, missing 2024")
  - Data consistency warnings
  - Anomalies detected
  - Parse errors (if any)
- [ ] Create warnings panel with:
  - Yellow flags (unusual ratios, spikes)
  - Red flags (potential issues)
  - Data completeness %
- [ ] Implement warning dismissal (mark as reviewed)

**Effort:** 1 day
**Files:**
- apps/api/src/engine/validators.py (new - comprehensive checks)
- apps/web/src/components/StatusPanel.tsx (new)
- apps/api/api.py (add /api/data/{id}/warnings endpoint)

### 3.4 Shared Reports
- [ ] Add report sharing (mark as shareable)
- [ ] Generate shareable link with view-only access
- [ ] Add view-only report interface
- [ ] Track report access (who viewed, when)

**Effort:** 1 day

### 3.5 Testing
- [ ] Team CRUD tests
- [ ] Permission/authorization tests
- [ ] Multi-user concurrent access tests

**Effort:** 1 day

**Timeline:** Mon-Fri (5 days)
**Blockers:** Phase 1 complete
**Risk:** Low - straightforward feature additions

---

## PHASE 4: POLISH & PRODUCTION (1 Week)
**Goal:** Tests, optimization, deployment readiness

### 4.1 Testing
- [ ] Achieve 80%+ backend test coverage
- [ ] Achieve 70%+ frontend test coverage
- [ ] Add integration tests for full workflows
- [ ] Add performance tests (large file handling, 100+ concurrent users)
- [ ] Add security tests (SQL injection, XSS, CSRF, auth bypass)

**Effort:** 2 days
**Files:** apps/api/tests/, apps/web/src/__tests__/

### 4.2 Performance Optimization
- [ ] Profile FEC parsing (speed benchmarks)
- [ ] Profile statement builders (multi-year, large datasets)
- [ ] Add query optimization (database indexes)
- [ ] Implement pagination for large result sets
- [ ] Add caching layer (Redis for frequently calculated KPIs)
- [ ] Optimize frontend bundle (code splitting, lazy loading)

**Effort:** 1 day

### 4.3 Documentation
- [ ] Delete all AI-generated docs (20+ files)
- [ ] Write deployment guide (Docker, environment setup)
- [ ] Write API documentation (OpenAPI/Swagger)
- [ ] Write troubleshooting guide
- [ ] Write user guide (how to use Whisper)
- [ ] Write architecture documentation

**Effort:** 1 day

### 4.4 DevOps/Deployment
- [ ] Dockerize both frontend and backend
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure staging environment
- [ ] Set up production environment
- [ ] Implement health checks
- [ ] Set up monitoring/alerting
- [ ] Configure backups

**Effort:** 1 day

### 4.5 Security Audit
- [ ] Re-run Christophe audit on new code
- [ ] Penetration testing
- [ ] Rate limiting implementation
- [ ] CORS hardening
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] SSL/TLS certificate setup

**Effort:** 1 day

**Timeline:** Mon-Fri (5 days)
**Blockers:** Phase 3 complete
**Risk:** Low - standard practices

---

## SUCCESS CRITERIA (Vision Complete)

After Phase 4, Whisper should have:

### Interface ✅
- [ ] Deal/Company page with upload area
- [ ] Status panel showing data quality, warnings, missing data
- [ ] All required tabs:
  - [ ] Summary (KPIs, trends, clickable for trace)
  - [ ] Databook (tables, downloadable Excel)
  - [ ] Hotspots (anomalies, outliers, explained)
  - [ ] Trace (click any number → see accounts & entries)
  - [ ] Report (editable text, chat integration, PDF export)
- [ ] Right-side Chat panel (context-aware, memory of conversation)

### Capabilities ✅
- [ ] Speed: FEC → databook + insights in <2 minutes
- [ ] Credibility: Every figure traceable to source accounts
- [ ] Investigation: Answer "why did margin drop?" by tracing drivers
- [ ] Narrative: Draft executive summary, red flags, observations
- [ ] Team Leverage: Juniors get answers without pinging managers

### Data ✅
- [ ] FEC parsing with auto-encoding
- [ ] Multi-year comparative statements
- [ ] KPI calculations with accuracy
- [ ] Persistent storage across restarts
- [ ] User/team workspaces with permissions

### Deployment ✅
- [ ] Production-ready infrastructure
- [ ] No hardcoded secrets
- [ ] 80%+ test coverage
- [ ] Security audit passed
- [ ] Monitoring/alerting active
- [ ] Can handle 100+ concurrent users

---

## RISK MITIGATION

### High Risk Items
1. **Trace Feature complexity** - Storing account lineage requires careful modeling
   - Mitigation: Start with simple case (single GL accounts), expand incrementally
2. **Auth migration** - Moving from API key to JWT is breaking change
   - Mitigation: Support both during transition period
3. **Database migrations** - Moving from in-memory to persistent
   - Mitigation: Test extensively with production-like data volumes

### Medium Risk Items
1. **Team collaboration features** - Multi-user concurrency needs careful handling
   - Mitigation: Use row-level security, optimistic locking
2. **Report versioning** - Tracking changes requires good data model
   - Mitigation: Use event sourcing approach

### Low Risk Items
1. **UI components** - Most are standard patterns
2. **Export functions** - Already partially working

---

## RESOURCE ESTIMATE

| Phase | Frontend | Backend | DevOps | QA | Total |
|-------|----------|---------|--------|-----|--------|
| 0 (Emergency) | 3h | 2h | - | 1h | 6h |
| 1 (Foundation) | 3d | 3d | 1d | 1d | 8d |
| 2 (Core Features) | 3d | 2d | - | 2d | 7d |
| 3 (Team) | 2d | 2d | - | 1d | 5d |
| 4 (Polish) | 2d | 2d | 1d | 2d | 7d |
| **TOTAL** | **10d** | **11d** | **2d** | **7d** | **30d** |

**Team Composition:**
- 1 Full-stack engineer (or 1 FE + 1 BE)
- 1 DevOps engineer (part-time for Phase 4)
- 1 QA engineer (throughout)

**Timeline:**
- Phase 0: 1 day (critical path)
- Phase 1-4: 4 weeks in parallel
- **Total to MVP: 5 weeks**
- **Total to Production: 6 weeks**

---

## ROADMAP MILESTONES

### Week 1
- [ ] **Day 1 (Thu-Fri):** Emergency fixes (Phase 0) + deploy to staging
- [ ] **Mon:** Phase 1 database setup begins
- [ ] **Tue-Wed:** User auth implementation
- [ ] **Thu-Fri:** Session persistence complete

### Week 2
- [ ] **Mon-Tue:** Phase 2 report editor UI
- [ ] **Wed:** Chat → Report integration
- [ ] **Thu-Fri:** Trace feature begin

### Week 3
- [ ] **Mon-Tue:** Trace feature complete
- [ ] **Wed-Thu:** Phase 3 deal archives
- [ ] **Fri:** Team workspaces begin

### Week 4
- [ ] **Mon-Tue:** Team features complete
- [ ] **Wed-Thu:** Phase 4 testing + optimization
- [ ] **Fri:** Security audit + final polish

### Week 5
- [ ] **Mon-Tue:** Deployment setup
- [ ] **Wed:** Staging deployment
- [ ] **Thu-Fri:** Production deployment + monitoring

---

## CRITICAL SUCCESS FACTORS

1. **Fix Phase 0 immediately** - Everything else depends on this working
2. **Database-first approach** - Don't wait on auth to implement persistence
3. **Test as you go** - Don't accumulate technical debt
4. **API contracts first** - Define API contracts before implementation
5. **User feedback early** - Get team using it by end of Phase 1
6. **Security review each phase** - Don't discover vulnerabilities in Week 6

---

## CURRENT STATE SNAPSHOT

**As of January 18, 2026:**
- Health Score: 42/100
- Core Business Logic: ✅ Excellent
- Infrastructure: 🔴 Critical
- Features: 60% complete
- Tests: 15% coverage

**After Phase 0:**
- Health Score: 75/100 (if tests pass)
- Core Business Logic: ✅ Still excellent
- Infrastructure: 🔴 Still broken (will fix in Phase 1)
- Features: 60% complete
- Tests: 15% coverage

**After Phase 4:**
- Health Score: 92/100
- Core Business Logic: ✅ Enhanced with tracing
- Infrastructure: ✅ Production-ready
- Features: 100% complete (MVP)
- Tests: 80%+ coverage

---

## GO/NO-GO DECISION POINTS

**Go to Phase 1 if:**
- [ ] All Phase 0 bugs fixed and tested
- [ ] App functions without 401 errors
- [ ] Security review passed
- [ ] No regressions in financial calculations

**Go to Phase 2 if:**
- [ ] Database migrations tested with >100k records
- [ ] User auth working end-to-end
- [ ] Session persistence verified across restarts
- [ ] No data loss in migration

**Go to Phase 3 if:**
- [ ] Report editor saves/loads correctly
- [ ] Trace feature accurate on sample data
- [ ] 70%+ of test cases passing

**Go to Phase 4 if:**
- [ ] Team features working with multiple users
- [ ] Deal archives showing all data correctly
- [ ] No concurrent access race conditions

**Go to Production if:**
- [ ] All tests passing
- [ ] Security audit clean
- [ ] Load testing shows <200ms response time at 100 users
- [ ] Product walkthrough with stakeholders approved

---

*This roadmap balances urgency (fix critical bugs immediately) with ambition (build complete Whisper vision in 4 weeks). Success requires disciplined execution and NO scope creep beyond these phases.*
