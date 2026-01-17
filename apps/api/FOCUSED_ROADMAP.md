# Wincap SaaS - Focused Development Roadmap

**Current Status**: Phase 1-4 Complete (Security, CLI, Testing, Documentation)
**Recent Work**: Implemented 4 critical bug fixes from exhaustive audit
**Next Phase**: Production Hardening & MVP Launch

---

## Phase 5: Production Hardening (4-5 weeks)

### Week 1: Robustness & Validation (8-10 hours)

**Priority 1: Fix Template Writer Bug** (1 hour)
- File: `src/export/template_writer.py:154`
- Issue: `int(entry.account_num)` fails with alphanumeric codes
- Fix: Extract numeric part or keep as string
- Impact: Enables template export for all account types
- Status: Ready to implement

**Priority 2: Add Input Validation to Builders** (3 hours)
- Files: `src/engine/*.py` (pl_builder, balance_builder, kpi_calculator)
- Add defensive checks:
  - Validate entries list not empty
  - Validate year is reasonable (1900-2100)
  - Validate all entries are JournalEntry type
  - Clear error messages on failure
- Impact: Prevents silent failures, better debugging
- Status: Ready to implement

**Priority 3: Make Models Immutable** (2 hours)
- Files: `src/models/financials.py`
- Add `frozen=True` to dataclasses: ProfitLoss, BalanceSheet, KPIs
- Update tests if needed
- Impact: Thread safety, prevents accidental mutations
- Status: Ready to implement

**Subtotal Week 1**: ~8-10 hours → **1 commit**

---

### Week 2: Scalability & Session Management (10-12 hours)

**Priority 4: Redis Session Backend** (4 hours)
- Add optional Redis support in `api.py`:
  - Try Redis connection on startup
  - Fall back to in-memory if unavailable
  - Store sessions with TTL equal to SESSION_TTL_HOURS
  - Keep SESSIONS dict as fallback for development
- Impact: Enables horizontal scaling, persistent sessions across restarts
- Environment: `REDIS_URL=redis://localhost:6379` (optional)
- Status: Ready to implement

**Priority 5: Complete Test Suite** (3-4 hours)
- Fix remaining test failures from fixtures update
- Add tests for:
  - Thread-safe SESSIONS access
  - Cleanup task scheduling
  - Effective year consistency
- Target: 85+ tests passing
- Status: Ready to implement

**Priority 6: API Documentation** (2-3 hours)
- Generate OpenAPI/Swagger docs
- Document all 7 endpoints with examples
- Add authentication/authorization design docs
- Status: Ready to implement

**Subtotal Week 2**: ~10-12 hours → **2 commits**

---

### Week 3: Security Foundation (12-14 hours)

**Priority 7: Add Authentication** (8-10 hours)
- Implement JWT token-based auth:
  - `/api/auth/login` - Get JWT token
  - `/api/auth/refresh` - Refresh expired token
  - Add `Authorization: Bearer <token>` to all endpoints
  - Store API keys in config/secrets
- Impact: Protects API from unauthorized access
- Status: Ready to design

**Priority 8: Add Rate Limiting** (2-3 hours)
- Use `slowapi` library
- Set limits:
  - `/api/upload`: 10 per minute per IP
  - `/api/process`: 5 per minute per IP
  - Other endpoints: 100 per minute per IP
- Impact: Prevents abuse, protects against DoS
- Status: Ready to implement

**Priority 9: Add Request Validation** (1-2 hours)
- Pydantic validation for all request bodies
- Input sanitization for filenames, company names
- File upload validation (already done, enhance)
- Status: Ready to implement

**Subtotal Week 3**: ~12-14 hours → **2 commits**

---

### Week 4: Deployment & Monitoring (8-10 hours)

**Priority 10: Dockerize for Deployment** (3-4 hours)
- Create production Dockerfile (already exists, test it)
- Create docker-compose.yml for local development
- Create docker-compose.prod.yml for staging
- Test full stack: API + optional Redis
- Status: Ready to implement

**Priority 11: Add Monitoring & Logging** (3-4 hours)
- Structured logging (JSON format)
- Health check endpoint (already exists, enhance)
- Add metrics endpoint for Prometheus
- Add request tracing via X-Request-ID header
- Status: Ready to implement

**Priority 12: Create Production Checklist** (1-2 hours)
- Environment variables checklist
- Database setup guide
- Backup strategy
- Security audit checklist
- Status: Ready to implement

**Subtotal Week 4**: ~8-10 hours → **2 commits**

---

## Phase 6: MVP Features (Weeks 5+)

### High-Impact, Lower-Effort Features (4-6 weeks)

**Feature 1: Async FEC Parsing** (8 hours)
- Enable concurrent file uploads
- Speed up large file processing (50MB+)
- Impact: 2-3x faster processing

**Feature 2: Caching Layer** (8 hours)
- Cache KPI calculations
- Cache account mappings
- Impact: 50%+ faster API responses for repeated queries

**Feature 3: Database Persistence** (20 hours)
- PostgreSQL backend for sessions
- Store processing history
- Enable audit trail
- Impact: Complete data persistence

**Feature 4: WebSocket Real-Time Updates** (12 hours)
- Stream processing progress to frontend
- Live KPI updates
- Impact: Better UX for long operations

---

## Estimated Timeline

| Phase | Duration | Effort | Output |
|-------|----------|--------|--------|
| **Phase 5 (Hardening)** | 4 weeks | 38-46 hours | Production-ready API |
| **Phase 6 (MVP Features)** | 6 weeks | 48-60 hours | Full-featured platform |
| **Total to MVP** | **10 weeks** | **86-106 hours** | **Live product** |

---

## Success Metrics

### Phase 5 Completion Criteria
- ✅ All 85+ tests passing
- ✅ API secured with JWT auth
- ✅ Rate limiting active
- ✅ Dockerized and tested
- ✅ Monitoring/logging active
- ✅ Zero critical bugs from audit

### Phase 6 Completion Criteria
- ✅ Async processing working
- ✅ KPI caching reducing latency by 50%+
- ✅ Database backend persistent
- ✅ WebSocket streaming functional
- ✅ Load testing: 100 concurrent users

---

## Technology Stack (Locked)

- **Framework**: FastAPI 0.109+
- **Python**: 3.10+ (3.9 compatible)
- **Database**: PostgreSQL (optional, via SQLAlchemy)
- **Cache**: Redis (optional, with in-memory fallback)
- **Auth**: JWT (PyJWT)
- **Rate Limiting**: slowapi
- **Async**: asyncio (built-in)
- **Testing**: pytest with 85+ tests
- **Deployment**: Docker + Docker Compose

---

## Development Workflow

```bash
# Week 1-4 iterations:
1. Pick priority from roadmap
2. Implement on feature branch
3. Run tests locally
4. Create PR with clear description
5. Merge to main
6. Push to GitHub
7. Note completion in this document

# Commit message format:
[PHASE5-W1] Fix template writer alphanumeric accounts
[PHASE5-W2] Add Redis session backend
[PHASE5-W3] Implement JWT authentication
[PHASE5-W4] Dockerize application stack
```

---

## Current Blockers

None - all Phase 5 items are ready to implement.

---

## Decision Points

### Decision 1: Database Backend
- **Option A**: Keep in-memory sessions (current)
- **Option B**: Add Redis (Phase 5)
- **Option C**: Add PostgreSQL (Phase 6)
- **Recommendation**: Phase 5 = Redis optional, Phase 6 = PostgreSQL required

### Decision 2: Authentication Scope
- **Option A**: API-key only (simple)
- **Option B**: JWT + Refresh tokens (recommended)
- **Option C**: Full OAuth2 (defer to Phase 7)
- **Recommendation**: JWT for Phase 5

### Decision 3: Frontend Integration
- **Option A**: Standalone API only
- **Option B**: Include React frontend (Phase 6)
- **Option C**: Defer frontend to Phase 7
- **Recommendation**: Phase 5 = API ready, Phase 6 = Begin frontend

---

## Notes for Next Session

- All Phase 5 Week 1 items are "ready to implement" (no research needed)
- Critical fixes from audit are complete and committed
- Test fixtures are now correct
- Session cleanup is automatic every 6 hours
- Effective year consistency is fixed
- Thread-safe session access is enabled
- Next step: Start Phase 5 Week 1 implementation
