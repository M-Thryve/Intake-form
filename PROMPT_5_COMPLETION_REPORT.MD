---
title: "Prompt 5 Completion Report — Real Asset Uploads, Draft Rehydration, E2E, and Final Regression"
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

# PROMPT_5_COMPLETION_REPORT

## Result

Prompt 5 is implemented and verified. The simulated boolean upload controls were replaced by a signed-URL storage flow, drafts can be reopened through an authenticated identifier-specific read path, saved identifiers and upload rows survive draft-to-submit, and the focused browser suite completes the full draft/upload/reopen/submit lifecycle without a second upload.

No notification worker, payment capture, agreement execution, owner-approval automation, build deployment, or raw-file persistence was added.

## Claim-by-Claim Evidence

### 1. Real asset upload UI and client API — complete

- `src/api/assets.ts` defines typed helpers for upload request, progress-aware direct `PUT`, confirmation, intake asset listing, and permitted status updates.
- `src/components/AssetUploader.tsx` provides drag-and-drop, file picker, per-file progress, retry, remove, replace, and accessible `status`/`alert` output.
- The UI represents `pending`, client-only `uploading`, `uploaded`, `scanning`, `ready`, `rejected`, and `failed`.
- Client filename, MIME, and size checks give immediate hints. The server repeats validation and remains authoritative.
- `src/App.tsx` removed the former `uploads`/`toggleUpload` simulation and renders the storage-backed uploader without changing the established visual language.
- The first valid upload calls `persistDraft(false)` if identifiers do not exist. The file upload begins only after `intakeId`, `clientId`, and Reference Number are returned. A failed/incomplete identifier response preserves the page and prevents the signed request.
- React submission state contains metadata only. The selected `File` objects remain in uploader refs and go only to the signed storage URL.

Endpoint and transition evidence:

| Operation | Route/helper | Evidence |
| --- | --- | --- |
| Request signed upload | `POST /api/assets/upload-request` | Validates intake/client/reference binding, file metadata, and retry state; inserts or reuses one `uploaded_assets` row in `pending`. |
| Store bytes | Direct signed `PUT` | `XMLHttpRequest` reports progress. Bytes do not pass through `/api/intakes` or enter React submission state. |
| Confirm object | `POST /api/assets/:assetId/confirm-upload` | Confirms the storage object exists, then transitions `pending` to `uploaded` with `scan_status=pending`; missing objects transition to `failed`. |
| Scan lifecycle | `PATCH /api/assets/:assetId/status` | Enforces transition and trusted-role rules for `scanning`, `ready`, `rejected`, and `failed`. |
| Reopen/list | `GET /api/assets/intake/:intakeId` | Returns canonical metadata and status summary after verifying client/reference binding. |
| Download | `GET /api/assets/:assetId/download` | Returns a short-lived signed download URL only after the asset binding check. |

The focused server round trip creates a signed request, places a byte array in the mocked storage service, confirms it, and lists exactly one metadata row. The byte sentinel is absent from every intake/list response.

### 2. Payload and persistence integration — complete

- `FormData.uploadedAssets` and `IntakeSubmissionPayload.assets.uploads` use typed metadata containing `assetId`, filename, MIME type, byte size, asset status, scan status, optional rejection reason, requirement key, and upload time.
- Draft and submit snapshots include metadata references only. Unknown byte, upload-URL, token, and storage-key properties are removed from the canonical read response.
- `server/src/routes/intakes.ts` verifies every submitted asset ID belongs to the same intake. The update path does not delete `uploaded_assets`, so project path, tier, questionnaire, template, and scope changes cannot orphan rows.
- Existing-intake draft and submit operations update the complete canonical snapshot and v3 scope/questionnaire projections.
- New RPC-backed records receive the same complete snapshot after the atomic lifecycle function returns.
- Migration `017_prompt5_asset_resume.sql` aligns `uploaded_assets` with the route contract and backfills storage key, size, intake client, and Reference Number fields.

Authorization evidence:

- Asset request, retry, confirm, list, download, and status changes all validate the asset/intake/client/reference tuple.
- Cross-client access deliberately returns the same not-found boundary as an absent record.
- The focused server test proves another `clientId` cannot request an upload for the intake.

### 3. Draft rehydration and resume — complete

- `GET /api/intakes/:intakeId` is protected by the existing `requireAuth` middleware and accepts only a known UUID. No list or unauthenticated enumeration route was introduced.
- The read model returns Client ID, Reference Number, lifecycle/outcome status, normalized missing requirements, operator notes, authoritative scope projections, questionnaire answers, template metadata, uploaded-asset metadata, and Build Card presence.
- Legacy snapshots are normalized from persisted client/project/scope fields. Legacy payment, voucher, maintenance, and priority values remain compatibility-only informational data.
- `getIntakeDraft()` and `rehydrateDraftState()` rebuild a fresh form rather than merging into the operator's current form. Incompatible template, enterprise, and questionnaire fields are therefore not reintroduced.
- `?resume=<intake UUID>`, `?intakeId=<intake UUID>`, and `/resume/<intake UUID>` are supported. No PII or draft snapshot is placed in browser storage.
- A read failure shows a recoverable retry state and leaves the existing blank/current form untouched.
- The saved `sourceMetadata.lastEditedStep` controls where `Continue Editing` resumes.

Browser evidence includes an authenticated-style mocked reopen, correct Draft Saved rendering, `Continue Editing` returning to the saved outcome step, and a rehydrated path switch that clears template/questionnaire data while preserving the asset ID through another draft save.

### 4. Draft Saved and asset confirmation UX — complete

- Draft Saved displays Client ID, Reference Number, Intake ID, captured-data confirmation, total/ready/processing/attention asset counts, and normalized follow-up items.
- Draft, submitted, and discarded terminal states remain distinct. Draft and discarded records cannot render the submitted Build Card view; the authenticated read model reports `hasBuildCard` only for a submitted outcome with a real row.
- `Continue Editing` stays on the same identifiers and draft.
- Return-to-list/start-new clears all three identifiers, form/page state, asset binding state, URL resume parameters, and rotates draft/submit/discard idempotency keys.
- Idempotent lifecycle responses are rendered using their original stable identifiers. Upload retry reuses `retryAssetId`, increments the attempt count, and updates the same metadata row.

### 5. Identifier, Build Card, and idempotency preservation — complete

- The existing-intake update path reads and reuses `client_id` and `build_reference_number`; it never allocates a second intake or client.
- A saved-draft submit upserts a Build Card on `intake_id`. The database contract also has one-card-per-intake conflict handling.
- Draft and discarded paths do not execute the Build Card write.
- Prompt 4's atomic lifecycle RPC remains authoritative: it serializes an idempotency key with an advisory transaction lock and writes lifecycle, audit, Build Card, outbox, and idempotency state in one transaction.
- Lifecycle outbox rows are protected by the unique `(intake_id, event_type)` index and conflict update.
- Browser evidence asserts the saved-draft submit uses the original intake/client/reference/asset IDs and leaves upload request, signed `PUT`, and confirmation counts at exactly one.
- Server retry evidence asserts the failed upload is reset to `pending` on the same asset ID and that `uploaded_assets` remains one row.

## Required Coverage Matrix

| # | Required scenario | Evidence |
| --- | --- | --- |
| 1 | Invalid MIME, filename, size, missing intake, unauthorized intake | `server/src/__tests__/prompt5-assets.test.ts`; focused browser invalid-file scenario. |
| 2 | Request → direct PUT → confirmation | Faithful mocked storage round trip; result is `uploaded` with scan pending. |
| 3 | Failed/rejected reason and retry without duplicate metadata | Server same-row retry test; component and browser failure/retry assertions. |
| 4 | Rehydrated upload metadata, no raw bytes in intake JSON | Server byte/credential sentinel test and frontend serialization test. |
| 5 | First upload auto-saves and uses stable identifiers | Component test and full browser happy path. |
| 6 | Draft reopen restores path/template/questionnaire/scope/requirements/assets/notes | Frontend rehydration test plus browser resume lifecycle. |
| 7 | Path-switch clearing after rehydration and another draft save | Focused browser path-switch scenario verifies incompatible fields are absent and asset ID remains. |
| 8 | Saved-draft submit preserves IDs, one Build Card, no re-upload | Focused browser happy path plus existing lifecycle Build Card/upsert tests. |
| 9 | Draft/discard never creates or displays submitted Build Card | Lifecycle command tests, `hasBuildCard` projection guard, and Draft Saved browser assertion. |
| 10 | Lifecycle replay does not duplicate durable rows | Atomic RPC/idempotency regression, unique/upsert constraints, lifecycle tests, and same-row asset retry test. |
| 11 | Browser happy path | New draft, automatic save, upload, reload/reopen, Continue Editing, submit, final confirmation. |
| 12 | Browser failure paths | Invalid upload, signed PUT failure, confirm failure, rehydrate failure, missing identifier response. |
| 13 | Legacy records remain readable/informational | Existing legacy mapper, legacy server regression tests, and v3 validation rejecting legacy tier on new writes. |

## Focused Browser/E2E Scenarios

Command executed under the repository-pinned Node 22 runtime:

```text
node-v22.23.2-win-x64/node.exe node_modules/@playwright/test/cli.js test e2e/prompt5-lifecycle.spec.ts --project=chromium --reporter=line
```

Result: **7 scenarios passed** in 14.0 seconds.

1. New draft → automatic save → signed upload → reload/reopen → Continue Editing → submit; no re-upload.
2. Invalid file rejected before draft/upload request.
3. Signed URL `PUT` failure exposes reason and retry.
4. Confirmation failure exposes server reason and retry.
5. Rehydration failure leaves a recoverable form and retry action.
6. Rehydrated path switch clears incompatible data and preserves upload metadata after another draft save.
7. Missing server identifiers prevent a signed upload request.

Node 24.18.0 exposed a Playwright 1.62.1 test-discovery incompatibility before test collection. The exact suite was therefore run with Node 22.23.2, matching `.mise.toml` (`node = "22"`).

## Verification Commands

| Requested command | Result |
| --- | --- |
| `npm test` | PASS — 17 files, 162 tests passed. |
| `npm run type-check` | PASS — `tsc --noEmit`, zero errors. |
| `npm run build` | PASS — Vite 8.2.0, 41 modules transformed, production bundle generated. |
| `npm --prefix server test` | PASS — 25 files, 337 tests passed. |
| `npm --prefix server run build` | PASS — server TypeScript build completed. |
| Focused browser/E2E command | PASS — 7 Chromium scenarios passed. |
| `graphify update .` | PASS — graph rebuilt with 3,561 nodes, 4,633 edges, and 281 communities. |

Focused implementation suites included in the totals:

- `server/src/__tests__/prompt5-assets.test.ts`: 8 passed.
- `src/__tests__/prompt5-assets-rehydration.test.tsx`: 4 passed.
- `e2e/prompt5-lifecycle.spec.ts`: 7 passed.

`git diff --check` is clean after removing the trailing blank line in the asset route. The root build reports only the existing Vite future-native-loader warnings for `__dirname` and JSON import attributes.

## Exact Prompt 5 Files Changed

Application and client API:

- `src/App.tsx`
- `src/api/assets.ts` (new)
- `src/api/intake.ts`
- `src/components/AssetUploader.tsx` (new)
- `src/types/intake.ts`

Server and persistence:

- `server/src/lib/asset-validation.ts`
- `server/src/lib/validation.ts`
- `server/src/routes/assets.ts`
- `server/src/routes/intakes.ts`
- `server/src/migrations/017_prompt5_asset_resume.sql` (new)
- `server/src/migrations/rollback/017_prompt5_asset_resume_down.sql` (new)

Tests:

- `src/__tests__/prompt5-assets-rehydration.test.tsx` (new)
- `src/__tests__/intake-api.test.ts`
- `src/data/__tests__/field-validators.test.ts`
- `src/hooks/__tests__/useFieldValidator.test.ts`
- `server/src/__tests__/prompt5-assets.test.ts` (new)
- `server/src/__tests__/asset-validation.test.ts`
- `server/src/__tests__/lifecycle.test.ts`
- `e2e/prompt5-lifecycle.spec.ts` (new)

Report:

- `PROMPT_5_COMPLETION_REPORT.MD` (new)

Graphify generated artifacts refreshed by `graphify update .`:

- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/manifest.json`
- `graphify-out/2026-08-16/graph.json`
- `graphify-out/2026-08-16/GRAPH_REPORT.md`
- `graphify-out/2026-08-16/manifest.json`
- `graphify-out/cache/last_query_stamp`
- `graphify-out/cache/stat-index.json`
- six new `graphify-out/cache/ast/v0.9.30/*.json` cache entries

The worktree already contained uncommitted Prompt 3/4 and Graphify changes before Prompt 5. They were preserved and are not claimed as Prompt 5 implementation files.

## Known Limitations

1. The storage round trip is faithfully mocked, as authorized by the prompt. No production Supabase credentials or real client files were used.
2. Migration 017 was authored and build/test verified but was not applied to a live Supabase environment in this workspace.
3. Confirmation ends at `uploaded` with scan pending. The existing scanner/trusted status path must advance the asset through `scanning` to `ready` or `rejected`; adding a scan worker was outside scope.
4. Remove is implemented as an audited transition to `failed` rather than physical storage deletion. This retains the storage record and avoids orphaning/audit loss.
5. The safe resume route uses the existing authenticated/internal operator model. A broader client-portal resume redesign was intentionally not added.
6. Graphify reported that the optional SQL parser dependency is absent, so SQL migration bodies do not contribute AST nodes even though the code graph refresh succeeded.

## Resolved Contract Interpretations

- Drafts use the Prompt 4 server-issued `build_reference_number` as their stable Reference Number and return both `referenceNumber` and the legacy-compatible `buildReferenceNumber` alias.
- Asset confirmation returns `uploaded` with `scanStatus=pending`; asynchronous scanning owns the later `scanning`/`ready`/`rejected` states.
- Asset metadata is allowed in the intake snapshot, but storage keys, signed URLs, tokens, credentials, data URLs, and raw bytes are not.

No unresolved contract ambiguity remains that blocks Prompt 5.
