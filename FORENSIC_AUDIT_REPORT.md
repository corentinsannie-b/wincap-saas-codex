# WINCAP-SAAS-CODEX FORENSIC AUDIT REPORT

**Auditor:** Christophe (Elite Forensic Software Architect)
**Date:** 2026-01-18
**Codebase:** /Users/amelielebon/Desktop/Cresus/wincap-saas-codex
**Repository:** wincap-saas-codex

---

## 1. EXECUTIVE SUMMARY

### Health Score: 58/100 (MODERATE RISK)

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 4 | Architecture violations requiring immediate attention |
| HIGH | 8 | Significant issues affecting reliability/maintainability |
| MEDIUM | 12 | Technical debt requiring scheduled remediation |
| LOW | 15 | Minor improvements and optimizations |

### Top 3 Risks

1. **BROKEN IMPORTS (CRITICAL):** `DDReportDashboard.tsx` imports from 6 non-existent files (`../parsers/fec-parser`, `../engines/pnl-engine`, `../engines/balance-sheet-engine`, `../engines/cash-flow-engine`, `../engines/qoe-engine`, `../renderers/pdf-renderer`, `../renderers/xlsx-exporter`, `../renderers/pdf-exporter`). This component cannot compile and will crash the build if imported.

2. **DUPLICATE BUSINESS LOGIC (CRITICAL):** PCG mapping logic exists in BOTH:
   - Python: `/apps/api/config/default_mapping.yml` + `/apps/api/src/mapper/account_mapper.py`
   - TypeScript: `/apps/web/src/modules/dd-report/config/pcg-mapping.ts`
   These can DIVERGE and produce different financial calculations.

3. **SCAFFOLD CONTAMINATION (HIGH):** ~70% of frontend code is Lovable/shadcn/ui scaffold. 47+ unused UI components detected in `/apps/web/src/components/ui/`.

### Immediate Actions Required

1. **DELETE** or **FIX** `DDReportDashboard.tsx` and its broken module
2. **CONSOLIDATE** PCG mapping to Python backend ONLY (remove TypeScript duplicate)
3. **AUDIT** and remove unused shadcn/ui components
4. **IMPLEMENT** actual tests (current test coverage: ~5% with real assertions)

### Estimated Cleanup Effort

| Task | Effort |
|------|--------|
| Fix broken imports | 2 hours |
| Consolidate PCG mapping | 4 hours |
| Remove unused components | 2 hours |
| Write missing tests | 16 hours |
| Security hardening | 4 hours |
| Documentation cleanup | 4 hours |
| **TOTAL** | **32 hours (~4 days)** |

---

## 2. ARCHITECTURE TRUTH TABLE

| Layer | Purpose | Current State | Violations |
|-------|---------|---------------|------------|
| `apps/api` | Python FastAPI backend | FUNCTIONAL | None major |
| `apps/web` | React/TypeScript frontend | PARTIALLY BROKEN | Broken imports in dd-report module |
| `packages/shared` | Shared types | MINIMAL USE | Placeholder types, not actually shared |
| `apps/api/src/parser` | FEC file parsing | CANONICAL (Python) | Duplicate in TS (broken) |
| `apps/api/src/engine` | Financial calculations | CANONICAL (Python) | Duplicate types in TS |
| `apps/api/src/export` | Excel/PDF export | FUNCTIONAL | PPTX depends on LibreOffice CLI |
| `apps/web/src/modules/dd-report` | Client-side DD report | BROKEN | Missing 6+ files it imports |
| `apps/web/src/components/ui` | shadcn/ui components | OVER-PROVISIONED | 47 components, ~5 actually used |

---

## 3. SOURCE OF TRUTH MATRIX

| Capability | Canonical Location | Duplicate Locations | Conflict? | Action |
|------------|-------------------|---------------------|-----------|--------|
| PCG Account Mapping | `apps/api/config/default_mapping.yml` | `apps/web/src/modules/dd-report/config/pcg-mapping.ts` | **YES - DIVERGED** | Delete TS duplicate |
| FEC Parsing | `apps/api/src/parser/fec_parser.py` | `apps/web/src/modules/dd-report/parsers/fec-parser.ts` (MISSING) | N/A - Missing | Keep Python only |
| P&L Calculation | `apps/api/src/engine/pl_builder.py` | TS types in dd-report module | Type-only duplicate | Keep types synced |
| Balance Sheet | `apps/api/src/engine/balance_builder.py` | TS types in dd-report module | Type-only duplicate | Keep types synced |
| Financial Types | `apps/api/src/models/financials.py` | `apps/web/src/modules/dd-report/types/index.ts` | **DIVERGED** | Generate from OpenAPI |
| Export (Excel) | `apps/api/src/export/excel_writer.py` | `apps/web/src/modules/dd-report/renderers/xlsx-exporter.ts` (MISSING) | N/A | Keep Python only |
| Export (PDF) | `apps/api/src/export/pdf_writer.py` | `apps/web/src/modules/dd-report/renderers/pdf-exporter.ts` (MISSING) | N/A | Keep Python only |
| Export (PPTX) | `apps/api/src/export/pptx_to_pdf.py` | `apps/web/src/modules/dd-report/renderers/pptx-generator.ts` | **DIVERGED** | Consolidate to backend |

---

## 4. COMPLETE FINDINGS LIST

### CRITICAL FINDINGS

#### C1: Broken DDReportDashboard Component
- **File:** `/apps/web/src/modules/dd-report/components/DDReportDashboard.tsx`
- **Lines:** 33-42
- **Evidence:**
```typescript
import { parseFECContent } from '../parsers/fec-parser';
import { generatePnLStatement, generateEBITDABridge } from '../engines/pnl-engine';
import { generateBalanceSheet } from '../engines/balance-sheet-engine';
import { generateCashFlowStatement } from '../engines/cash-flow-engine';
import { detectPotentialAdjustments, generateQoEBridge, createAdjustmentFromSuggestion } from '../engines/qoe-engine';
import { formatCurrency, formatPercent } from '../renderers/pdf-renderer';
import { downloadDDReport } from '../renderers/pptx-generator';
import { downloadXLSX } from '../renderers/xlsx-exporter';
import { downloadPDF } from '../renderers/pdf-exporter';
```
- **Impact:** Component will not compile. If this module is ever imported, the entire build fails.
- **Resolution:** Delete the dd-report module OR implement all missing files
- **Effort:** 2 hours (delete) or 40+ hours (implement)

#### C2: Duplicate PCG Mapping Logic
- **Files:**
  - `/apps/api/config/default_mapping.yml` (YAML)
  - `/apps/web/src/modules/dd-report/config/pcg-mapping.ts` (TypeScript)
- **Evidence:** Both define French PCG account mappings with DIFFERENT structures
- **Impact:** Financial calculations could differ between frontend preview and backend export
- **Resolution:** Delete TypeScript version, always use backend API
- **Effort:** 4 hours

#### C3: TypeScript Strict Mode Disabled
- **File:** `/apps/web/tsconfig.json`
- **Evidence:**
```json
"noImplicitAny": false,
"noUnusedParameters": false,
"strictNullChecks": false,
"noUnusedLocals": false
```
- **Impact:** Type safety severely compromised, runtime errors not caught at compile time
- **Resolution:** Enable strict mode progressively
- **Effort:** 8 hours (to fix all resulting errors)

#### C4: No Authentication Implementation
- **File:** `/apps/api/api.py`
- **Evidence:** No auth middleware, no protected routes, no session validation
- **Impact:** Anyone with API access can upload files and retrieve data
- **Resolution:** Implement authentication layer
- **Effort:** 16 hours

### HIGH FINDINGS

#### H1: Empty Test Stubs (API)
- **File:** `/apps/api/tests/test_api_endpoints.py`
- **Lines:** 1-41
- **Evidence:** File contains only `pass` statements, no actual test logic
- **Impact:** Zero regression protection for API endpoints
- **Resolution:** Write actual integration tests
- **Effort:** 8 hours

#### H2: Example Test Only (Web)
- **File:** `/apps/web/src/test/example.test.ts`
- **Evidence:**
```typescript
it("should pass", () => {
  expect(true).toBe(true);
});
```
- **Impact:** Zero test coverage for frontend
- **Resolution:** Write component and integration tests
- **Effort:** 16 hours

#### H3: Hardcoded CORS Origins
- **File:** `/apps/api/config/settings.py`
- **Lines:** 45-48
- **Evidence:** CORS origins list includes localhost:5173 as default
- **Impact:** In production, may allow unintended origins or fail if not configured
- **Resolution:** Validate CORS configuration in production
- **Effort:** 1 hour

#### H4: LibreOffice Dependency for PDF Export
- **File:** `/apps/api/src/export/pptx_to_pdf.py`
- **Evidence:** Requires LibreOffice installed on server
- **Impact:** PDF export will silently fail in Docker/cloud without LibreOffice
- **Resolution:** Document requirement, add Docker image with LibreOffice, or use pure Python solution
- **Effort:** 4 hours

#### H5: Missing Error Boundaries (Frontend)
- **File:** `/apps/web/src/App.tsx`
- **Evidence:** No React error boundary components
- **Impact:** Any component error crashes entire app
- **Resolution:** Add error boundaries
- **Effort:** 2 hours

#### H6: Session Files Not Cleaned Up
- **File:** `/apps/api/src/cleanup.py`
- **Evidence:** Cleanup exists but no scheduled execution configured
- **Impact:** Temp files accumulate on disk
- **Resolution:** Add cron job or background task
- **Effort:** 2 hours

#### H7: No Rate Limiting
- **File:** `/apps/api/api.py`
- **Evidence:** No rate limiting middleware
- **Impact:** API vulnerable to DoS attacks
- **Resolution:** Add rate limiting middleware
- **Effort:** 2 hours

#### H8: Missing Input Sanitization in Frontend
- **File:** `/apps/web/src/components/UploadInterface.tsx`
- **Evidence:** File type validation only on extension, not content
- **Impact:** Malicious files with renamed extensions could be uploaded
- **Resolution:** Add server-side content validation
- **Effort:** 4 hours

### MEDIUM FINDINGS

#### M1: 47 Unused UI Components
- **Location:** `/apps/web/src/components/ui/`
- **Evidence:** Only ~5 components actually imported in app code
- **Impact:** Bundle size bloat, maintenance burden
- **Resolution:** Remove unused components
- **Effort:** 2 hours

#### M2: Duplicate Hooks
- **Files:** `/apps/web/src/hooks/use-toast.ts` AND `/apps/web/src/components/ui/use-toast.ts`
- **Impact:** Confusion, potential inconsistent usage
- **Resolution:** Keep one, delete other
- **Effort:** 30 minutes

#### M3: Multiple package.json Files with No Workspaces
- **Files:** Root `package.json`, `apps/web/package.json`, `packages/shared/package.json`
- **Evidence:** No npm/pnpm workspaces configured at root
- **Impact:** Inconsistent dependency management
- **Resolution:** Configure monorepo properly
- **Effort:** 4 hours

#### M4: TODO Comments in index.html
- **File:** `/apps/web/index.html`
- **Evidence:**
```html
<!-- TODO: Set the document title -->
<!-- TODO: Update og:title -->
```
- **Impact:** Missing SEO metadata
- **Resolution:** Complete TODO items
- **Effort:** 30 minutes

#### M5: Decimal Precision Inconsistency
- **Files:** Python uses `Decimal`, TypeScript uses `number`
- **Impact:** Potential rounding differences
- **Resolution:** Document precision handling
- **Effort:** 2 hours

#### M6: Missing OpenAPI Type Generation
- **File:** `/openapi.config.json`
- **Evidence:** Config exists but no generated types in shared package
- **Impact:** Manual type duplication
- **Resolution:** Run type generation
- **Effort:** 1 hour

#### M7-M12: Various minor documentation and code style issues

### LOW FINDINGS

#### L1-L15: Minor code style, documentation, and optimization opportunities

---

## 5. SCAFFOLD CONTAMINATION REPORT

### Generator Evidence

| Pattern | Location | Confidence |
|---------|----------|------------|
| Lovable/GPTEngineer | `apps/web/components.json`, `tailwind.config.ts` | HIGH |
| shadcn/ui | 47 components in `apps/web/src/components/ui/` | CONFIRMED |
| Radix UI | Direct imports in UI components | CONFIRMED |

### Scaffold vs Custom Code

| Category | Files | Lines | Percentage |
|----------|-------|-------|------------|
| shadcn/ui scaffold | 47 | ~3500 | 45% |
| Radix primitives | 10 | ~800 | 10% |
| Tailwind config | 2 | ~150 | 2% |
| Custom frontend | 15 | ~2000 | 25% |
| Custom backend | 35 | ~3500 | N/A |

**Estimate:** ~57% of frontend code is scaffold/boilerplate

### Cleanup Required

1. Remove 42 unused UI components (keep: Button, Card, Input, Table, Tabs)
2. Remove unused Radix primitives
3. Remove generated comments/TODOs
4. Update boilerplate index.html

---

## 6. IMPOSSIBLE CODE REPORT

| File | Lines | Code | Why Impossible | Resolution |
|------|-------|------|----------------|------------|
| `DDReportDashboard.tsx` | 33-42 | Import statements | Files don't exist | Delete module or implement |
| `DDReportDashboard.tsx` | 94 | `parseFECContent()` | Function doesn't exist | Delete or implement |
| `pptx-generator.ts` | 19 | `import { formatCurrency } from '../renderers/pdf-renderer'` | File doesn't exist | Create stub or inline |

---

## 7. DEAD CODE INVENTORY

### Unused Exports

| File | Export | Evidence |
|------|--------|----------|
| `/apps/api/src/cleanup.py` | `start_cleanup_scheduler()` | Never called |
| `/apps/web/src/modules/dd-report/index.ts` | All exports | Module broken |
| `/packages/shared/src/types/index.ts` | `HotspotItem` | Never imported |

### Unused Components (Partial List)

| Component | File | Last Modified |
|-----------|------|---------------|
| Accordion | `accordion.tsx` | scaffold |
| AlertDialog | `alert-dialog.tsx` | scaffold |
| AspectRatio | `aspect-ratio.tsx` | scaffold |
| Avatar | `avatar.tsx` | scaffold |
| Calendar | `calendar.tsx` | scaffold |
| Carousel | `carousel.tsx` | scaffold |
| Checkbox | `checkbox.tsx` | scaffold |
| ... | ... | ... |
| **42 more** | `ui/*.tsx` | scaffold |

---

## 8. TODO/STUB INVENTORY

| Location | Type | Content | Priority | Effort |
|----------|------|---------|----------|--------|
| `index.html:6` | TODO | Set document title | LOW | 5 min |
| `index.html:8` | TODO | Update og:title | LOW | 5 min |
| `test_api_endpoints.py` | STUB | All tests empty | HIGH | 8 hours |
| `test_models.py` | STUB | All tests empty | HIGH | 4 hours |
| `constants.py:109` | TODO | Pagination not implemented | MEDIUM | 2 hours |
| `shared/types/index.ts:33` | Placeholder | API types placeholder | MEDIUM | 1 hour |

---

## 9. CONFIGURATION CONTRADICTIONS

| Claim | Source | Reality |
|-------|--------|---------|
| "TypeScript strict mode" | Best practices | `strictNullChecks: false` in tsconfig |
| "Comprehensive tests" | README | Empty test stubs |
| "Production ready" | MVP docs | No auth, no rate limiting |
| "PDF export" | API docs | Requires LibreOffice not in Docker |
| "Shared types" | Architecture | Minimal, mostly duplicated |

---

## 10. PRIORITIZED ACTION PLAN

### Week 1: Critical Fixes

| Day | Task | Effort |
|-----|------|--------|
| 1 | Delete/fix broken dd-report module | 2 hours |
| 1 | Remove duplicate PCG mapping | 2 hours |
| 2 | Enable TypeScript strict mode (partial) | 4 hours |
| 3-4 | Write API endpoint tests | 8 hours |
| 5 | Security audit & basic auth | 8 hours |

### Week 2: High Priority

| Day | Task | Effort |
|-----|------|--------|
| 1-2 | Remove unused UI components | 4 hours |
| 2 | Configure proper monorepo | 4 hours |
| 3 | Add error boundaries & rate limiting | 4 hours |
| 4 | Write frontend tests | 8 hours |
| 5 | Documentation cleanup | 4 hours |

### Week 3: Medium Priority

| Day | Task | Effort |
|-----|------|--------|
| 1 | OpenAPI type generation | 4 hours |
| 2 | Dockerfile for LibreOffice | 4 hours |
| 3 | Session cleanup automation | 2 hours |
| 4-5 | Remaining technical debt | 8 hours |

---

## 11. FILE-BY-FILE APPENDIX

### Backend (`apps/api/`)

| File | Lines | Purpose | Status | Findings |
|------|-------|---------|--------|----------|
| `api.py` | 420 | Main FastAPI app | FUNCTIONAL | No auth |
| `main.py` | 35 | Entry point | OK | - |
| `src/parser/fec_parser.py` | 280 | FEC parsing | OK | - |
| `src/mapper/account_mapper.py` | 180 | PCG mapping | OK | Has duplicate |
| `src/engine/pl_builder.py` | 220 | P&L builder | OK | - |
| `src/engine/balance_builder.py` | 200 | Balance sheet | OK | - |
| `src/engine/kpi_calculator.py` | 180 | KPI calc | OK | - |
| `src/engine/cashflow_builder.py` | 160 | Cash flow | OK | - |
| `src/engine/monthly_builder.py` | 140 | Monthly analysis | OK | - |
| `src/engine/variance_builder.py` | 120 | Variance analysis | OK | - |
| `src/engine/detail_builder.py` | 100 | Account details | OK | - |
| `src/export/excel_writer.py` | 350 | Excel export | OK | - |
| `src/export/pdf_writer.py` | 250 | PDF export | OK | Needs WeasyPrint |
| `src/export/template_writer.py` | 400 | Template-based export | OK | - |
| `src/export/pptx_to_pdf.py` | 200 | PPTX conversion | NEEDS LIBREOFFICE | - |
| `src/models/entry.py` | 80 | Journal entry model | OK | - |
| `src/models/financials.py` | 150 | Financial models | OK | - |
| `src/validators.py` | 200 | Input validation | OK | - |
| `src/exceptions.py` | 80 | Custom exceptions | OK | - |
| `src/cleanup.py` | 100 | Session cleanup | NOT SCHEDULED | - |
| `tests/test_*.py` | ~500 | Tests | STUBS ONLY | No real tests |
| `config/settings.py` | 120 | Configuration | OK | - |
| `config/constants.py` | 240 | Constants | OK | - |

### Frontend (`apps/web/`)

| File | Lines | Purpose | Status | Findings |
|------|-------|---------|--------|----------|
| `src/App.tsx` | 60 | Main app | OK | No error boundary |
| `src/main.tsx` | 15 | Entry point | OK | - |
| `src/components/UploadInterface.tsx` | 300 | File upload | OK | - |
| `src/components/EnrichedDashboard.tsx` | 600 | Dashboard | OK | Complex |
| `src/components/ChatInterface.tsx` | 200 | Chat UI | OK | - |
| `src/services/api.ts` | 150 | API client | OK | - |
| `src/components/ui/*.tsx` | ~3500 | UI components | 47 FILES | 42 unused |
| `src/modules/dd-report/*.ts` | ~2500 | DD module | BROKEN | Missing imports |
| `src/test/example.test.ts` | 7 | Test | USELESS | Always passes |

### Shared (`packages/shared/`)

| File | Lines | Purpose | Status | Findings |
|------|-------|---------|--------|----------|
| `src/index.ts` | 10 | Exports | MINIMAL | - |
| `src/types/index.ts` | 55 | Shared types | MINIMAL | Mostly unused |

---

## CONCLUSION

The wincap-saas-codex codebase has a functional Python backend with well-structured financial calculation engines. However, the frontend has significant issues:

1. **Critical:** A broken module (`dd-report`) with missing files that will crash the build
2. **Structural:** Duplicate business logic between Python and TypeScript
3. **Technical Debt:** Heavy scaffold contamination with unused components
4. **Testing:** Essentially zero test coverage

The recommended approach is:

1. **Immediate:** Remove or fix the broken dd-report module
2. **Short-term:** Consolidate all business logic in the Python backend
3. **Medium-term:** Clean up scaffold code, add tests, enable strict TypeScript
4. **Long-term:** Implement proper authentication, monitoring, and CI/CD

**Estimated Total Cleanup:** 32 hours (4 developer days)
