---
title: "Final Production Validation, Migration, and Release Gate"
type: completion-report
status: completed
owner: "RUSSEL"
created: 2026-08-16
updated: 2026-08-16
ai_access: internal
ai_generated: true
review_status: draft
canonical: false
---

# FINAL PRODUCTION VALIDATION REPORT

## Executive result

The Prompt 1–5 implementation, live database migration, authentication boundary, asset lifecycle, draft rehydration, and idempotent submission path passed the required validation.

**Implementation and migration gate: PASS.** The critical conditions named in the prompt are verified: authentication, migration application, same-row asset retry, and real authenticated E2E against Supabase Auth, Database, and Storage.

**Production activation recommendation: HOLD until the deployment prerequisites below are completed.** The code is suitable for a staged release, but the target project has no permanent authorized operator after synthetic test cleanup, the hosted frontend/API deployment was not exercised, and the repository's Supabase CLI migration ledger is not linked to the target. These are operational activation prerequisites, not unverified implementation behavior.

## Requirement verdicts

| # | Requirement | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Apply and verify `017_prompt5_asset_resume.sql` | **PASS** | Applied to Supabase project `ilbyzsktnllevfbomesc`, verified schema/storage/RLS, then reapplied 015/016/017 to prove idempotency. |
| 2 | Confirm production authentication wiring | **PASS** | Browser API helpers obtain the current Supabase session and send its bearer token; the API verifies the token and internal role; live missing, expired, anonymous-save, and mixed-client cases failed safely. |
| 3 | Validate the asset lifecycle end to end | **PASS** | Real signed URL, direct Storage PUT, confirmation, forced failure, same-ID retry, replace, physical remove, resume, and submit all passed. |
| 4 | Verify complete draft rehydration | **PASS** | Live reopen restored client/project/path, industry, template/version/colorway, scope, extension, custom request, page content, notes, requirements, and asset metadata without file bytes or credentials. |
| 5 | Verify submit behavior and idempotency | **PASS** | Live submit and replay retained identifiers and produced one intake, one client, one Build Card, one event of each lifecycle type, and no duplicated asset upload. |
| 6 | Run real authenticated E2E | **PASS** | Two Playwright scenarios ran a production-mode API/UI against the target project's real Auth, Database, signed URLs, and Storage; no `/api/**` route mocking was used in this suite. |
| 7 | Run all final checks | **PASS** | Frontend/server tests, both type-checks, both builds, local migration verification, live migration verification, mocked browser regressions, real E2E, and Graphify update passed. |
| 8 | Produce final completion report | **PASS** | This report records commands, results, limitations, migration status, prerequisites, and release recommendation. |

## Migration status

Target: Supabase project ref `ilbyzsktnllevfbomesc` (`BUILD-IT`). No secret, service-role key, password, or test token is recorded in this report or the repository.

| Migration | Live status | Applied file SHA-256 |
| --- | --- | --- |
| `015_phase2_atomic_submit.sql` | **APPLIED / VERIFIED** | `c5709dd3e26d9c3ccd6635630e8a5ea03bcc0361766593e7f05e55e4a4c2264a` |
| `016_revision_v3.sql` | **APPLIED / VERIFIED** | `9ea9e6b4ab66570c62f874c4323010f23b91f18d79b7881a593f3da466da1179` |
| `017_prompt5_asset_resume.sql` | **APPLIED / VERIFIED** | `ad858809c5fc3488b4e65b0df5f4f9d840b0f53ea8d36a2ce3d9e7b9533e4dc7` |

Migration 017's first attempted execution failed atomically because an `UPDATE ... FROM` expression used an ambiguous `client_id`. The migration was corrected to qualify the source alias and was then applied successfully. Live E2E subsequently exposed two pieces of drift in the previously applied Prompt 4 function: draft identifiers were not persisted by the old live function, and lifecycle outbox upserts lacked the partial-index inference predicate. Migration 015 was corrected/reapplied before the final live run. No partial 017 state remained from the failed attempt.

Live verification confirmed:

- `uploaded_assets` has `storage_key`, `file_size_bytes`, `scan_status`, `uploaded_at`, `requirement_key`, `client_id`, `build_reference_number`, and `upload_attempt_count`.
- `idx_uploaded_assets_intake_client` and `idx_uploaded_assets_reference` exist.
- The v3 questionnaire and scope projection tables exist with RLS enabled.
- The `intake-assets` bucket exists and is private.
- `uploaded_assets`, `intake_website_questionnaire`, and `intake_scope_items` have RLS enabled.
- There are zero duplicate lifecycle outbox `(intake_id, event_type)` rows.
- Reapplying 015, 016, and 017 completed successfully.
- Synthetic E2E users, clients, intakes, assets, cards, outbox rows, and storage objects were removed after validation.

The migrations were applied through the authenticated Supabase Management API because this repository stores SQL under `server/src/migrations` and is not linked as a Supabase CLI project. The credential-bearing header is intentionally redacted; the command shape was:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://api.supabase.com/v1/projects/ilbyzsktnllevfbomesc/database/query" `
  -Headers @{ Authorization = "Bearer <redacted>" } `
  -ContentType "application/json" `
  -Body (@{ query = Get-Content -Raw <migration-file> } | ConvertTo-Json)
```

This verifies the live schema and behavior, but does not normalize Supabase CLI migration-history metadata. That ledger normalization is a deployment prerequisite.

## Authentication and authorization evidence

- `src/api/auth.ts` uses `@supabase/supabase-js` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY` fallback), session persistence in `sessionStorage`, automatic token refresh, and `auth.getSession()` before API calls.
- `src/api/intake.ts` and `src/api/assets.ts` await the session and include `Authorization: Bearer <access_token>`.
- No raw access token or intake PII is stored in localStorage.
- `server/src/index.ts` applies `requireAuth` to all `/api/intakes` and `/api/assets` routes.
- `requireAuth` validates bearer tokens using Supabase Auth and requires an active `public.users` internal role.
- Asset routes additionally verify the exact intake/client/Reference Number binding and use a not-found boundary for mixed-client access.

Real results:

- Missing bearer token: `401`.
- Expired bearer token: `401`.
- Anonymous intake save: `401`.
- Valid authenticated internal operator: allowed.
- Correct intake with the wrong client binding: `404`.

## Real asset and resume round trip

The real Playwright lifecycle performed these operations against the target project:

1. Authenticated a temporary internal operator through Supabase Auth.
2. Began an intake and selected a file before identifiers existed.
3. Auto-saved the draft and received stable `intakeId`, `clientId`, and Reference Number.
4. Requested a signed upload URL from the real API.
5. Uploaded bytes directly to the private Supabase Storage bucket.
6. Confirmed the object, producing `assetStatus=uploaded` and `scanStatus=pending`.
7. Replaced the stored object while retaining the same asset metadata ID; the old storage object was removed.
8. Removed a draft asset through `DELETE /api/assets/:assetId`, deleting both object and metadata.
9. Forced confirmation failure by confirming before PUT; the server returned the failure reason.
10. Retried that failed upload using the same asset ID and confirmed it successfully.
11. Saved and reopened the draft, verifying the canonical payload and metadata-only asset list.
12. Submitted the saved draft and replayed the submit idempotency key.

The live rehydrated snapshot included client/project data, tier and active project path, industry, template/colorway/version, `Core001`–`Core008`, `EXT-001`, a custom request, page content, operator/resource notes, normalized missing requirements, and uploaded asset metadata. The intake JSON contained no raw byte sentinel, data URL, signed URL, upload token, or storage credential.

Final durable-row assertions before cleanup:

| Entity | Expected | Observed |
| --- | ---: | ---: |
| Intake | 1 | 1 |
| Client | 1 | 1 |
| Persisted assets after remove/retry path | 2 | 2 |
| Preliminary Build Card | 1 | 1 |
| `draft_saved` outbox event | 1 | 1 |
| `intake_submitted` outbox event | 1 | 1 |
| Lifecycle idempotency records used by the scenario | 3 | 3 |

The replay returned the original intake/client/reference result and did not trigger another signed request, Storage PUT, confirmation, asset row, Build Card, audit row, or lifecycle outbox row.

## Exact verification commands and results

Commands are shown in portable form. On this Windows host, `npm.cmd` was used where PowerShell command resolution required it. The real browser commands used the Node 22.23.2 runtime matching `.mise.toml` because system Node 24 was incompatible with Playwright 1.62.1 test discovery.

| Command | Result |
| --- | --- |
| `npm test` | **PASS** — 18 files, 166 tests. |
| `npm run type-check` | **PASS** — TypeScript emitted zero errors. |
| `npm run build` | **PASS** — Vite 8.2.0, 85 modules transformed, production bundle generated. |
| `npm --prefix server test` | **PASS** — 25 files, 340 tests. |
| `npm --prefix server exec tsc -- --noEmit` | **PASS** — server TypeScript emitted zero errors. |
| `npm --prefix server run build` | **PASS** — server production build generated. |
| `npm --prefix server run migrate:verify` | **PASS** — 18 migrations; 66 `CREATE POLICY` and 66 matching `DROP POLICY` statements. |
| `node-v22.23.2-win-x64/node.exe node_modules/@playwright/test/cli.js test e2e/prompt5-lifecycle.spec.ts --project=chromium` | **PASS** — 7 mocked browser regression scenarios in 11.1s. |
| `node-v22.23.2-win-x64/node.exe node_modules/@playwright/test/cli.js test --config=playwright.real.config.ts` | **PASS** — 2 real authenticated scenarios in 48.8s; the full lifecycle scenario completed in 39.4s. |
| `npm audit --omit=dev` | **PASS** — 0 production vulnerabilities. |
| `npm --prefix server audit --omit=dev` | **PASS** — 0 production vulnerabilities. |
| `graphify update .` | **PASS** — graph regenerated; a follow-up query resolves `production-gate.spec.ts`, `AssetUploader.tsx`, authentication, draft conversion, and submitted Build Card nodes. |
| `graphify reflect --if-stale` | **PASS** — reflections refreshed successfully. |

The seven mocked browser scenarios cover the Prompt 5 happy path, invalid client file, signed-URL failure, confirmation failure, recoverable rehydration failure, path-switch clearing after reopen/save, and missing-identifier response. The two real scenarios cover missing/expired authentication and the complete authenticated draft/upload/replace/remove/retry/reopen/submit/replay lifecycle.

## Production-gate files added or changed

Authentication and client integration:

- `package.json`
- `package-lock.json`
- `src/api/auth.ts`
- `src/api/intake.ts`
- `src/api/assets.ts`
- `src/components/AssetUploader.tsx`
- `src/App.tsx`
- `src/__tests__/auth.test.ts`

Server, migration, and focused tests:

- `server/src/index.ts`
- `server/src/routes/intakes.ts`
- `server/src/routes/assets.ts`
- `server/src/migrations/015_phase2_atomic_submit.sql`
- `server/src/migrations/016_revision_v3.sql`
- `server/src/migrations/017_prompt5_asset_resume.sql`
- `server/src/migrations/rollback/017_prompt5_asset_resume_down.sql`
- `server/src/__tests__/client-auth.test.ts`
- `server/src/__tests__/prompt5-assets.test.ts`

Real validation harness:

- `e2e/production-gate.spec.ts`
- `e2e/start-real-service.mjs`
- `playwright.real.config.ts`

Report and generated architecture artifacts:

- `FINAL_PRODUCTION_VALIDATION_REPORT.MD`
- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/manifest.json`
- corresponding dated, cache, label, learning, vocabulary, and reflection artifacts under `graphify-out/`

The worktree already contained uncommitted Prompt 1–5 implementation and report changes. They were preserved. No commit, push, remote configuration, or deployment was performed.

## Unresolved production limitations

1. **No permanent operator is provisioned.** The live project returned to zero `public.users` internal operators after the synthetic E2E user was cleaned up. The authentication implementation is proven, but an approved Auth user plus matching active internal-role row must exist before operational use.
2. **The hosted deployment was not tested.** The E2E suite used isolated production-mode local UI/API processes connected to the real Supabase project. DNS, TLS, reverse proxy, hosted environment injection, and the eventual public API URL remain deployment checks.
3. **Supabase CLI history is not normalized.** The repository is not linked and migrations are outside the standard `supabase/migrations` directory. Live SQL is verified, but the release operator must record or reconcile 015–017 in the chosen migration ledger without blindly rerunning a divergent bundle.
4. **Scanning remains asynchronous/external.** Confirmation correctly stops at `uploaded` with scan pending. No malware scanning worker was added by Prompts 1–5, so production must provide the trusted scanner/status transition path before treating files as ready.
5. **Internal roles retain the existing global internal read model.** Asset routes prevent mismatched intake/client/reference access, but this release does not add client-scoped portal authorization or tenant-specific internal roles.
6. **Development dependency audit warning.** Full audits report one high-severity advisory in transitive development-only `nanoid <3.3.18`; both production-only audits report zero vulnerabilities. This does not ship in either production dependency graph, but the toolchain lock should be refreshed separately.
7. **Build warning.** The frontend build succeeds with Vite's future native config-loader warnings concerning `__dirname` and JSON import attributes.

## Deployment prerequisites

Before production activation:

1. Provision at least one approved Supabase Auth operator and its matching active `public.users.role='internal'` row; validate deprovisioning and token expiry behavior with that identity.
2. Configure the frontend with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`), and the intended API base URL.
3. Configure the API with the target Supabase URL/service credential, `SUPABASE_STORAGE_BUCKET=intake-assets`, explicit production CORS origins, and its normal secrets-management mechanism.
4. Reconcile the deployment migration ledger with the verified 015/016/017 hashes and capture an operator-visible migration record.
5. Deploy the frontend and API, then rerun `playwright.real.config.ts` against their hosted URLs rather than the local web servers.
6. Connect and validate the trusted file-scanning process if assets must reach `ready` before downstream use.
7. Preserve the private bucket setting and confirm storage retention/deletion policy with operations.

## Release recommendation

**Code and database migration: GO for staged release.**

**Production activation: NO-GO/HOLD until prerequisites 1–5 are completed.** Once an approved operator exists, hosted environment variables/CORS are installed, migration history is reconciled, and the same real suite passes against the deployed URLs, activation can move to GO. Authentication, migration application, retry behavior, and real authenticated E2E are not unverified; the hold is solely for the remaining deployment and operational controls.
