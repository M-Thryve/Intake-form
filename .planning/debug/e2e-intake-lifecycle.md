---
slug: e2e-intake-lifecycle
status: investigating
trigger: "the end to end submission/drafting and file uploading is not functional"
created: 2026-08-24
updated: 2026-08-24
---

# Debug Session: End-to-End Intake Lifecycle

## Symptoms

- **Expected behavior:** Completing the wizard should save a draft, upload and confirm selected files, and submit the intake through the API into durable storage/database state.
- **Actual behavior:** The end-to-end submission, drafting, and file-upload workflow is reported as non-functional; the exact current failure boundary is not yet confirmed.
- **Errors:** No current error text supplied. Prior local reproductions recorded API proxy 502s when the server was not listening, plus earlier payload/idempotency contract failures.
- **Timeline:** Reported on 2026-08-24; earlier resolved sessions on 2026-08-14 and 2026-08-16 addressed related lifecycle failures, so this is treated as a regression or environment mismatch until reproduced.
- **Reproduction:** Run the app, fill the requested wizard fields, save a draft, attach/upload a file, resume or submit the intake, and inspect browser/API/server/storage behavior.

## Evidence

- timestamp: 2026-08-24T04:20:00-07:00
  finding: `vite.config.ts` proxies every `/api` request to `http://localhost:3200`, while the original `package.json` `dev` script launched only Vite. With no API listener, lifecycle and upload requests cannot reach application logic.
- timestamp: 2026-08-24T04:35:00-07:00
  finding: The repository's combined launcher started the API on `3200`; `/api/health` returned `200` directly and through the `8443` Vite proxy. This confirms the frontend route wiring and server health boundary work when both processes are present.
- timestamp: 2026-08-24T05:09:00-07:00
  finding: After the launcher change, an isolated run on `PORT=19443` and `API_PORT=19320` returned `200 {"status":"ok","environment":"development"}` from the API and from the Vite proxy.
- timestamp: 2026-08-24T05:10:00-07:00
  finding: Production frontend build completed successfully. Focused Vitest and TypeScript processes did not emit completion in this environment and were stopped after hanging; no test failure was observed.

## Eliminated

## Current Focus

- hypothesis: The end-to-end flow was unavailable because the standard development entrypoint did not start the API process, and local API auth bypass depended on ambient environment state rather than the combined launcher.
- test: Start the normal development entrypoint after changing it to launch both services, then verify direct and proxied health endpoints on isolated ports.
- expecting: Both services start together, the API listens on the port the proxy uses, and unauthenticated local wizard requests can reach protected routes only in development.
- next_action: human verification of save draft, upload/confirm, resume, and submit in the real wizard

## Resolution

- root_cause: The normal `dev` script launched only Vite even though the frontend sends lifecycle and upload requests to a separate API on `3200`; the combined launcher also did not make the API port and development auth bypass deterministic.
- fix: Changed `npm run dev` to use the combined launcher, added `npm run dev:web` for frontend-only work, and made `scripts/dev-all.mjs` pin the API port plus enable the local development auth bypass without affecting deployed auth.
- verification: Frontend production build passed; isolated combined-launcher smoke test passed with API health `200` directly and through Vite proxy (`19320`/`19443`). Focused Vitest and TypeScript commands hung without output in this environment and were stopped.
- files_changed: package.json, scripts/dev-all.mjs
