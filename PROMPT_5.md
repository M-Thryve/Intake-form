---
title: "Prompt 5 — Real Asset Uploads, Draft Rehydration, E2E, and Final Regression"
type: implementation-prompt
status: draft
owner: "RUSSEL"
created: 2026-08-16
updated: 2026-08-16
ai_access: internal
ai_generated: true
review_status: draft
canonical: false
---

# Prompt 5 — Real Asset Uploads, Draft Rehydration, E2E, and Final Regression

Implement the final slice of the M-THRYVE Intake Form v3.0 revision. Work from `REVISION_HANDOVER.md` and `TECHNICAL_HANDOVER.md`. Prompt 4 is the lifecycle foundation: drafts and submissions now receive server-issued identifiers, existing intake updates persist the full snapshot and v3 projections, both lifecycle outbox events are deduplicated, discard metadata is audited, and the frontend treats missing identifiers as an error.

Do not regress the canonical v3 contract or legacy read compatibility. Do not add notification delivery, payment, agreement execution, owner-approval automation, or build deployment.

## Starting Invariants

- Custom Build permits only `templated-website` and `ai-assisted-website`.
- Enterprise permits only `website`, `webapp`, `ecommerce`, and `internal`.
- The seven canonical industry slugs remain unchanged.
- Scope contains server-injected `Core001`–`Core008`, selected `EXT-*` codes, and `customFeatures`; active priority values remain informational only.
- AI-Assisted Website uses the complete seven-group questionnaire.
- Draft and submit responses contain `intakeId`, `clientId`, and `buildReferenceNumber`/`referenceNumber`.
- A saved-draft submit reuses the same intake, client, reference, scope, questionnaire, and uploaded-asset rows.
- Drafts never create a Build Card; successful submissions create exactly one preliminary Build Card.

## Objective

Replace the remaining simulated asset controls with the existing signed-upload pipeline, make drafts reopenable without losing captured state, and prove the full lifecycle through browser-level and server-level tests. Uploaded bytes must stay in storage; intake JSON stores metadata references only.

## Required Implementation

### 1. Real asset upload UI and client API

- Remove the boolean `uploads`/`toggleUpload` simulation from `src/App.tsx` while preserving the established visual treatment.
- Add `src/api/assets.ts` with typed helpers for:
  - `POST /api/assets/upload-request`
  - direct `PUT` to the returned signed URL with progress reporting
  - `POST /api/assets/:assetId/confirm-upload`
  - `GET /api/assets/intake/:intakeId`
  - `PATCH /api/assets/:assetId/status` where the caller is permitted
- Add `src/components/AssetUploader.tsx` with drag-and-drop and file-picker support, per-file progress, retry, remove/replace, and accessible status text.
- Render the states `pending`, client-only `uploading`, `uploaded`, `scanning`, `ready`, `rejected`, and `failed`. Rejected and failed files must expose the server reason and a retry action where valid.
- Enforce client hints for filename, MIME type, and size, but treat the server validation and scan state as authoritative.
- The first upload requires an intake ID. If no draft exists, automatically save the draft before starting the upload (preferred), or disable the control with the exact message: `Save the draft first — this attaches your files to the intake reference.`
- Bind every upload to the current `intakeId`, `clientId`, and Reference Number. Never place bytes, data URLs, or credentials in React state submitted to the intake API.

### 2. Payload and persistence integration

- Extend `FormData` and `IntakeSubmissionPayload.assets` with an `uploads[]` metadata array containing at least:
  `assetId`, `filename`, `mimeType`, `sizeBytes`, `assetStatus`, `scanStatus`, and optional `requirementKey`.
- Draft saves and saved-draft submits must preserve existing `uploaded_assets` rows; submitting must never upload the same file again.
- Server persistence must associate metadata with the intake without embedding file contents in `intakes.submission_payload`.
- Ensure update paths do not orphan uploads when project type, tier, questionnaire, or scope changes.
- Add or update server authorization checks so a caller cannot upload, list, download, or mutate assets belonging to another intake/client.

### 3. Draft rehydration and resume

- Add a typed read path for an intake draft that returns the canonical active payload plus:
  - Client ID and Reference Number
  - normalized missing requirements
  - scope items and custom requests
  - complete questionnaire answers when applicable
  - template/colorway/version when applicable
  - asset readiness and uploaded-asset metadata
  - operator notes and lifecycle status
- The response must remain compatible with legacy records; legacy payment, voucher, and priority fields are read-only informational values.
- Add a safe resume entry point using the existing intake identifier. Do not place PII in localStorage or expose an unauthenticated enumeration endpoint; enforce the existing authenticated/internal read model.
- Rehydrate the correct flow from tier and project type, then populate the form and page contents without reintroducing fields cleared by a prior path switch.
- Reopening a draft must preserve the same identifiers and make `Continue Editing` return to the correct active project path.
- Rehydration failures must keep the operator on a recoverable error state and must not overwrite the current form with partial data.

### 4. Draft Saved and asset confirmation UX

- Draft Saved must show Client ID, Reference Number, Intake ID, captured-data confirmation, uploaded-asset count/status, and normalized follow-up items.
- The page must distinguish `draft`, `submitted`, and `discarded`; no draft or discarded record may display a submitted Build Card.
- Continue Editing resumes the same draft. Return-to-list/start-new clears all saved identifiers and rotates lifecycle idempotency keys.
- Retry responses that return the original idempotent result must render the same Draft Saved or submitted result without duplicate uploads or lifecycle rows.

### 5. End-to-end and regression coverage

Add focused tests that fail against the pre-Prompt-5 implementation and cover:

1. Signed upload request rejects invalid MIME, filename, size, missing intake, and unauthorized intake access.
2. Upload request → direct PUT → confirmation records one asset and transitions it to `uploaded`/`scanning`.
3. Failed or rejected uploads show the reason and can be retried without duplicate metadata rows.
4. Upload metadata is present in the rehydrated draft and raw bytes are absent from intake JSON.
5. First upload auto-saves (or correctly blocks until) a draft and uses its stable identifiers.
6. Draft reopen restores client/project/path/template/questionnaire/scope/missing requirements/assets/notes.
7. Path-switch clearing remains intact after rehydration and after another draft save.
8. Saved-draft submit preserves intake/client/reference/upload identifiers, creates one Build Card, and does not re-upload files.
9. Draft/discarded records never create or display a submitted Build Card.
10. Lifecycle idempotency replay does not duplicate intake, client, upload, Build Card, audit, or outbox rows.
11. Browser-level happy paths cover new draft, upload, reload/reopen, continue editing, submit, and final confirmation.
12. Browser-level failure paths cover invalid upload, signed-URL failure, confirmation failure, rehydration failure, and missing identifier responses.
13. Legacy records remain readable and legacy payment/priority values remain informational only.

Use mocks or a disposable Supabase project for storage and signed URLs. Do not make tests depend on production credentials or real client files.

## Verification Commands

Run and report all of:

```text
npm test
npm run type-check
npm run build
npm --prefix server test
npm --prefix server run build
```

Also run the focused browser/E2E command and report the exact scenario count. Run `graphify update .` after source changes so `graphify-out/` reflects the final architecture.

## Non-Goals

- Notification delivery workers or email sending; Prompt 4 only guarantees durable outbox rows.
- Payment capture, agreements, owner approval, billing, or build deployment.
- Client-portal redesign beyond the minimum authorized read path needed for secure draft/asset rehydration.
- Storing raw file contents or sensitive data in browser storage, intake JSON, outbox payloads, or test fixtures.

## Completion Report

Return a claim-by-claim report with exact files changed, upload endpoint and state-transition evidence, draft rehydration evidence, identifier/idempotency preservation evidence, browser/E2E scenarios, all command results, remaining known limitations, and any unresolved contract ambiguity. Do not report completion solely because unit tests pass; demonstrate a real or faithfully mocked upload round trip and a rehydrated saved-draft submit.
