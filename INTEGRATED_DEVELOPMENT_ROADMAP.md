# Integrated Development Roadmap
## Wincap SaaS Codex: Audit Fixes + UI Redesign

**Status**: Comprehensive Planning (No Implementation Started)
**Date**: January 18, 2026
**Current Health Score**: 4/10 ⚠️ (See: CHRISTOPHE_FORENSIC_AUDIT_FINAL.md)

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Phase 1: Critical Audit Fixes (Weeks 1-2)](#phase-1-critical-audit-fixes-weeks-1-2)
3. [Phase 2: High-Priority Audit Fixes (Weeks 3)](#phase-2-high-priority-audit-fixes-week-3)
4. [Phase 3: Foundation for UI Redesign (Week 4)](#phase-3-foundation-for-ui-redesign-week-4)
5. [Phase 4: UI Component Library (Weeks 5-6)](#phase-4-ui-component-library-weeks-5-6)
6. [Phase 5: Page Redesigns (Weeks 7-8)](#phase-5-page-redesigns-weeks-7-8)
7. [Phase 6: Testing & Polish (Weeks 9-10)](#phase-6-testing--polish-weeks-9-10)
8. [Timeline Overview](#timeline-overview)
9. [Resource Requirements](#resource-requirements)
10. [Success Criteria](#success-criteria)

---

## Executive Summary

### Current State
- **Health Score**: 4/10 (CRITICAL ISSUES PRESENT)
- **Key Problems**:
  - No authentication (security risk)
  - Broken frontend imports (build failure)
  - Race conditions in sessions (data corruption)
  - 0% frontend test coverage
  - Duplicate code (PCG mapping)

### Target State (10 weeks)
- **Health Score**: 8/10 (Production-Ready)
- **Deliverables**:
  - ✅ All critical security/stability issues fixed
  - ✅ 80%+ frontend test coverage
  - ✅ Complete UI redesign (dark mode, 7-tab dashboard)
  - ✅ Professional financial report interface
  - ✅ Ready for production deployment

### Approach
**Phase 1-3 (Weeks 1-4)**: Fix audit findings (stabilize codebase)
**Phase 4-6 (Weeks 5-10)**: Implement UI redesign (improve experience)

This ensures we're working on a stable foundation before investing in UI improvements.

---

## PHASE 1: CRITICAL AUDIT FIXES (Weeks 1-2)

### Goal
Stop all existential risks. The app must be secure and stable.

---

### WEEK 1: Critical Security & Stability

#### Task 1.1: Fix Broken DDReportDashboard [BLOCKING]
**Priority**: CRITICAL | **Effort**: 8 hours

**Current State**:
- `apps/web/src/modules/dd-report/components/DDReportDashboard.tsx` has 6 broken imports
- App won't compile if this component is imported
- Status: Unknown if actually used

**Decision Needed**:
- **Option A**: Delete the broken component (1 hour)
  - If module is abandoned/unused
  - Safest approach for MVP

- **Option B**: Implement all 6 missing modules (8 hours)
  - If component needed for future
  - Creates technical debt upfront

**Recommendation**: **Option A (DELETE)** for MVP stability

**Action Items**:
```
1. Check if DDReportDashboard is imported in App.tsx
2. If yes, remove the import
3. Delete the entire components/DDReportDashboard.tsx file
4. Run: npm run build (should succeed)
5. Verify no import errors in console
```

**Acceptance Criteria**:
- ✅ `npm run build` completes without errors
- ✅ No broken imports in codebase
- ✅ No console warnings about missing modules

---

#### Task 1.2: Implement API Authentication Layer [CRITICAL]
**Priority**: CRITICAL | **Effort**: 12 hours | **Backend**

**Current State**:
- All endpoints are public (no auth checks)
- Anyone can upload/process/export files
- Security disaster waiting to happen

**Implementation Approach** (API Key - MVP minimum):

**File**: `apps/api/middleware/auth.py` (NEW)
```python
from fastapi import HTTPException, Request
from config.settings import settings

async def require_api_key(request: Request):
    """Verify API key in Authorization header"""
    auth_header = request.headers.get("X-API-Key")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")

    if auth_header != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return auth_header
```

**File**: `apps/api/api.py` (MODIFY)
```python
from fastapi import Depends
from middleware.auth import require_api_key

@app.post("/api/upload")
async def upload_file(api_key: str = Depends(require_api_key)):
    # Now protected - must include X-API-Key header
    ...

@app.post("/api/process")
async def process_file(api_key: str = Depends(require_api_key)):
    # Now protected
    ...

@app.get("/api/export/xlsx/{session_id}")
async def export_xlsx(session_id: str, api_key: str = Depends(require_api_key)):
    # Now protected
    ...
```

**File**: `.env` (UPDATE)
```
# Add:
API_KEY=your-secure-api-key-here
```

**File**: `.env.example` (UPDATE)
```
# Add:
API_KEY=development-api-key-change-in-production
```

**Testing**:
```bash
# Without key (should fail):
curl -X POST http://localhost:8000/api/upload

# With key (should work):
curl -X POST http://localhost:8000/api/upload \
  -H "X-API-Key: your-secure-api-key-here"
```

**Acceptance Criteria**:
- ✅ All endpoints require X-API-Key header
- ✅ Invalid/missing key returns 401
- ✅ Valid key allows access
- ✅ Tests verify auth on each endpoint
- ✅ API key is environment-configurable

---

#### Task 1.3: Add Thread-Safe Session Management
**Priority**: HIGH | **Effort**: 2 hours | **Backend**

**Current State**:
- `SESSIONS_LOCK` imported but never used
- Race conditions possible under concurrent load
- Data corruption risk

**Fix**: Use the lock consistently

**File**: `apps/api/api.py` (MODIFY)

```python
# EXISTING (Line 73-74):
SESSIONS = {}
SESSIONS_LOCK = threading.Lock()

# UPDATE ALL SESSION ACCESS:

@app.post("/api/process")
async def process_file(session_id: str, data: ProcessRequest):
    # ✅ Lock when reading/writing
    with SESSIONS_LOCK:
        if session_id not in SESSIONS:
            raise HTTPException(status_code=404)
        SESSIONS[session_id]["processing"] = True

    # Long-running work (OUTSIDE lock to not block other requests)
    try:
        results = await expensive_processing(data)
    except Exception as e:
        with SESSIONS_LOCK:
            SESSIONS[session_id]["error"] = str(e)
        raise

    # ✅ Lock when writing results
    with SESSIONS_LOCK:
        SESSIONS[session_id]["results"] = results
        SESSIONS[session_id]["processing"] = False
        SESSIONS[session_id]["completed_at"] = datetime.now()

# Apply to ALL endpoints that touch SESSIONS dict
```

**Acceptance Criteria**:
- ✅ All SESSIONS access wrapped in `with SESSIONS_LOCK`
- ✅ Concurrent request test passes
- ✅ No data corruption with parallel requests
- ✅ Tests verify thread-safe access

---

#### Task 1.4: Remove Unused Dependencies
**Priority**: MEDIUM | **Effort**: 2 hours | **Frontend**

**Current State**:
- 130+ KB of unused packages installed
- Bloats bundle size
- Increases attack surface

**Packages to Remove**:
```
Frontend (npm):
- @tanstack/react-query (19 KB) - Installed but not used
- embla-carousel-react (25 KB) - No carousel
- framer-motion (50+ KB) - No animations
- next-themes (4 KB) - No dark mode toggle
- date-fns (30+ KB) - No date picker
```

**Action**:
```bash
cd apps/web
npm uninstall @tanstack/react-query embla-carousel-react framer-motion next-themes date-fns

# Verify build still works:
npm run build

# Check size reduction:
du -sh dist/
```

**Backend**:
```bash
# In apps/api/requirements.txt
# Remove: matplotlib (8 MB, never used)
```

**Acceptance Criteria**:
- ✅ All listed packages removed
- ✅ `npm run build` succeeds
- ✅ Bundle size reduced by 130+ KB
- ✅ No console errors about missing modules

---

### WEEK 2: Additional Critical Fixes

#### Task 2.1: Create Missing PDF Renderer
**Priority**: HIGH | **Effort**: 2 hours | **Frontend**

**Current State**:
- `pptx-generator.ts` imports from `pdf-renderer.ts`
- `pdf-renderer.ts` doesn't exist
- Build succeeds because `pptx-generator` isn't imported yet
- Will fail once someone uses it

**File**: `apps/web/src/modules/dd-report/renderers/pdf-renderer.ts` (NEW)

```typescript
/**
 * PDF formatting utilities for financial reports
 */

/**
 * Format number as French currency (€)
 * @example formatCurrency(50000) => "50 000,00 €"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format decimal as percentage
 * @example formatPercent(0.395) => "39,5%"
 */
export function formatPercent(value: number): string {
  const percentage = (value * 100).toFixed(1).replace('.', ',');
  return `${percentage}%`;
}

/**
 * Format variance between two numbers
 * @example formatVariation(19260, 19760) => "-2.5%"
 */
export function formatVariation(current: number, previous: number): string {
  if (previous === 0) return 'N/A';
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}

/**
 * Format number with thousands separator (French style)
 * @example formatNumber(50000) => "50 000"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format decimal as percentage with sign
 * @example formatPercentWithSign(0.39) => "+39%"
 */
export function formatPercentWithSign(value: number): string {
  const percentage = Math.round(value * 100);
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage}%`;
}
```

**Acceptance Criteria**:
- ✅ All formatting functions implemented
- ✅ Functions tested with sample data
- ✅ pptx-generator imports resolve
- ✅ Build succeeds without errors

---

#### Task 2.2: Validate Session ID Format Explicitly
**Priority**: MEDIUM | **Effort**: 1 hour | **Backend**

**Current State**:
- Session ID accepted from URL without explicit validation
- Implicit validation via Pydantic UUID type
- Should be explicit for security clarity

**File**: `apps/api/api.py` (MODIFY)

```python
from uuid import UUID

@app.get("/api/export/xlsx/{session_id}")
async def export_xlsx(session_id: str, api_key: str = Depends(require_api_key)):
    # Explicit validation before path construction
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    # Now safe to use session_uuid
    session_dir = Path(settings.UPLOAD_TEMP_DIR) / str(session_uuid)
    # ...
```

**Acceptance Criteria**:
- ✅ Session ID validated as UUID
- ✅ Invalid format returns 400
- ✅ Test with malicious session ID fails safely

---

#### Task 2.3: Harden Subprocess Calls (LibreOffice)
**Priority**: MEDIUM | **Effort**: 1 hour | **Backend**

**Current State**:
- `pptx_to_pdf.py` calls LibreOffice with user-influenced paths
- Paths are sanitized but not explicitly validated
- Should add defensive checks

**File**: `apps/api/src/export/pptx_to_pdf.py` (MODIFY)

```python
from pathlib import Path

def convert_pptx_to_pdf(input_file: Path, output_dir: Path) -> Path:
    """Convert PPTX to PDF, with path validation"""

    # Validate paths are within temp directory
    temp_base = Path(settings.UPLOAD_TEMP_DIR).resolve()
    input_resolved = input_file.resolve()
    output_resolved = output_dir.resolve()

    # Ensure paths don't escape temp directory
    try:
        input_resolved.relative_to(temp_base)
        output_resolved.relative_to(temp_base)
    except ValueError:
        raise ValueError("Path escape attempt detected")

    # Now safe to use in subprocess
    cmd = [
        lo_path,
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', str(output_resolved),
        str(input_resolved),
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=300, text=True)
    # ...
```

**Acceptance Criteria**:
- ✅ Paths validated before subprocess call
- ✅ Path traversal attempts blocked
- ✅ Test with `../` in paths fails safely

---

## PHASE 2: HIGH-PRIORITY AUDIT FIXES (Week 3)

### Goal
Clean up architecture and remove duplicate code.

---

#### Task 3.1: Remove Duplicate PCG Mapping
**Priority**: HIGH | **Effort**: 6 hours | **Backend + Frontend**

**Current State**:
- PCG mapping exists in TWO places:
  - Backend: `apps/api/config/default_mapping.yml` (227 lines, YAML)
  - Frontend: `apps/web/src/modules/dd-report/config/pcg-mapping.ts` (280 lines, TS)
- No sync mechanism = future divergence risk
- Frontend has extra department data not in backend

**Solution**: Single source of truth via API

**Step 1**: Create API endpoint in `apps/api/api.py`

```python
@app.get("/api/config/pcg-mapping")
async def get_pcg_mapping(api_key: str = Depends(require_api_key)):
    """Get French PCG (Plan Comptable Général) mapping"""
    from config.default_mapping import PCG_MAPPING  # Load from YAML
    return {
        "mapping": PCG_MAPPING,
        "updated_at": datetime.now().isoformat(),
        "version": "1.0"
    }
```

**Step 2**: Create frontend hook `apps/web/src/hooks/usePCGMapping.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function usePCGMapping() {
  return useQuery({
    queryKey: ['pcg-mapping'],
    queryFn: () => api.getPCGMapping(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
```

**Step 3**: Delete `apps/web/src/modules/dd-report/config/pcg-mapping.ts`

**Step 4**: Update any imports to use hook instead of direct import

```typescript
// OLD:
import { PCG_MAPPING } from '../config/pcg-mapping';

// NEW:
const { data: { mapping: PCG_MAPPING } } = usePCGMapping();
```

**Acceptance Criteria**:
- ✅ API endpoint returns mapping
- ✅ Frontend uses hook (not hardcoded)
- ✅ pcg-mapping.ts file deleted
- ✅ Tests verify sync
- ✅ Changes don't affect report generation

---

#### Task 3.2: Enable Environment Variable Validation
**Priority**: MEDIUM | **Effort**: 2 hours | **Frontend**

**Current State**:
- Falls back to `localhost:8000` if `VITE_API_URL` not set
- Bad DX: Silent failures in production

**Fix**: Require environment variable

**File**: `apps/web/src/main.tsx` (UPDATE)

```typescript
// Add at top of file
const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error(
    'Environment variable VITE_API_URL is required. ' +
    'Please set it before running the application.'
  );
}

// Rest of app initialization...
```

**File**: `.env.example` (UPDATE)

```
# Frontend API endpoint (REQUIRED)
VITE_API_URL=http://localhost:8000
```

**Acceptance Criteria**:
- ✅ App fails to start without `VITE_API_URL`
- ✅ Error message is clear and actionable
- ✅ `.env.example` documents requirement

---

#### Task 3.3: Improve Session Cleanup Strategy
**Priority**: MEDIUM | **Effort**: 2 hours | **Backend**

**Current State**:
- Cleanup runs every 6 hours
- Files linger = disk space waste
- No monitoring

**Fix**: More aggressive cleanup + monitoring

**File**: `apps/api/api.py` (MODIFY)

```python
CLEANUP_INTERVAL_HOURS = 1  # Check every hour (was 6)
SESSION_TTL_HOURS = 6       # Delete after 6 hours (was 24)

async def cleanup_loop():
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_HOURS * 3600)

        # Cleanup sessions
        deleted_count = cleanup_sessions()

        # Check disk space
        usage = check_disk_usage()
        if usage.percent > 80:
            logger.warning(f"⚠️  Disk usage at {usage.percent}% - aggressive cleanup")
            # Delete sessions older than 2 hours
            aggressive_cleanup(age_hours=2)

        logger.info(f"Cleanup: deleted {deleted_count} sessions, disk {usage.percent}%")
```

**Acceptance Criteria**:
- ✅ Cleanup runs hourly
- ✅ Session TTL reduced to 6 hours
- ✅ Disk usage monitored
- ✅ Warnings logged when disk >80%

---

## PHASE 3: FOUNDATION FOR UI REDESIGN (Week 4)

### Goal
Set up design system and component infrastructure before building UI.

---

#### Task 4.1: Update Tailwind & Design Tokens
**Priority**: HIGH | **Effort**: 4 hours | **Frontend**

**Current State**:
- Using default Tailwind config
- No dark mode optimization
- No custom color palette

**Action**: Update configuration for dark mode + custom colors

**File**: `apps/web/tailwind.config.ts` (REPLACE)

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#1a1a1a',
        'bg-secondary': '#2d2d2d',
        'bg-tertiary': '#3a3a3a',
        'text-primary': '#e8e8e8',
        'text-secondary': '#a0a0a0',
        'accent-teal': '#6ba8a3',
        'accent-orange': '#c9905f',
        'status-success': '#5cb856',
        'status-warning': '#f0a84d',
        'status-error': '#e74c3c',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

**File**: `apps/web/src/index.css` (UPDATE - dark mode baseline)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Force dark mode globally */
:root {
  color-scheme: dark;
}

html {
  background-color: #1a1a1a;
  color: #e8e8e8;
}

body {
  background-color: #1a1a1a;
  color: #e8e8e8;
}

/* Accent colors */
:root {
  --color-teal: #6ba8a3;
  --color-orange: #c9905f;
  --color-success: #5cb856;
  --color-warning: #f0a84d;
  --color-error: #e74c3c;
}
```

**Acceptance Criteria**:
- ✅ Dark mode applied globally
- ✅ Custom colors available via Tailwind
- ✅ Contrast ratios WCAG AA compliant
- ✅ Build succeeds

---

#### Task 4.2: Create Design Token Documentation
**Priority**: MEDIUM | **Effort**: 3 hours | **Frontend**

**File**: `apps/web/DESIGN_TOKENS.md` (NEW)

```markdown
# Design Tokens - Wincap SaaS

## Color Palette (Dark Mode)

### Backgrounds
- Primary: #1a1a1a (main)
- Secondary: #2d2d2d (cards)
- Tertiary: #3a3a3a (hover)

### Text
- Primary: #e8e8e8 (main text)
- Secondary: #a0a0a0 (supporting)
- Tertiary: #6a6a6a (muted)

### Accents
- Teal: #6ba8a3 (primary action)
- Orange: #c9905f (secondary/cost)

### Status
- Success: #5cb856 (positive)
- Warning: #f0a84d (caution)
- Error: #e74c3c (negative)

## Typography

- Titles (h1-h2): Bold (700), -0.02em letter spacing
- Body: Regular (400), 1.5 line height
- Labels: SemiBold (600), +0.05em letter spacing

### Sizes
- h1: 48px
- h2: 32px
- h3: 24px
- body-lg: 16px
- body: 14px
- body-sm: 12px

## Spacing

Base unit: 8px

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## Component Patterns

[Detailed component guidance...]
```

**Acceptance Criteria**:
- ✅ Design tokens documented
- ✅ Developers can reference for consistency
- ✅ Useful for future components

---

## PHASE 4: UI COMPONENT LIBRARY (Weeks 5-6)

### Goal
Build reusable components following design system.

**Note**: Full component specs from `UI_REDESIGN_FULL_ROADMAP.md` apply here.

---

#### Task 5.1: Create Layout Components (Week 5)
**Priority**: HIGH | **Effort**: 8 hours | **Frontend**

Build foundational components:

```
Components to build:
├── ConfidentialBanner.tsx       (3h)
├── ReportHeader.tsx             (3h)
├── TabNavigation.tsx            (3h)
└── SectionHeader.tsx            (3h)
```

#### Task 5.2: Create Data Display Components (Week 5)
**Priority**: HIGH | **Effort**: 8 hours | **Frontend**

```
Components to build:
├── KPICard.tsx                  (2h)
├── KPIGrid.tsx                  (1h)
├── DataTable.tsx                (5h)
└── MetricBox.tsx                (1h)
```

#### Task 5.3: Create Insight Components (Week 6)
**Priority**: HIGH | **Effort**: 6 hours | **Frontend**

```
Components to build:
├── InsightBox.tsx               (2h)
├── DescriptionBlock.tsx         (2h)
├── TableOfContents.tsx          (2h)
```

#### Task 5.4: Create Chart Components (Week 6)
**Priority**: HIGH | **Effort**: 8 hours | **Frontend**

```
Components to build:
├── ChartContainer.tsx           (2h)
├── BarChart.tsx                 (2h)
├── PieChart.tsx                 (2h)
├── LineChart.tsx                (2h)
```

**Acceptance Criteria** (all components):
- ✅ Component created and exported
- ✅ Props fully typed (TypeScript)
- ✅ Dark mode styling applied
- ✅ Basic unit test (snapshot + props)
- ✅ Responsive (mobile/tablet/desktop)
- ✅ Storybook story created (optional)

---

## PHASE 5: PAGE REDESIGNS (Weeks 7-8)

### Goal
Redesign all pages using new component library.

---

#### Task 6.1: Redesign Upload Page (Week 7)
**Priority**: HIGH | **Effort**: 4 hours | **Frontend**

**File**: `apps/web/src/pages/Upload.tsx` (REDESIGN)

- Use ConfidentialBanner
- Use ReportHeader
- Improve drag-drop zone
- Better error handling
- Professional styling

**Acceptance Criteria**:
- ✅ Upload flow works end-to-end
- ✅ New design matches Lovable reference
- ✅ Dark mode applied
- ✅ Responsive on mobile/tablet/desktop

---

#### Task 6.2: Redesign Dashboard Structure (Week 7)
**Priority**: HIGH | **Effort**: 6 hours | **Frontend**

**Create folder**: `apps/web/src/pages/Dashboard/tabs/`

Build 7 tab components:
```
tabs/
├── SyntheseTab.tsx              (2h)
├── PresentationTab.tsx          (1.5h)
├── PerformanceTab.tsx           (1.5h)
├── BilanTab.tsx                 (1.5h)
├── CashFlowTab.tsx              (1.5h)
├── QoETab.tsx                   (1h)
└── QoDTab.tsx                   (1h)
```

Each tab uses:
- SectionHeader (numbered)
- KPI cards (data display)
- DataTables (financial data)
- Charts (visualizations)
- InsightBoxes (callouts)

**Acceptance Criteria**:
- ✅ All 7 tabs implemented
- ✅ Data flows from API to display
- ✅ Tab switching smooth
- ✅ Responsive layout

---

#### Task 6.3: Redesign Databook Page (Week 8)
**Priority**: MEDIUM | **Effort**: 3 hours | **Frontend**

**File**: `apps/web/src/pages/Databook.tsx` (REDESIGN)

- Professional data tables
- Sortable columns
- Search/filter
- Export options
- Dark mode applied

---

#### Task 6.4: Polish & Animation (Week 8)
**Priority**: MEDIUM | **Effort**: 2 hours | **Frontend**

- Smooth transitions between tabs
- Loading states (skeletons)
- Hover effects
- Error states

---

## PHASE 6: TESTING & POLISH (Weeks 9-10)

### Goal
Comprehensive testing and final quality assurance.

---

#### Task 7.1: Add Frontend Test Coverage (Week 9)
**Priority**: CRITICAL | **Effort**: 20 hours | **Frontend**

Target: 80% coverage

```
Test files to create:
├── components/KPICard.test.tsx           (2h)
├── components/DataTable.test.tsx         (3h)
├── pages/Upload.test.tsx                 (3h)
├── pages/Dashboard.test.tsx              (4h)
├── services/api.test.tsx                 (4h)
├── integration/upload-to-export.test.tsx (4h)
```

**Frameworks**: Vitest + React Testing Library (already installed)

**Acceptance Criteria**:
- ✅ 80%+ line coverage
- ✅ All critical paths tested
- ✅ Tests pass locally
- ✅ CI/CD runs tests

---

#### Task 7.2: Dark Mode Testing (Week 9)
**Priority**: HIGH | **Effort**: 4 hours | **Frontend**

Test checklist:
- [ ] All text contrast WCAG AA
- [ ] Charts readable on dark bg
- [ ] Colors distinguish status properly
- [ ] No images lack background
- [ ] Focus states visible
- [ ] Hover states clear
- [ ] Browser dev tools: dark mode forced on

**Acceptance Criteria**:
- ✅ All above pass
- ✅ Screenshots in light + dark (for comparison)
- ✅ No accessibility warnings

---

#### Task 7.3: Responsive Testing (Week 9)
**Priority**: HIGH | **Effort**: 4 hours | **Frontend**

Test breakpoints:
- [ ] Mobile: 320px, 480px, 640px
- [ ] Tablet: 768px, 1024px
- [ ] Desktop: 1280px, 1920px

Check:
- [ ] No horizontal scroll (except intentional)
- [ ] Text readable
- [ ] Buttons/inputs easily tappable
- [ ] Images scale properly
- [ ] Charts responsive
- [ ] Tables scroll appropriately

**Acceptance Criteria**:
- ✅ All breakpoints tested
- ✅ No layout breaks
- ✅ Mobile experience excellent

---

#### Task 7.4: Cross-Browser Testing (Week 9)
**Priority**: MEDIUM | **Effort**: 2 hours | **Frontend**

Browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

**Acceptance Criteria**:
- ✅ All major browsers work
- ✅ No rendering glitches
- ✅ Performance acceptable

---

#### Task 7.5: Backend API Testing (Week 10)
**Priority**: HIGH | **Effort**: 3 hours | **Backend**

Verify endpoints with new authentication:
- [ ] Upload endpoint works with API key
- [ ] Process endpoint returns correct data
- [ ] Export endpoints function
- [ ] Error handling tested
- [ ] Concurrent requests don't corrupt data

**Acceptance Criteria**:
- ✅ All endpoints tested
- ✅ Auth verified
- ✅ No data corruption under load

---

#### Task 7.6: Final Polish & Bug Fixes (Week 10)
**Priority**: MEDIUM | **Effort**: 4 hours | **Frontend + Backend**

- Fix any bugs found during testing
- Performance optimizations
- Code cleanup
- Update documentation
- Run `npm run lint` and fix warnings

**Acceptance Criteria**:
- ✅ 0 linting errors
- ✅ No console errors/warnings
- ✅ Lighthouse score >85
- ✅ All tests pass

---

## TIMELINE OVERVIEW

```
Week 1   │ ████ │ Critical fixes (DDReportDashboard, Auth, Sessions, Dependencies)
Week 2   │ ████ │ More critical fixes (PDF renderer, validation, hardening)
Week 3   │ ████ │ High-priority fixes (PCG mapping, env vars, cleanup)
Week 4   │ ██░░ │ Foundation (Tailwind, design tokens)
Week 5   │ ████ │ Component library (Layout, Data, Insight, Chart)
Week 6   │ ████ │ Component library continued
Week 7   │ ████ │ Page redesigns (Upload, Dashboard structure)
Week 8   │ ████ │ Page redesigns continued (Databook, Polish)
Week 9   │ ████ │ Comprehensive testing (Unit, Dark mode, Responsive)
Week 10  │ ██░░ │ Final testing, bug fixes, polish
         ├──────┤
Total    │ 40h  │ 10 weeks (estimate for 40h/week developer)
```

---

## Resource Requirements

### Skills Needed
- **Full-Stack**: Can work on Phase 1-3 (audit fixes)
- **Frontend**: Can work on Phase 4-6 (UI redesign)
- **Backend**: Can work on Phase 1-2 (auth, sessions)
- **QA**: Can work on Phase 6 (testing)

### Recommended Team
- 1 Full-stack developer (Weeks 1-4): Audit fixes + foundation
- 1-2 Frontend developers (Weeks 4-10): UI implementation + testing
- 1 Backend developer (Week 1-2): Authentication
- 1 QA engineer (Weeks 6-10): Testing

### Or
- 1 Full-stack developer (entire 10 weeks): Solo, prioritize audit fixes first

---

## Success Criteria

### Phase 1-3 (Weeks 1-4)
- ✅ All CRITICAL audit issues fixed
- ✅ App builds without errors
- ✅ Authentication required on all endpoints
- ✅ No race conditions
- ✅ Tests verify fixes

### Phase 4-6 (Weeks 5-8)
- ✅ All 30 UI components implemented
- ✅ All 3 pages redesigned
- ✅ Dark mode fully applied
- ✅ Matches Lovable design reference

### Phase 6-7 (Weeks 9-10)
- ✅ 80%+ frontend test coverage
- ✅ WCAG AA accessibility
- ✅ Responsive on all breakpoints
- ✅ Works on all major browsers
- ✅ Lighthouse score >85
- ✅ 0 console errors/warnings
- ✅ Ready for production

### Final
- ✅ Health score: 8/10 (up from 4/10)
- ✅ All team members can deploy with confidence
- ✅ No security vulnerabilities
- ✅ Professional UI matching design system

---

## Dependencies & Tools

### Already Installed
- React 18 ✓
- TypeScript ✓
- Vite ✓
- Tailwind CSS ✓
- shadcn/ui components ✓
- Recharts (charts) ✓
- Vitest + React Testing Library ✓
- FastAPI (backend) ✓

### New Tools Needed
- None! Everything is ready.

---

## Documentation & Handoff

### Deliverables
1. **Code**: All fixes + redesign implemented
2. **Tests**: 80%+ coverage, all passing
3. **Documentation**:
   - Design system guide
   - Component library documentation
   - API endpoint docs
   - Deployment guide
4. **Storybook** (optional): Component showcase

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Scope creep | Strictly follow this roadmap |
| Hidden bugs | Comprehensive testing in Phase 6 |
| Performance issues | Lighthouse checks, bundle size monitoring |
| Accessibility | WCAG AA testing throughout |
| Security bypass | Security review after auth implementation |

---

## References

- **Audit Report**: CHRISTOPHE_FORENSIC_AUDIT_FINAL.md
- **UI Redesign Spec**: UI_REDESIGN_FULL_ROADMAP.md
- **Design Reference**: Lovable financial report template

---

## Approval & Sign-Off

**Document Status**: Ready for Implementation

**Next Steps**:
1. Review this roadmap with team
2. Assign tasks to developers
3. Start Phase 1 (Week 1)
4. Daily standups to track progress
5. Weekly demos to verify quality

---

*Created by: Claude Code*
*Date: January 18, 2026*
*Status: Comprehensive Plan - Ready to Execute*

---

*This is a living document. Update it as work progresses.*
