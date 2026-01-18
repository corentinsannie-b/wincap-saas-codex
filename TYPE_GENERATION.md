# Type Generation Guide

## Overview

TypeScript types are automatically generated from the FastAPI backend's OpenAPI schema. This ensures frontend types always match the API.

## Prerequisites

1. Backend API running: `npm run dev:api` (runs on http://localhost:8000)
2. OpenAPI config: `openapi.config.json` ✅ (already created)
3. OpenAPI Generator CLI: ✅ (already installed)

## Generate Types

### Manual Generation

Once backend is running:

```bash
npm run generate:types
```

This will:
1. Fetch OpenAPI schema from `http://localhost:8000/openapi.json`
2. Generate TypeScript types into `packages/shared/generated/`
3. Create a TypeScript client for the API

### Generated Files

After running `npm run generate:types`, you'll have:

```
packages/shared/generated/
├── index.ts                    # Main exports
├── models/                     # Data models (UploadResponse, ProcessResponse, etc.)
├── apis/                       # API client
└── ...
```

## Using Generated Types in Frontend

```typescript
// In apps/web/src/services/api.ts
import type { UploadResponse, ProcessResponse } from '@wincap/shared/generated';

// Now fully typed!
const response: UploadResponse = await fetch(...).then(r => r.json());
```

## When to Regenerate

Regenerate types whenever:
- Backend API changes (new endpoint, new response field)
- Models in `apps/api/api.py` change
- After git pull (if someone updated backend)

## Troubleshooting

### "Could not fetch OpenAPI schema"
- Backend not running: `npm run dev:api`
- Check API is on correct port: http://localhost:8000/openapi.json

### "Directory does not exist"
- Directories are auto-created, but ensure `packages/shared/` exists

### "Permission denied"
- Ensure write access to `packages/shared/generated/`

## Architecture

```
FastAPI Backend (source of truth)
    ↓
OpenAPI Schema (/openapi.json)
    ↓ (npm run generate:types)
TypeScript Types (packages/shared/generated/)
    ↓ (imported in frontend)
Frontend API Service (type-safe)
```

---

**Note**: The first time you generate types, you may need to restart `npm run dev:web` for the IDE to pick up the new types.
