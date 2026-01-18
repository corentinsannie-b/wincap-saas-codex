# Lovable UI Development Guide - Wincap SaaS

**Objective:** Use Lovable to design and iterate on the UI/UX while keeping the backend (Python FastAPI) unchanged

---

## 📋 CURRENT UI STRUCTURE

### Pages (3 main pages)
```
apps/web/src/pages/
├── Index.tsx           # Landing page
├── Upload.tsx          # FEC file upload
├── Dashboard.tsx       # Analysis dashboard
└── NotFound.tsx        # 404 page
```

### Components
```
apps/web/src/components/
├── UploadInterface.tsx      # File upload handler
├── EnrichedDashboard.tsx    # Main dashboard display
├── ChatInterface.tsx        # Claude AI chat
├── NavLink.tsx              # Navigation helper
└── ui/                      # 59 shadcn/ui components
    └── (button, card, input, table, etc.)
```

### Pages Content
1. **Upload Page** - Drag & drop FEC file upload
2. **Dashboard** - P&L, Balance Sheet, KPIs
3. **Chat** - Ask Claude questions about data

---

## 🎯 LOVABLE WORKFLOW

### Step 1: Push to GitHub

```bash
# Verify repo is clean
git status

# Push to your GitHub repo
git push origin main
```

### Step 2: Open in Lovable

1. Go to **https://lovable.dev**
2. Click **"Import Repository"**
3. Connect your GitHub account
4. Select: `amelielebon/wincap-saas-codex` (or your repo name)
5. Choose branch: `main`

### Step 3: Lovable Will See

✅ **Frontend (React/TypeScript)**
- `/apps/web/src/pages/` - Pages to modify
- `/apps/web/src/components/` - Components to edit
- `/apps/web/src/styles/` - Styling (Tailwind)
- `/apps/web/package.json` - Dependencies
- `/apps/web/vite.config.ts` - Build config

❌ **Backend (Won't Touch)**
- `/apps/api/` - Python code (stays untouched)
- API endpoints remain working

---

## 🎨 UI IMPROVEMENT IDEAS

### Current Issues to Fix
1. **Upload Page** - Could be more visually appealing
2. **Dashboard** - Better layout for financial data
3. **Chat Interface** - More polished messaging UI
4. **Colors** - Use brand colors consistently (Gold #C4A35A, Blue #1E4D6B)
5. **Responsive Design** - Better mobile support
6. **Loading States** - Spinners, progress bars
7. **Error Handling** - Better error messages
8. **Dark Mode** - Optional dark theme

### Quick Wins
- [ ] Add company logo/branding to header
- [ ] Improve file upload UI (drag and drop feedback)
- [ ] Better loading spinner during processing
- [ ] Enhance dashboard card layouts
- [ ] Add keyboard shortcuts for chat
- [ ] Better mobile responsiveness
- [ ] Animation for page transitions

---

## 🔧 LOVABLE WILL HELP WITH

✅ **UI/UX Design**
- Component layouts
- Color schemes
- Typography
- Responsive design
- Animations

✅ **React Components**
- Refactor components for clarity
- Add new UI patterns
- Improve state management
- Component optimization

✅ **Styling**
- Tailwind CSS refinements
- Dark mode
- Accessibility improvements
- Performance optimizations

❌ **Not for Backend Work**
- Python code changes (handled separately)
- API logic (keep on your machine)
- Database operations (not needed for UI)

---

## 📝 INSTRUCTIONS FOR LOVABLE

When you open in Lovable, give it these guidelines:

### System Prompt for Lovable

```
You are working on Wincap SaaS - a financial due diligence platform.

**Backend Context (DO NOT MODIFY):**
- Python FastAPI API running on http://localhost:8000
- Endpoints: /api/upload, /api/process, /api/agent/{sessionId}/chat
- These should NOT be changed

**Frontend to Improve:**
- React + TypeScript in /apps/web
- Using Tailwind CSS + shadcn/ui components
- Pages: Upload (upload FEC files) → Dashboard (view results) → Chat (ask Claude)

**Brand Colors:**
- Primary: #1E4D6B (Dark Blue)
- Accent: #C4A35A (Gold)
- Light: #F3F4F6 (Light Gray)
- Text: #1F2937 (Dark Gray)

**Priorities:**
1. Make upload page more visually appealing
2. Improve dashboard layout for financial data
3. Enhance chat interface
4. Better mobile responsiveness
5. Add loading/error states

**Important:**
- Keep all API calls the same
- Don't change /api/agent, /api/upload, /api/process endpoints
- Focus on frontend styling and layout only
```

---

## 🚀 WORKFLOW

### Your Development Loop

```
1. Make changes in Lovable
   ↓
2. Lovable auto-commits to GitHub
   ↓
3. Pull changes locally:
   $ git pull origin main
   ↓
4. Test locally:
   $ npm run dev
   ↓
5. Iterate in Lovable or locally
```

### Local Testing After Lovable Changes

```bash
# Pull changes from Lovable
cd /Users/amelielebon/Desktop/Cresus/wincap-saas-codex
git pull origin main

# Install any new dependencies
cd apps/web
npm install

# Start both servers
cd /Users/ameliolebon/Desktop/Cresus/wincap-saas-codex
./start-dev.sh

# Open http://localhost:8080
```

---

## ✅ WHAT STAYS THE SAME

These should **NOT** be changed by Lovable:

```
✗ apps/api/**                    (Backend - Python)
✗ API endpoint signatures        (/api/upload, /api/process, etc)
✗ Request/response formats       (Keep JSON structure same)
✗ Backend business logic         (FEC parsing, calculations)
✗ Environment variables          (ANTHROPIC_API_KEY, etc)
```

---

## 📊 PAGES TO FOCUS ON

### 1. Upload Page (`apps/web/src/pages/Upload.tsx`)
**Current:** Basic drag-and-drop form
**Could be:**
- Better visual feedback on drag
- File preview before upload
- Progress bar
- Success animation

### 2. Dashboard (`apps/web/src/pages/Dashboard.tsx`)
**Current:** Tab-based layout
**Could be:**
- Better card layouts
- Interactive charts
- Summary cards with icons
- Export buttons more prominent

### 3. Chat Interface (`apps/web/src/components/ChatInterface.tsx`)
**Current:** Basic chat bubble layout
**Could be:**
- Message timestamps
- Better code block formatting
- Copy-to-clipboard buttons
- Suggested prompts

---

## 🔄 SYNCING WITH LOCAL DEVELOPMENT

### After Lovable makes changes:

```bash
# 1. Pull from GitHub
git pull origin main

# 2. Review changes
git diff HEAD~1

# 3. Install dependencies if needed
npm install

# 4. Test locally
./start-dev.sh

# 5. If issues, fix in Lovable or locally and push
git add -A
git commit -m "UI improvements: ..."
git push origin main
```

---

## 🎯 SUCCESS METRICS

After Lovable work, you should have:

- ✅ Polished upload interface
- ✅ Professional dashboard layout
- ✅ Better responsive design
- ✅ Improved color scheme consistency
- ✅ Better loading/error states
- ✅ Smoother animations
- ✅ Mobile-friendly interface
- ✅ All original functionality preserved

---

## 📞 COMMON QUESTIONS

**Q: Will Lovable break my backend?**
A: No. Backend is untouched. All API calls stay the same.

**Q: Can Lovable edit Python files?**
A: It can, but won't understand your domain logic. Keep backend work separate.

**Q: How do I keep both in sync?**
A: Git! Lovable auto-commits. Pull locally and test.

**Q: What if Lovable changes something I don't want?**
A: Revert in Git, tell Lovable not to change that file.

**Q: Can I use Lovable for backend?**
A: Not recommended. Use local development for Python/FastAPI.

---

## 🚀 GET STARTED

### Step 1: Verify repo is pushed
```bash
git log --oneline -1
git push origin main
```

### Step 2: Go to Lovable
```
https://lovable.dev
```

### Step 3: Import this repo
- Click "Import Repository"
- Select `wincap-saas-codex`
- Branch: `main`
- Start designing!

### Step 4: Pull changes back
```bash
git pull origin main
npm run dev
```

---

**You're ready to design!** 🎨 Go to Lovable and start improving the UI!

