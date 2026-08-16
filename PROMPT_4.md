---
title: "Prompt 4 — Draft and Submit Lifecycle, Stable Identifiers, Draft Saved, and Follow-up Outbox"
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

# Prompt 4 — Draft and Submit Lifecycle, Stable Identifiers, Draft Saved, and Follow-up Outbox

Implement the fourth slice of the M-THRYVE Intake Form v3.0 revision. Work from `REVISION_HANDOVER.md` and `TECHNICAL_HANDOVER.md`; preserve legacy reads and do not implement Prompt 5 behavior early.

## Starting Point

Prompt 1 established the canonical contract and migration foundation. Prompt 2 established the v3.0 wizard paths, project types, industries, conditional questionnaire, and path-switch clearing. Prompt 3 established Factory Core Features, optional extensions, normalized scope, questionnaire review/persistence, and preliminary Build Card scope.

Before implementation, verify these invariants remain true:

- Custom Build permits only `templated-website` and `ai-assisted-website`.
- Enterprise permits only `website`, `webapp`, `ecommerce`, and `internal`.
- There are exactly seven canonical industry slugs.
- Scope contains server-injected `Core001`–`Core008`, selected `EXT-*` codes, and `customFeatures`; no active priority values.
- AI-Assisted Website review and persistence use the complete seven-group questionnaire.
- Build Cards are generated only for successful submissions.

## Objective

Make draft, submit, and discard operations durable and recoverable at the lifecycle boundary: assign immutable server identifiers on first persistence, preserve them across draft updates and submission, route successful outcomes to the correct result pages, and enqueue idempotent follow-up work for missing requirements and lifecycle notifications.

## Required Implementation

### 1. Canonical lifecycle commands

- Keep explicit commands: `save_draft`, `submit`, and `discard`.
- Do not infer submission from a generic save endpoint.
- `save_draft` persists partial data and normalized missing requirements; only a valid client email is a hard gate.
- `submit` enforces the complete active contract, persists status `submitted`, and creates the preliminary Build Card.
- `discard` persists status `discarded`, the reason code, optional note, and an audit event; discarded records do not enter the owner-review queue.
- Failed requests keep the operator on the current page, preserve form state, and return actionable errors.

### 2. Stable identifier lifecycle

- On the first successful persistence of a draft or submission, generate the server-side Client ID and Reference Number.
- Return `intakeId`, `clientId`, and `buildReferenceNumber`/`referenceNumber` for drafts and submissions. Do not synthesize fallback IDs in the frontend.
- Re-saving a draft reuses the same identifiers.
- Submitting a saved draft reuses the same identifiers and never creates a second intake or client record.
- When an `intakeId` is supplied, update that intake rather than creating a new one; never reassign the Client ID or Reference Number.
- Record identifier issuance as an auditable lifecycle event with actor and timestamp.
- Retries with the same idempotency key must return the original response and must not duplicate intake, client, audit, identifier, Build Card, or outbox rows.
- Preserve the canonical reference generator in `server/src/lib/reference.ts`.

### 3. Atomic RPC and route integration

- Align the atomic persistence RPC and route response shape so route-level v3 projections cannot be skipped by an early `response_body` return.
- Ensure scope, questionnaire, missing-requirement, and outbox writes run exactly once for both direct creates and `intakeId` updates.
- Make idempotency behavior explicit for RPC success, RPC replay, unique conflicts, and route retries.
- Keep service-role writes and the authenticated SELECT-only RLS model.

### 4. Draft Saved result page

- After a successful `save_draft`, navigate to the dedicated `draft-saved` step; never leave the operator on the outcome-selection page.
- Show the server-returned Client ID and Reference Number prominently.
- Confirm that captured data was saved and that uploaded-asset metadata, when present, is associated with the draft. Do not implement new upload behavior here.
- List normalized missing requirements as follow-up items with severity, owner, status, and next action when available.
- State clearly that no Build Card was generated and the draft was not placed in the owner-review queue.
- Provide clear actions to continue editing the same draft and to return to the appropriate intake list.
- Draft Saved must render correctly after a retry response that returns the original successful result.

### 5. Submitted result and Build Card transition

- After a successful `submit`, navigate to the Build Card/confirmation step.
- Show Client ID, Reference Number, submitted status, owner-review next steps, and the persisted preliminary scope.
- Keep Build Card values preliminary and preserve the owner-review gate.
- Draft and discarded outcomes must never generate or display a submitted Build Card.

### 6. Follow-up outbox

- Use the existing `notification_outbox` pattern as the durable handoff for lifecycle follow-up work.
- Enqueue a deduplicated `draft_saved` event for a successful draft containing intake ID, Client ID, Reference Number, email, status, and normalized missing requirements.
- Enqueue a deduplicated `intake_submitted` event for a successful submission containing intake ID, Client ID, Reference Number, email, status, and owner-review context.
- Include follow-up items that require operator/client action without embedding raw file contents or credentials.
- Use the existing unique lifecycle deduplication constraint/idempotency key; retries must not create duplicate outbox entries.
- Keep delivery processing out of the request path; this prompt creates durable queue rows only.
- Do not send email, capture payment, execute agreements, or bypass owner approval.

### 7. Frontend payload and state rules

- Add optional `intakeId` to the active lifecycle payload and preserve it after the first draft response.
- Store server-returned identifiers in state and use them for subsequent draft saves and submit.
- Remove all client-generated fallback identifiers and treat missing server identifiers as an error state.
- Rotate an idempotency key only after a successful operation; retries reuse the same key.
- Keep path-switch clearing, questionnaire answers, normalized scope, and custom requests intact across draft saves.
- Ensure editing a saved draft returns to the correct active project path without reintroducing cleared path-owned fields.

## Tests and Verification

Add focused tests that fail against the pre-Prompt-4 implementation and prove:

1. Drafts receive server-generated Client ID and Reference Number.
2. Draft resaves reuse identifiers and do not create another intake/client.
3. Submitting a saved draft preserves identifiers and transitions status correctly.
4. `intakeId` updates the existing record and never reassigns identifiers.
5. Idempotency replay returns the original response without duplicate lifecycle, Build Card, or outbox rows.
6. Draft saves require valid email but accept other incomplete fields and record stable missing requirements.
7. Successful draft save navigates to and renders `draft-saved` with identifiers and follow-ups.
8. Failed draft save leaves the operator on the current page with form state intact.
9. Successful submit navigates to Build Card; draft/discarded operations do not create one.
10. `draft_saved` and `intake_submitted` outbox events are written once per intake and contain no raw files or credentials.
11. Scope and questionnaire persistence still occurs on RPC-backed create and update paths.
12. Legacy records remain readable and legacy priority/payment fields remain informational only.

Run and report:

```text
npm test
npm run type-check
npm run build
npm --prefix server test
npm --prefix server run build
```

## Non-Goals

Do not implement these later slices in Prompt 4:

- Prompt 5: real asset upload UI/pipeline changes, draft rehydration/recovery UI beyond identifier-aware continuation, complete browser E2E, or final cross-phase regression.
- Owner approval, agreement execution, payment capture, billing, or build deployment.
- New notification delivery workers; only durable outbox enqueue and deduplication belong here.

## Completion Report

Return a claim-by-claim summary with exact files changed, identifier and idempotency evidence, Draft Saved navigation evidence, outbox row evidence, test results, deferred Prompt 5 work, and any unresolved contract ambiguity. Do not report completion solely because unit tests pass; demonstrate the first-persistence and update paths directly.
