# M-THRYVE Intake Form — Remaining Fixes Report

**Date:** 2026-08-14  
**Scope:** Intake form, draft persistence, Supabase target, verification, and release readiness  
**Overall status:** Core draft and submit persistence is fixed and live-verified. Release readiness is not complete.

## Executive summary

The original end-to-end submission failure was real. The target database had the expected tables, but `intakes.commercial_stage` retained an incompatible `NOT NULL DEFAULT 'not_started'` definition. The atomic submit RPC therefore failed before writing an intake.

That issue is now fixed in migrations `000` and `015`, reapplied to Supabase project `ilbyzsktnllevfbomesc`, and verified through the real Vite proxy:

- Save as draft: HTTP 200, persisted as `draft`, no build reference.
- Submit: HTTP 201, persisted as `submitted`, generated a build reference, queued a Build Card, and returned `waiting_owner_review`.
- Idempotent replay: HTTP 200 with the original response.
- Synthetic verification rows were removed afterward.

## Remaining work by priority

| Priority | Area | Status | Required action |
|---|---|---|---|
| P0 | Production configuration | Open | Set an explicit production/staging `ALLOWED_ORIGINS`; keep `DEV_AUTH_BYPASS=false` outside local development. |
| P1 | Test harness | Open | Fix frontend Vitest matcher registration and the server Vitest config/startup problem. |
| P1 | Live browser E2E | Open | Run real browser tests against Vite → API → Supabase; current checked-in tests mock the intake API. |
| P1 | Full lifecycle | Open | Verify submitted intake → owner approval → agreement draft → finance → build handoff in a staging environment. |
| P1 | Wrong-project detour | Decision required | Audit and, only with approval, roll back the nine migrations applied to the unrelated booking project. |
| P2 | Migration rollback | Open | Add and test rollback coverage for the full migration set, including `000` and `015`. |
| P2 | Background reliability | Open | Add durable worker/notification processing, dead-letter handling, alerts, and observable retries. |
| P2 | Asset security | Deferred | Replace the placeholder asset scanner with a real malware/antivirus scanning integration. |
| P2 | Analysis quality | Deferred | Decide whether rule-based MCP analysis is sufficient or wire the planned LLM-backed analysis. |
| P3 | Contract/documentation drift | Open | Align stale handoff/debug/deployment documents with the current port, migration count, and resolved fixes. |

## Details and acceptance criteria

### 1. Production and staging configuration — P0

The local environment intentionally uses development settings, including `ALLOWED_ORIGINS=*` and `DEV_AUTH_BYPASS=true`. These must not reach staging or production.

Complete when:

- `ALLOWED_ORIGINS` contains only the exact deployed frontend origins.
- `DEV_AUTH_BYPASS=false` in staging and production.
- Service-role/secret keys are server-side only and rotated for the deployment.
- Health checks report the expected environment.
- The production checklist is updated and signed off.

Reference: `server/.env.example`, `server/src/lib/config.ts`, `docs/deployment/production-checklist.md`.

### 2. Test harness — P1

The current frontend full-suite run is not clean: 54 tests failed and 72 passed. The dominant error is `Invalid Chai property: toBeInTheDocument`, indicating that the `@testing-library/jest-dom` matchers are not registered in the active Vitest configuration even though `src/test/setup.ts` imports them.

The server suite currently cannot start in this environment because Vitest/esbuild fails while resolving `server/vitest.config.ts` with an access-denied error for `../..`. This is a runner/configuration problem, so server test coverage is currently unverified rather than proven green.

Complete when:

- Frontend tests run with the intended setup file and pass.
- Server Vitest starts from a clean shell and reports actual test results.
- No test silently accepts a 500 or skips assertions around persistence.
- The live RPC contract has a regression test for nullable `commercial_stage`.

References: `vitest.config.ts`, `src/test/setup.ts`, `server/vitest.config.ts`, `server/src/__tests__/e2e-intake-lifecycle.test.ts`.

### 3. Real browser E2E — P1

The checked-in Playwright workflows mock `/api` for the main submit, draft, discard, and owner-review scenarios. They verify UI behavior, but not the real database boundary. A browser backend was unavailable during this audit, so no click-through was completed in this session.

Complete when a staging-capable browser run proves:

1. A user completes a custom intake and submits it.
2. A user completes an enterprise intake and submits it.
3. A partial intake saves as a draft without hard validation blocking it.
4. A draft can be reopened and converted to a submission.
5. A duplicate request replays safely.
6. The resulting record appears in the owner review queue.

Reference: `e2e/intake-workflows.spec.ts`.

### 4. Full post-submission lifecycle — P1

The intake boundary now works, but the following sequence was not live-verified:

`submitted → owner approval → agreement draft → finance review → ready for build handoff → build orchestration`

The project has route and schema implementations for these stages, but they still need a staging run using real Supabase rows, authorization, audit events, and concurrency checks.

Complete when the production checklist item “submit → owner approve” passes and the downstream agreement/finance/build gates are demonstrated with no manual database edits.

References: `server/src/routes/console.ts`, `server/src/routes/agreement.ts`, `server/src/routes/finance.ts`, `server/src/routes/build-orchestration.ts`.

### 5. Wrong-project migration detour — P1, decision required

Nine migrations were applied to `ckektudtegnodczibkgx`, which is a separate booking application with live leads/bookings data. Rollback SQL exists, but this must not be executed blindly.

Required process:

- Inventory the exact objects changed on that project.
- Confirm the current owner and take/verify a backup.
- Compare each rollback script with the live schema and data dependencies.
- Obtain explicit approval before rollback.
- Verify the booking application after rollback.

The target intake project is `ilbyzsktnllevfbomesc`; the unrelated project must remain out of the normal intake deployment workflow.

### 6. Migration rollback coverage — P2

The migration apply path is idempotent and all 16 migrations currently apply successfully. The rollback directory does not contain matching rollback scripts for every migration, notably `000` and `015`, and rollback has not been tested in staging.

Complete when every migration has a reviewed rollback or an explicit documented forward-only decision, and a disposable/staging database has completed an apply → verify → rollback test.

References: `server/src/migrations/`, `server/src/migrations/rollback/`, `docs/deployment/production-checklist.md`.

### 7. Background reliability and notifications — P2

The database outbox tables and retry-oriented code exist, but operational delivery still needs a durable worker, dead-letter handling, alerting, and failure visibility. MCP/orchestration failures are designed to leave the intake submitted, but the system needs an operator-visible recovery path when the background process or database is unavailable.

Complete when a forced worker failure produces a persisted failure record, bounded retries, a dead-letter outcome, an alert, and a documented replay procedure.

References: `server/src/lib/outbox.ts`, `server/src/lib/mcp-orchestration.ts`, `server/src/routes/internal-outbox.ts`.

### 8. Asset scanning — P2, deferred

Asset scanning currently uses placeholder behavior. The application models pending/uploaded/scanning/ready/rejected/failed states, but a real malware/antivirus scanner is not wired.

Complete when uploaded assets are scanned by the chosen provider, failures are persisted, unsafe assets are blocked from downstream gates, and the scanner credentials/results are observable without exposing storage secrets.

### 9. Analysis quality — P2, deferred

The current MCP analysis is rule-based. The earlier completion report identifies LLM-backed analysis as a later phase. Decide whether rule-based analysis is the intended production behavior; if not, define and implement the provider, timeout, redaction, cost, retry, and evaluation contract before enabling it.

Reference: `server/MCP_PHASE4_COMPLETION_REPORT.md`.

### 10. Build reference contract — P2/P3

The implementation generates `MTH-YYMM-NNNN-RRRR`, while older project requirements and tests reference `MTH-YYYYMMDD-XXXX-RRRR`. This is a contract decision still needing one canonical format.

Complete when the format is chosen, documented, generated atomically under concurrency, and asserted consistently in frontend, server, database, and E2E tests.

Reference: `server/src/lib/reference.ts`.

### 11. Documentation and state drift — P3

Some documents still describe the earlier port `3000`, pre-fix validation behavior, or migrations as unapplied. They can mislead future operators even though the current local setup uses port `3200` and the target has all 16 migrations.

Update or archive:

- `FORM_SUBMISSION_DEBUG_REPORT.md`
- `.planning/debug/form-submission-draft-database.md`
- `handoff.md`
- `docs/deployment/production-checklist.md`
- `.planning/STATE.md`

## Verification evidence as of this report

- Migration idempotency audit: passed, 16 migrations scanned.
- Live target apply: 16/16 migrations applied.
- Live target schema: 48 public tables; expected M-THRYVE tables present.
- Real Vite proxy path: draft 200 and submit 201 passed.
- Idempotent replay: passed.
- Root type-check: passed.
- Frontend and server production builds: passed.
- Focused frontend intake mapping test: passed.
- Full browser click-through: not completed because no browser backend was available.
- Synthetic verification data: removed after testing.

## Recommended next sequence

1. Fix the Vitest harness and make the full local test suites authoritative.
2. Add a live/staging E2E profile that does not mock `/api`.
3. Run the complete owner-approval → agreement → finance → build handoff flow in staging.
4. Set production configuration and complete the deployment checklist.
5. Resolve the wrong-project rollback decision with backup and schema review.
6. Harden background jobs, notifications, asset scanning, and migration rollback coverage.

No commit or push was performed while creating this report.
