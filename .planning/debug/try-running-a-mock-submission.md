---
slug: try-running-a-mock-submission
status: resolved
trigger: "TRY RUNNING A MOCK SUBMISSION TRY FILLING UP EVERY ASKED INFORMATION. THEN REPORT WHY DOES THE UPLOADING OF FILES IS NOT GOING THROUGH"
created: 2026-08-16
updated: 2026-08-16
---

# Debug Session: File Uploads Not Going Through

## Symptoms

- Reported: filling up every asked information in a mock submission, the uploading of files does not go through.
- Verified: with the frontend dev server up on `8443`, `GET /api/health` through the Vite proxy returned **HTTP 502**; nothing was listening on the API port.

## Root Cause

The Intake API server was **not running**. The Vite dev server proxies `/api` to `http://localhost:3200` (`vite.config.ts`), but no process was listening on `3200` (or `3000`). Every `/api/*` request — including the first upload step `POST /api/assets/upload-request` (`src/api/assets.ts`) — failed at the proxy boundary with 502 before reaching any upload logic. This was an operational gap (backend not started), not a file-type or validation defect.

## Fix

- Started the API server: `npm run dev` inside `server/` (loads `server/.env`; `PORT=3200`, `DEV_AUTH_BYPASS=true` in development).
- Verified `GET /api/health` → 200 both directly on `3200` and through the Vite proxy on `8443`.

## Verification

- Ran the repo's real authenticated mock-submission E2E (`playwright.real.config.ts` → `e2e/production-gate.spec.ts`), which fills every wizard field and uploads PDFs through the UI.
- `2 passed`:
  1. Protected routes reject missing/expired bearer tokens.
  2. Browser creates, uploads, replaces, removes, resumes, retries, and submits idempotently — confirmed asset status `uploaded` after signed PUT + `confirm-upload`.
- Upload path confirmed working end-to-end: UI → `POST /api/assets/upload-request` → signed PUT to Supabase Storage → `POST /:assetId/confirm-upload`.

## Operational Note

Keep the API server running on `localhost:3200` (`cd server && npm run dev`) whenever testing uploads from the Vite dev server on `8443`. The existing resolved session `form-submission-draft-database` noted port `3000`; current config uses `3200`.