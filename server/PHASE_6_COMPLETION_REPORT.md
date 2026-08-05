# Phase 6 Completion Report — Agreement and Finance Handoff

**Branch:** `feat/phase-6-agreement-finance`
**Scope:** Controlled handoff from approved intake → agreement draft → finance review → ready-for-build-handoff. No payment. No build start.

## Preconditions verified (Phase 5)

- Owner-gate decisions table with `decision`, `decision_reason`, `decided_by`, `decided_at`, `reviewed_build_card_version`, `reviewed_analysis_version` fields present.
- `intakes.status` supports `approved`, `rejected`, `needs_clarification`, etc.
- `build_cards.status = 'approved'` transitions on owner approval.
- `owner_release_packages` and MCP run history are available for review context.
- `requireAuth` and `requireRole` middleware enforce Bearer tokens plus role gates.

## Deliverables

### 1. Database migration
`server/src/migrations/005_agreement_finance.sql`

- New tables:
  - `agreement_drafts` — versioned draft packages keyed by `(intake_id, version)`, with `idempotency_key` unique index for repeat-safe creation.
  - `finance_reviews` — append-only decision log with `prior_status`/`resulting_status` snapshots.
- New column `intakes.commercial_stage` (nullable) with CHECK constraint over Phase 6 states.
- Partial unique index preventing multiple **valid** voucher redemptions per intake.
- RLS policies restricting reads to internal users; writes stay behind service-role.

### 2. Eligibility service
`server/src/lib/agreement-eligibility.ts`

Server-side check that returns one of: `intake_not_found`, `no_owner_approval`, `superseded_by_later_decision`, `build_card_missing`, `assets_blocking`, `analysis_failed`, or an eligible snapshot with build-card + owner-decision references.

### 3. Voucher service
`server/src/lib/voucher-service.ts`

- Validates against `vouchers` table (status, expiry, revocation).
- Rejects self-redemption when voucher owner matches intake client.
- Rejects when a valid redemption already exists for the intake.
- Discount is calculated server-side from the approved Build Card's `preliminary_price_php`.
- Records into `intake_voucher_redemptions` with verifier user id.

### 4. Agreement draft builder
`server/src/lib/agreement-draft.ts`

Assembles the draft package from persisted records: client/project scope, features, pages, design, template selection, enterprise fields, payment preferences, voucher redemption, assets/analysis exclusions, owner approval reference. Includes explicit `disclaimers` and `isPreliminary` flags. `nextVersionFor(intakeId)` monotonically increments per intake.

### 5. Routes

**`server/src/routes/agreement.ts`**
- `GET /api/agreement/intakes/:intakeId` (owner|admin|finance) — eligibility + latest draft.
- `POST /api/agreement/intakes/:intakeId` (owner|admin) — create version; supports `Idempotency-Key`. Marks prior drafts `superseded`.
- `POST /api/agreement/intakes/:intakeId/voucher` (owner|admin|finance) — validate + record.
- `GET /api/agreement/intakes/:intakeId/versions` (owner|admin|finance) — history.

**`server/src/routes/finance.ts`**
- `GET /api/finance/intakes/:intakeId` (finance|owner|admin) — finance handoff package.
- `POST /api/finance/intakes/:intakeId/submit` (owner|admin) — draft → pending_finance_review.
- `PATCH /api/finance/intakes/:intakeId/review` (finance|admin) — approve/reject/request_changes.
- `POST /api/finance/intakes/:intakeId/ready-for-build-handoff` (owner|admin) — finance_approved → ready_for_build_handoff. **Does not** start a build.

All finance transitions use optimistic concurrency (`.eq("status", currentStatus)` in the update). A stale prior status returns `409`. Every action creates a `finance_reviews` row **and** an `audit_events` row before returning.

### 6. Audit events emitted
- `agreement_draft_created`
- `agreement_draft_versioned`
- `voucher_redemption_recorded`
- `voucher_rejected`
- `finance_package_viewed`
- `finance_submitted_for_review`
- `finance_approved`
- `finance_rejected`
- `finance_changes_requested`
- `ready_for_build_handoff`

### 7. Server wiring
`server/src/index.ts` mounts both routers under `requireAuth`. Existing PATCH CORS method already covers finance review.

### 8. Tests
- `agreement-eligibility.test.ts` — 7 tests covering every failure classification plus the eligible path.
- `voucher-service.test.ts` — 11 tests covering not_found, expired, revoked, already_used, self_redemption, duplicate_for_intake, invalid_status, valid, and discount calculation edges.
- `agreement-finance.test.ts` — 14 tests covering auth (401), invalid UUID (400), eligibility gating (409), idempotency, valid + invalid voucher flow, finance state machine gating, ready-for-build-handoff protection, reason length, and concurrency conflict.

**Full suite:** `10 files / 149 tests / 0 failures` (verified via `npx vitest run`).

## Build-start protection evidence

- `applyTransition` in `finance.ts` never touches `build_cards.status`, never enqueues MCP runs, never calls asset or intake writers beyond `commercial_stage` and `agreement_drafts.status`.
- The `mark_ready_for_build_handoff` response message asserts explicitly: "No build has been started. No payment has been captured." A test asserts on this string.
- The `agreement_drafts.status = 'ready_for_build_handoff'` value is inert — no worker or route reads it to trigger downstream work.
- No new payment provider dependency, no PSP client, no webhook, no `charge`/`capture` code paths added.

## Idempotency and concurrency

- Draft creation: `Idempotency-Key` header queried first; on unique-index conflict the retry lookup returns the same row.
- Prior drafts are marked `superseded` before insert so historical rows remain visible while only one active draft exists per intake.
- Finance transitions guard on `.eq("status", currentStatus)`; a lost race returns `409`.
- Voucher redemption enforces "one valid per intake" via a partial unique index and an in-service pre-check.

## What Phase 6 does **not** do

- Does not capture payment (no PSP integration).
- Does not perform legal execution or e-signature.
- Does not start a build (no dispatch, no ticket creation).
- Does not modify MCP-authored fields; MCP analyses remain advisory.
- Does not allow the intake operator or client role to enter these endpoints.

## Follow-ups for Phase 7 (build-delivery handoff)

- Consume `commercial_stage = 'ready_for_build_handoff'` as the source-of-truth signal.
- Freeze the `agreement_drafts.draft_package` at build-handoff time and copy into build-phase tables.
- Introduce PSP integration behind a separate finance-approved gate.
