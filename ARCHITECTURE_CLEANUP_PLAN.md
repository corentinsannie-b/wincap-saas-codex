# Wincap SaaS - Architecture Cleanup Plan

**Date:** 2026-01-18
**Status:** DRAFT - Ready for Implementation
**Priority:** HIGH - Blocking consistent feature development

---

## Executive Summary

The Wincap SaaS codebase has architectural inconsistencies that create technical debt:

1. **Dual Source of Truth**: Both backend (Python/FastAPI) and frontend (React) implement identical business logic (FEC parsing, P&L/Balance Sheet/Cash Flow engines)
2. **Mixed Concerns**: Frontend React app contains Node.js-only code (`pdf-converter.ts` using `child_process`)
3. **Lovable Scaffolding Pollution**: Branding, build tools, and meta tags from Lovable generator still present
4. **Doc/Config Mismatch**: README says port 5173, Vite configured for 8080

**Outcome of Fix**: Single source of truth (backend), clean frontend (UI only), professional branding, stable contracts.

---

## Part 1: Issues Verified

### 1.1 Lovable Remnants

**Files with Lovable references:**
- `apps/web/vite.config.ts` - Imports and uses `lovable-tagger` plugin (lines 4, 15)
- `apps/web/package.json` - `lovable-tagger: ^1.1.13` in devDependencies (line 86)
- `apps/web/package.json` - Project name still `vite_react_shadcn_ts` (default template name, line 2)
- Index.html has been cleaned (no meta tags), but package/config still has footprints

**Impact**: Maintains template scaffold feeling, complicates build, unclear what's generated vs. custom.

---

### 1.2 Port Configuration Mismatch

**Root README.md (line 58):**
```
npm run dev:web    # Frontend on http://localhost:5173
```

**Actual config (apps/web/vite.config.ts, line 10):**
```typescript
port: 8080,
```

**Impact**: Developer confusion, broken documentation, unclear setup instructions.

---

### 1.3 Duplicate Business Logic

**FEC Parser - Two Implementations:**
- **Backend**: `apps/api/src/parser/fec_parser.py` (~150+ lines)
  - Class-based: `FECParser` with robust error handling
  - Features: Encoding detection, delimiter auto-detection, year extraction
  - Returns: `ParseResult` with entries, errors, warnings, success_rate

- **Frontend**: `apps/web/src/modules/dd-report/parsers/fec-parser.ts` (~800+ lines)
  - Function-based: `parseFECContent()`, `parseFECXML()`, etc.
  - Same features, different implementation
  - Exported and used in front-end engines

**P&L Engine - Two Implementations:**
- **Backend**: `apps/api/src/engine/pl_builder.py`
  - Class: `PLBuilder` building `ProfitLoss` objects with trace tracking
  - Accounts for: revenue, purchases, external charges, taxes, personnel, etc.
  - Phase A tracing support for audit trail

- **Frontend**: `apps/web/src/modules/dd-report/engines/pnl-engine.ts`
  - Functions computing P&L sections with account prefixes
  - Same PCG (Plan Comptable Général) mappings
  - Chart/renderer ready output

**Balance Sheet & Cash Flow - Two Implementations:**
- `apps/web/src/modules/dd-report/engines/balance-sheet-engine.ts`
- `apps/web/src/modules/dd-report/engines/cash-flow-engine.ts`
- (Equivalents in backend: `balance_builder.py`, `cashflow_builder.py`)

**Export Renderers - Partially Duplicated:**
- **Backend**: XLSX, PDF, template exports via `src/export/`
- **Frontend**: Also implements XLSX (`xlsx-exporter.ts`), PPTX (`pptx-generator.ts`)

**Impact**:
- Divergence risk: bug fixes in one place not reflected in the other
- Larger bundle (unnecessary TS code)
- Confusion about source of truth
- Harder to test / maintain

---

### 1.4 Node.js Code in React Frontend

**File**: `apps/web/src/modules/dd-report/renderers/pdf-converter.ts`

**Code (lines 1-14):**
```typescript
import { execFile } from 'child_process';  // ← Node.js only!
import { promisify } from 'util';           // ← Node.js only!
import * as fs from 'fs';                   // ← Node.js only!
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);
```

**Functions:**
- `detectLibreOffice()` - Runs `libreoffice --version` via child_process
- `convertPPTXtoPDF()` - Executes LibreOffice CLI to convert PPTX→PDF

**Export comment** (line 42-43 in `index.ts`):
```typescript
// Note: pdf-converter.ts is server-side only (Node.js) for PPTX→PDF conversion via LibreOffice
// Import it directly when needed
```

**Problem**:
- This code **cannot run in a browser** (child_process is Node.js only)
- It IS imported in `index.ts` (exported), making it part of the public module API
- Vite build would fail or this code would be stripped at runtime
- It belongs in the backend API layer, not in React app

**Impact**: Silent failures if frontend tries to use it, confusion about capabilities.

---

### 1.5 API Contract - Type Drift

**Backend** (`apps/api/api.py`):
- Defines Pydantic models: `ProcessRequest`, `ProcessResponse`, `HealthResponse`, etc.
- FastAPI auto-generates OpenAPI schema (available at `/api/docs`)

**Frontend** (`apps/web/src/services/api.ts`):
- Manual TypeScript interfaces for same objects
- Examples (lines 13-59): `UploadResponse`, `ProcessRequest`, `ProcessResponse`, `FinancialData`
- **No generation from OpenAPI** → manual sync required → drift risk

**Impact**: If backend adds a field, frontend types are stale unless manually updated.

---

## Part 2: Recommended Architecture (V2)

```
Wincap SaaS V2
│
├── Backend (Source of Truth)
│   ├── Ingestion Layer
│   │   └── FEC Parser (auto-detect, validation)
│   │
│   ├── Processing Layer
│   │   ├── Account Mapper (PCG mapping)
│   │   ├── P&L Engine
│   │   ├── Balance Sheet Engine
│   │   ├── Cash Flow Engine
│   │   ├── KPI Calculator
│   │   └── QoE Adjustments
│   │
│   ├── Export Layer
│   │   ├── Excel Writer
│   │   ├── PDF Writer (WeasyPrint)
│   │   └── PPTX→PDF Converter (LibreOffice) ← Backend only!
│   │
│   ├── Analysis Layer
│   │   └── Deal Agent (Claude + tools)
│   │
│   └── Storage & Jobs
│       ├── PostgreSQL (persistent)
│       └── Job Queue (async exports)
│
├── Frontend (UI/Orchestration Only)
│   ├── Upload Component
│   ├── Processing Progress (polling/SSE)
│   ├── Dashboard (charts, metrics)
│   ├── Export Dialogs
│   │
│   ├── Services Layer
│   │   └── API Service (fetch calls only)
│   │       ↓ (generated from OpenAPI)
│   │
│   └── Shared Types (generated)
│
└── Contracts
    ├── OpenAPI spec (FastAPI)
    └── Generated TS types (openapi-generator)
```

---

## Part 3: Detailed Cleanup Plan

### Phase 1: Lovable & Branding Cleanup (Quick Win - 30 min)

| # | Task | Files | Action |
|---|------|-------|--------|
| 1.1 | Remove lovable-tagger plugin | `apps/web/vite.config.ts` | Delete lines 4 (import) and 15 (plugin) |
| 1.2 | Remove lovable-tagger dep | `apps/web/package.json` | Delete line 86 from devDependencies |
| 1.3 | Update package name | `apps/web/package.json` | Change name from `vite_react_shadcn_ts` to `wincap-web` |
| 1.4 | (Optional) Clean manifest | `apps/web/public/manifest.json` | Ensure `name`, `short_name` reflect Wincap |

**Verification**: `npm install` succeeds, `npm run dev` works without tagger warnings.

---

### Phase 2: Fix Documentation & Config (Quick Win - 15 min)

| # | Task | Files | Change |
|---|------|-------|--------|
| 2.1 | Fix README port | `README.md` line 58 | Change `5173` → `8080` |
| 2.2 | Update dev scripts doc | `README.md` lines 51-58 | Clarify: API on 8000, Web on 8080 |
| 2.3 | (Optional) Harmonize ports | `apps/web/vite.config.ts` line 10 | If desired, change to 5173 (standard Vite default) |

**Verification**: README matches actual port assignments.

---

### Phase 3: Consolidate Business Logic to Backend (Core Work - 2-4 hours)

#### 3.1 Verify Backend Has All Features

Run audit on Python backend:

```bash
cd apps/api
python -c "
from src.parser.fec_parser import FECParser
from src.engine.pl_builder import PLBuilder
from src.engine.balance_builder import BalanceBuilder
from src.engine.cashflow_builder import CashFlowBuilder
from src.export.excel_writer import ExcelWriter
print('✓ All core engines available in backend')
"
```

**Checklist:**
- [ ] FEC Parser (encoding, delimiter, validation)
- [ ] P&L Builder (with trace support)
- [ ] Balance Sheet Builder
- [ ] Cash Flow Builder
- [ ] KPI Calculator
- [ ] Export: Excel, PDF
- [ ] QoE support (check if in backend)

#### 3.2 Remove Duplicate TS Code

**Option A: Delete Frontend Parsers/Engines (Recommended)**

Delete:
```
apps/web/src/modules/dd-report/
  ├── parsers/fec-parser.ts         ← Backend handles FEC parsing
  ├── engines/pnl-engine.ts         ← Backend handles P&L
  ├── engines/balance-sheet-engine.ts ← Backend handles balance
  ├── engines/cash-flow-engine.ts   ← Backend handles cash flow
  ├── engines/qoe-engine.ts         ← Check if backend has QoE
  ├── analyzers/order-analyzer.ts   ← Move to backend if needed
  ├── renderers/pdf-renderer.ts     ← Backend handles rendering
  ├── renderers/pdf-exporter.ts     ← Backend handles export
  ├── renderers/xlsx-exporter.ts    ← Backend handles Excel
  ├── renderers/pptx-generator.ts   ← Backend or keep client-side?
  └── renderers/pdf-converter.ts    ← MOVE to backend (Node.js code)
```

**Keep:**
```
apps/web/src/modules/dd-report/
  ├── types/index.ts                ← RENAME/CONSOLIDATE as API types
  ├── config/colors.ts              ← UI styling only
  ├── components/                   ← Charts, dashboards (UI only)
  └── components/DDReportDashboard.tsx ← Orchestration component
```

**Steps:**
1. Verify backend has equivalents
2. Remove TS files one by one
3. Update imports in components
4. Test: `npm run build` should still work

#### 3.3 Move pdf-converter to Backend

**File**: `apps/web/src/modules/dd-report/renderers/pdf-converter.ts`

**Action**:
1. Translate `pdf-converter.ts` to Python: `apps/api/src/export/pptx_to_pdf.py`
   - Use `subprocess` instead of `child_process`
   - Keep same function signatures: `detectLibreOffice()`, `convertPPTXtoPDF()`

2. Expose via API endpoint: `POST /api/export/convert-pptx-pdf`
   ```python
   @app.post("/api/export/convert-pptx-pdf")
   async def convert_pptx_to_pdf(session_id: str, pptx_file: UploadFile):
       """Convert PPTX to PDF using LibreOffice."""
       result = await convertPPTXtoPDF(pptx_file)
       return FileResponse(result, media_type="application/pdf")
   ```

3. Delete TS version

---

### Phase 4: Type Generation & API Contract (1-2 hours)

#### 4.1 Set Up OpenAPI Type Generation

**Tool**: [`openapi-generator-cli`](https://openapi-generator.tech/) or [`typed-openapi`](https://github.com/eventuallyai/typed-openapi)

**Steps:**

1. Install in monorepo root:
   ```bash
   npm install --save-dev @openapitools/openapi-generator-cli
   ```

2. Create config: `openapi.config.json`
   ```json
   {
     "inputSpec": "http://localhost:8000/openapi.json",
     "generatorName": "typescript-fetch",
     "outputDir": "./packages/shared/generated",
     "packageName": "@wincap/api-types"
   }
   ```

3. Add npm script to root `package.json`:
   ```json
   "scripts": {
     "generate:types": "openapi-generator-cli generate -c openapi.config.json"
   }
   ```

4. Run on startup (or in CI):
   ```bash
   npm run generate:types
   ```

#### 4.2 Update Frontend to Use Generated Types

**In** `apps/web/src/services/api.ts`:

**Before:**
```typescript
export interface ProcessRequest { /* manual copy */ }
export interface ProcessResponse { /* manual copy */ }
```

**After:**
```typescript
import type { ProcessRequest, ProcessResponse } from '@wincap/api-types';
```

#### 4.3 Use Generated API Client (Optional)

If generator provides client, simplify `api.ts`:
```typescript
import { DefaultApi } from '@wincap/api-types';
export const apiClient = new DefaultApi({
  basePath: import.meta.env.VITE_API_URL || 'http://localhost:8000'
});
```

---

### Phase 5: Clean Up Shared Package (30 min)

**Goal**: Consolidate types in `packages/shared`

**Action:**
1. Create: `packages/shared/src/types/`
   - Move UI-specific types here (colors, chart configs, dashboard layout)
   - Keep business logic types in `@wincap/api-types` (generated)

2. Structure:
   ```
   packages/shared/
   ├── src/
   │   ├── types/
   │   │   ├── ui.ts          (colors, chart enums)
   │   │   └── index.ts
   │   └── index.ts
   ├── package.json
   └── tsconfig.json
   ```

3. Export from root `package.json` workspace

---

### Phase 6: Test & Validate (1-2 hours)

| # | Test | Command | Expected |
|---|------|---------|----------|
| 6.1 | Build API | `cd apps/api && python -m pytest` | All tests pass |
| 6.2 | Build Web | `cd apps/web && npm run build` | No errors, bundle size reduced |
| 6.3 | API startup | `cd apps/api && uvicorn api:app --reload` | Runs on 8000, OpenAPI at `/docs` |
| 6.4 | Web startup | `cd apps/web && npm run dev` | Runs on 8080, no TypeScript errors |
| 6.5 | Full flow | Upload FEC → Process → Export | Works end-to-end |
| 6.6 | Type generation | `npm run generate:types` | Generated files updated |
| 6.7 | Docker build | `docker-compose up` | Both services healthy |

---

## Part 4: Implementation Checklist

### Pre-Implementation
- [ ] Back up current state (git commit)
- [ ] Review and approve this plan
- [ ] Identify QoE engine location (backend or frontend?)
- [ ] Check if `pptx-generator.ts` is used client-side (charts export) or just for backend

### Phase 1: Lovable Cleanup
- [ ] Remove lovable-tagger from vite.config.ts
- [ ] Remove lovable-tagger from package.json devDeps
- [ ] Rename package to wincap-web
- [ ] Verify build succeeds

### Phase 2: Documentation
- [ ] Update README port from 5173 to 8080
- [ ] (Optional) Change Vite config to 5173 and update docs accordingly
- [ ] Update deployment docs if they mention 5173

### Phase 3: Consolidate Logic
- [ ] Audit backend has all FEC/P&L/Balance/CF/KPI features
- [ ] Check backend QoE support
- [ ] Delete frontend parsers (fec-parser.ts)
- [ ] Delete frontend engines (pnl-engine.ts, balance-sheet-engine.ts, cash-flow-engine.ts, qoe-engine.ts)
- [ ] Delete or refactor order-analyzer.ts
- [ ] Delete frontend renderers (pdf-renderer.ts, pdf-exporter.ts, xlsx-exporter.ts if applicable)
- [ ] Translate pdf-converter.ts to Python (pptx_to_pdf.py)
- [ ] Add backend endpoint `/api/export/convert-pptx-pdf`
- [ ] Delete pdf-converter.ts
- [ ] Update dd-report/index.ts exports
- [ ] Test: web/api both build and start

### Phase 4: Type Generation
- [ ] Install openapi-generator-cli
- [ ] Create openapi.config.json
- [ ] Add "generate:types" script
- [ ] Test generation: `npm run generate:types`
- [ ] Update api.ts to import from @wincap/api-types
- [ ] Remove manual type duplicates from api.ts
- [ ] Test: `npm run build` (web)

### Phase 5: Shared Package
- [ ] Create packages/shared/src/types/
- [ ] Move UI types (colors, chart) to packages/shared
- [ ] Export from packages/shared/index.ts
- [ ] Update web imports to reference packages/shared
- [ ] Verify workspaces resolution

### Phase 6: Testing
- [ ] Run API tests: `npm run test:api`
- [ ] Run Web tests: `npm run test:web`
- [ ] Build API: `cd apps/api && python -m build`
- [ ] Build Web: `npm run build`
- [ ] Start dev servers: `npm run dev`
- [ ] Test full flow (upload, process, export)
- [ ] Optional: Test Docker: `docker-compose up`

### Post-Implementation
- [ ] Document API contract (OpenAPI schema)
- [ ] Update CONTRIBUTING.md with new architecture
- [ ] Create ADR (Architecture Decision Record) documenting changes
- [ ] Deploy to staging and test

---

## Part 5: Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Backend missing feature X | Medium | High | Phase 3.1 audit checklist before deletion |
| Type generation breaks build | Low | High | Test on branch first, keep manual types as fallback |
| pptx-generator needs client-side (charts) | Medium | Medium | Check usage; might need to keep TS version for UI export |
| Deploy breaks in production | Low | High | Test on staging first, maintain previous version as fallback |
| Performance regression | Low | Medium | Profile before/after (bundle size, API latency) |

---

## Part 6: Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Phase 1: Lovable Cleanup | 30 min | Quick, low risk |
| Phase 2: Docs | 15 min | Trivial |
| Phase 3: Consolidate Logic | 2-4 hrs | Largest phase, requires testing |
| Phase 4: Type Generation | 1-2 hrs | Learning curve if new tool |
| Phase 5: Shared Package | 30 min | Straightforward |
| Phase 6: Testing | 1-2 hrs | End-to-end validation |
| **Total** | **6-10 hours** | Can be split across sprints |

---

## Part 7: Future Improvements (Post-Cleanup)

Once baseline is clean:

1. **Storage & Persistence**
   - Add PostgreSQL for session storage
   - Store processing results for auditing

2. **Async Jobs**
   - Introduce job queue (Celery/RQ) for heavy exports
   - Frontend polls `/api/jobs/{job_id}` for status

3. **Real-time Updates**
   - WebSocket endpoint for live processing progress
   - Replace polling with SSE/WebSocket

4. **API Versioning**
   - `/api/v1/` prefix for future-proofing

5. **Testing**
   - API contract tests (Pact/OpenAPI compliance)
   - E2E tests with real FEC files

6. **Monitoring**
   - Prometheus metrics
   - Error tracking (Sentry)
   - Request logging

7. **CLI Tool**
   - Maintain `main.py` CLI for batch processing

---

## Appendix A: File-by-File Deletion/Changes

### Delete Entirely

```
apps/web/src/modules/dd-report/parsers/fec-parser.ts
apps/web/src/modules/dd-report/engines/pnl-engine.ts
apps/web/src/modules/dd-report/engines/balance-sheet-engine.ts
apps/web/src/modules/dd-report/engines/cash-flow-engine.ts
apps/web/src/modules/dd-report/engines/qoe-engine.ts
apps/web/src/modules/dd-report/analyzers/order-analyzer.ts
apps/web/src/modules/dd-report/renderers/pdf-converter.ts
apps/web/src/modules/dd-report/renderers/pdf-renderer.ts
apps/web/src/modules/dd-report/renderers/pdf-exporter.ts
apps/web/src/modules/dd-report/renderers/xlsx-exporter.ts
```

### Keep & Refactor

```
apps/web/src/modules/dd-report/types/index.ts
  → Keep as UI types until generation; consolidate with @wincap/api-types

apps/web/src/modules/dd-report/config/colors.ts
  → Move to packages/shared/src/types/ui.ts

apps/web/src/modules/dd-report/components/
  → Keep all; these are pure UI (charts, dashboards)
```

### Modify

```
apps/web/vite.config.ts
  - Remove: import { componentTagger } from "lovable-tagger"
  - Remove: lovable-tagger plugin from plugins array

apps/web/package.json
  - Remove: "lovable-tagger" from devDependencies
  - Change: "name" from "vite_react_shadcn_ts" to "wincap-web"

apps/web/src/modules/dd-report/index.ts
  - Remove exports for deleted modules (fec-parser, engines, renderers except charts)
  - Remove comment about pdf-converter being server-side

apps/web/src/services/api.ts
  - Change: import types from @wincap/api-types instead of defining locally

README.md
  - Fix: "Frontend on http://localhost:5173" → "http://localhost:8080"

apps/api/api.py
  - Add: POST /api/export/convert-pptx-pdf endpoint
```

### New Files

```
apps/api/src/export/pptx_to_pdf.py
  - Translate pdf-converter.ts logic to Python

packages/shared/src/types/ui.ts
  - Colors, chart enums, dashboard types

packages/shared/tsconfig.json
  - TypeScript config for shared package

openapi.config.json
  - OpenAPI generator configuration
```

---

## Appendix B: Example PR Template (When Ready)

```markdown
## Architecture Cleanup: Single Source of Truth

**Closes**: #ISSUE_ID

### Changes

- **Lovable Cleanup**: Removed lovable-tagger, updated branding
- **Port Fix**: Updated README & Vite to clarify 8080 port
- **Consolidation**: Removed duplicate FEC/P&L/Balance/CF logic from frontend
- **Backend Move**: Migrated pdf-converter (Node.js) to API layer
- **Type Generation**: Set up OpenAPI → TypeScript generation

### Testing

- [x] API tests pass
- [x] Web builds without errors
- [x] Dev servers start (API on 8000, Web on 8080)
- [x] Full flow tested (upload → process → export)
- [x] Bundle size reduced by ~150KB (removed duplicate engines)

### Breaking Changes

None (API contracts unchanged; internal refactor only)

### Checklist

- [x] Tests added/updated
- [x] Documentation updated
- [x] No console errors/warnings
- [x] Code reviewed by team
```

---

**End of Plan**

This plan is ready for implementation. Would you like me to:
1. Start implementing Phase 1 & 2 (quick wins)?
2. Create a specific action plan for Phase 3 (consolidation)?
3. Set up Phase 4 (type generation) infrastructure?
4. Something else?
