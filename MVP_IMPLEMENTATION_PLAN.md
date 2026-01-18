# Wincap MVP Implementation Plan

**Goal**: Ship a working MVP by end of session with:
1. Simple UI: Upload FEC → Click Run
2. Enriched interface showing key metrics (like HTML reference)
3. Download Databook (Excel) & PDF Report
4. Basic chat interface (bonus)

**Total Effort**: 6-8 hours

---

## Phase 1: Backend Cleanup (3-4 hours)

### 1.1 Remove Lovable Artifacts (15 min)
- [ ] `apps/web/vite.config.ts` - Remove lovable-tagger import + plugin
- [ ] `apps/web/package.json` - Remove lovable-tagger from devDeps, rename package
- [ ] Verify build: `npm install && npm run build`

### 1.2 Fix Documentation (15 min)
- [ ] `README.md` - Change port 5173 → 8080
- [ ] Root `package.json` - Clarify: API on 8000, Web on 8080

### 1.3 Consolidate Business Logic (2-3 hours)

**Verify backend has all features:**
```bash
cd apps/api && python -m pytest
```

**Delete frontend duplicates** (these ALL exist in backend already):
```bash
# Delete duplicate parsers & engines from frontend
rm apps/web/src/modules/dd-report/parsers/fec-parser.ts
rm apps/web/src/modules/dd-report/engines/pnl-engine.ts
rm apps/web/src/modules/dd-report/engines/balance-sheet-engine.ts
rm apps/web/src/modules/dd-report/engines/cash-flow-engine.ts
rm apps/web/src/modules/dd-report/engines/qoe-engine.ts
rm apps/web/src/modules/dd-report/analyzers/order-analyzer.ts
rm apps/web/src/modules/dd-report/renderers/pdf-renderer.ts
rm apps/web/src/modules/dd-report/renderers/pdf-exporter.ts
rm apps/web/src/modules/dd-report/renderers/xlsx-exporter.ts
rm apps/web/src/modules/dd-report/renderers/pdf-converter.ts
```

**Move pdf-converter to backend** (Node.js code can't run in browser):
- Translate `apps/web/src/modules/dd-report/renderers/pdf-converter.ts` to Python
- Save as: `apps/api/src/export/pptx_to_pdf.py`
- Add endpoint: `POST /api/export/convert-pptx-pdf`

**Update exports:**
- Remove deleted imports from `apps/web/src/modules/dd-report/index.ts`

### 1.4 Type Generation Setup (1-2 hours)

```bash
npm install --save-dev @openapitools/openapi-generator-cli
```

Create `openapi.config.json`:
```json
{
  "inputSpec": "http://localhost:8000/openapi.json",
  "generatorName": "typescript-fetch",
  "outputDir": "./packages/shared/generated",
  "packageName": "@wincap/api-types"
}
```

Add to root `package.json`:
```json
"scripts": {
  "generate:types": "openapi-generator-cli generate -c openapi.config.json"
}
```

Test: `npm run generate:types`

---

## Phase 2: Build MVP UI (3-4 hours)

### 2.1 Upload Interface (1 hour)

**Create**: `apps/web/src/components/UploadInterface.tsx`

```typescript
// Simple interface:
- Drag & drop zone for FEC file
- Show uploaded file name
- "Run Processing" button
- Loading state during processing
```

### 2.2 Enriched Results Dashboard (2 hours)

**Create**: `apps/web/src/components/EnrichedDashboard.tsx`

Structure (inspired by your HTML):
```
┌─────────────────────────────────────────┐
│  KEY METRICS (from agent.get_summary())  │
├─────────────────────────────────────────┤
│ Revenue: €X M    EBITDA: €Y M (Z%)      │
│ Equity: €A M     Working Capital: €B M  │
│ DSO: X days      DPO: Y days            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  DATA QUALITY REASSURANCE                │
├─────────────────────────────────────────┤
│ ✅ Parsed 5,432 entries                  │
│ ✅ 2022-2024 data complete               │
│ ⚠️  2 entries with parsing warnings      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  HOTSPOTS (from agent.find_anomalies()) │
├─────────────────────────────────────────┤
│ • High balance in account 512 (€50K)    │
│ • Unusual salary spike in Sept 2024     │
│ • Large one-time transaction (€XXK)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  DOWNLOADS                               │
├─────────────────────────────────────────┤
│ [📊 Download Databook (Excel)]          │
│ [📄 Download Report (PDF)]              │
└─────────────────────────────────────────┘
```

**Implementation steps:**
1. Call `GET /api/agent/{sessionId}/summary` → get metrics
2. Call `GET /api/agent/{sessionId}/anomalies` → get hotspots
3. Display in cards
4. Add download buttons linking to:
   - `/api/export/xlsx?session_id={sessionId}`
   - `/api/export/pdf?session_id={sessionId}`

### 2.3 Chat Interface (1 hour)

**Create**: `apps/web/src/components/ChatInterface.tsx`

```typescript
// Simple chat:
- Message input field
- Message history (user + assistant)
- Loading state while Claude thinks
- Send button
- Clear chat button

// Functionality:
- User types: "Montre-moi le P&L 2024"
- POST /api/agent/{sessionId}/chat with message
- Display Claude's response as text (for MVP)
- Later: add trace modals, tables, etc.
```

### 2.4 Main App Flow (1 hour)

**Modify**: `apps/web/src/App.tsx`

```typescript
// State machine:
const [state, setState] = useState<'upload' | 'processing' | 'dashboard' | 'chat'>('upload');
const [sessionId, setSessionId] = useState<string | null>(null);

// Render based on state:
- state === 'upload' → <UploadInterface />
- state === 'processing' → <LoadingScreen />
- state === 'dashboard' → <EnrichedDashboard />
- state === 'chat' → <EnrichedDashboard /> + <ChatInterface />
```

---

## Phase 3: Testing & Polish (1-2 hours)

### 3.1 E2E Flow Test
- [ ] Upload real FEC file
- [ ] Click "Run"
- [ ] Verify dashboard appears
- [ ] Download Excel + PDF
- [ ] Test chat (ask about a metric)

### 3.2 Export Validation
- [ ] Excel matches reference structure
- [ ] PDF has all sections
- [ ] Numbers match backend calculations

### 3.3 Error Handling
- [ ] Invalid file upload
- [ ] Processing errors
- [ ] Download failures

---

## Code Structure (What You'll Create)

```
apps/web/src/
├── components/
│   ├── UploadInterface.tsx       ← NEW
│   ├── EnrichedDashboard.tsx     ← NEW
│   ├── ChatInterface.tsx         ← NEW (bonus)
│   └── ... (existing components)
├── services/
│   ├── api.ts                    (update imports to use @wincap/api-types)
│   └── ... (existing)
├── App.tsx                        (update to show state machine)
└── ... (existing structure)

apps/api/src/export/
├── pptx_to_pdf.py                ← NEW (translate from TS)
└── ... (existing)

packages/shared/
├── generated/                     ← NEW (from OpenAPI generation)
├── src/types/
│   ├── ui.ts                     ← NEW
│   └── index.ts
└── package.json

ROOT:
├── openapi.config.json           ← NEW
├── ARCHITECTURE_CLEANUP_PLAN.md  (already created)
├── MVP_IMPLEMENTATION_PLAN.md    (this file)
└── ... (existing)
```

---

## Key Decisions Made

✅ **Single project MVP** - No multi-project logic
✅ **Simple UI first** - Lovable, not beautiful (iterate later)
✅ **Backend = source of truth** - All business logic there
✅ **Chat is bonus** - Not blocking launch
✅ **No persistence** - Session-based (temp files OK)
✅ **Excel & PDF match reference** - Critical requirement

---

## Success Criteria

By end of this session:
- [ ] Fresh clone → `npm install` → `npm run dev` works
- [ ] Upload page loads
- [ ] Upload FEC file
- [ ] Click "Run" → processes in 30-60 seconds
- [ ] Dashboard appears with key metrics
- [ ] Download Excel (matches reference format)
- [ ] Download PDF (matches reference format)
- [ ] (Bonus) Chat works for simple queries

---

## Known Constraints

1. **Excel**: Reference has 55 sheets - backend might not create all yet. MVP = core sheets (P&L, Balance, CF, KPIs)
2. **PDF**: Must have all sections that current backend generates
3. **Chat**: Won't have fancy renderers yet (just text output)
4. **Design**: Basic cards + buttons (iterate on beauty later)

---

## Order of Work

1. **Cleanup** (Phases 1.1-1.4) - Get foundation clean
2. **Upload** (Phase 2.1) - User can upload
3. **Dashboard** (Phase 2.2) - Show results
4. **Chat** (Phase 2.3) - Add intelligence
5. **Polish** (Phase 3) - Make it work end-to-end

---

## Estimated Timeline

| Phase | Duration | Done |
|-------|----------|------|
| 1.1-1.2 | 30 min | |
| 1.3 | 2-3 hrs | |
| 1.4 | 1-2 hrs | |
| 2.1 | 1 hr | |
| 2.2 | 2 hrs | |
| 2.3 | 1 hr | |
| 2.4 | 1 hr | |
| 3 | 1-2 hrs | |
| **TOTAL** | **8-11 hrs** | |

---

## Next Step

Ready to start Phase 1 cleanup? Or would you prefer:
- A) Start with UI mockups first (visualize before coding)
- B) Verify backend exports work with sample data
- C) Just start implementing (I'll fix issues as we go)

Which is best for you?
