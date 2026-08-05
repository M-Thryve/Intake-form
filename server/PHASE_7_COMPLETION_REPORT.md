# Phase 7 Completion Report — Build Delivery Handoff & Controlled Build Orchestration

**Branch:** `feat/phase-7-build-delivery-handoff`
**Scope:** Freeze the approved package handed to authorized builders; gate build orchestration behind a server-side rechecked eligibility barrier. No build worker is triggered from unauthorized state; no payment is captured.

## Preconditions verified (Phase 6)

- `agreement_drafts.status = 'ready_for_build_handoff'` is the required source-of-truth transition (Phase 6, `finance.ts`).
- `intakes.commercial_stage` uses the Phase 6 state constraint; Phase 7 migration extends it.
- Owner decisions (`owner_gate_decisions`) remain authoritative for approval currency.
- `requireAuth`/`requireRole` middleware enforces internal-user role gates.
- Existing eligibility semantics for asset scanning and MCP analysis are reused.

## Deliverables

### 1. Database migration
`server/src/migrations/006_build_delivery.sql`

- New tables:
  - `build_delivery_packages` — versioned frozen delivery snapshot; unique `(intake_id, version)`; partial unique idempotency index; `package_checksum` for tamper detection.
  - `build_package_acknowledgements` — append-only builder receipt log; unique `(package_id, acknowledged_by)`.
  - `build_delivery_notes` — clarification / blocker / change_request log; open-note partial index.
  - `build_orchestrations` — persisted queue-of-record row; unique `correlation_id`; partial unique `(intake_id) WHERE state IN (queued|in_progress|blocked)` guarantees at most one active orchestration per intake; parent pointer for retry lineage.
- `intakes.commercial_stage` CHECK constraint extended to cover `build_delivery_package_created`, `build_awaiting_acknowledgement`, `build_queued`, `build_in_progress`, `build_blocked`, `build_failed`, `build_completed`, `build_cancelled`.
- RLS: `SELECT` for internal users only; writes gated behind service-role client.

### 2. Combined build eligibility service
`server/src/lib/build-eligibility.ts`

Server-side check that returns one of `intake_not_found | no_owner_approval | owner_approval_superseded | not_finance_ready | build_card_missing | assets_blocking | analysis_failed | delivery_package_missing | delivery_package_stale | delivery_package_invalidated | orchestration_already_active | orchestration_already_terminal`, or an eligible snapshot. Two knobs let the same service power both the freshness dry-run and the transactional queue gate:

- `requirePackage` – queue path demands an existing active package.
- `requirePackageFresh` – rejects when the latest agreement/build-card version no longer matches the package's frozen references.

### 3. Frozen delivery-package builder
`server/src/lib/build-package.ts`

Assembles the delivery-package payload from persisted records: client + project scope, features, pages, design, template selection, enterprise fields, payment preferences, voucher, build card details, agreement draft, assets manifest, MCP analysis references, disclaimers, assumptions/exclusions/risks/dependencies/open-issues. Reads run sequentially for deterministic ordering. Checksum is `sha256(canonical-JSON(payload))`; the same payload always produces the same digest. **Excluded** from the payload: service-role keys, storage-bucket credentials, signed URL tokens, unrelated client records, unrestricted storage paths.

### 4. Orchestration state machine
`server/src/lib/build-orchestration.ts`

Explicit transition matrix: `queued → in_progress|blocked|failed|cancelled`, `in_progress → blocked|failed|completed|cancelled`, `blocked → in_progress|failed|cancelled`. Every terminal state has an empty `next` array. `commercialStageFor(state)` provides a total mapping onto `intakes.commercial_stage`. `notifyWorkerOfQueuedJob` is an explicit dispatch seam that today performs no network side effect — workers poll `build_orchestrations` for `state='queued'`.

### 5. Routes

**`server/src/routes/build-delivery.ts`**
- `GET /api/build-delivery/intakes/:intakeId` (owner|admin|builder|finance) — latest package + eligibility view.
- `POST /api/build-delivery/intakes/:intakeId/package` (owner|admin) — freeze a new package version. Supports `Idempotency-Key`. Supersedes prior active package. Blocks creation while an orchestration is active.
- `GET /api/build-delivery/packages/:packageId` (owner|admin|builder|finance) — single package retrieval with access audit.
- `POST /api/build-delivery/packages/:packageId/acknowledge` (builder|admin) — idempotent per (package, actor); refuses non-active packages.
- `POST /api/build-delivery/packages/:packageId/note` (builder|owner|admin) — clarification/blocker/change_request; **does not** mutate approved scope.
- `GET /api/build-delivery/intakes/:intakeId/versions` (owner|admin|finance|builder) — history for auditors.

**`server/src/routes/build-orchestration.ts`**
- `POST /api/build-orchestration/intakes/:intakeId/eligibility` (owner|admin|builder|finance) — dry-run of the queue gate; no side effects.
- `POST /api/build-orchestration/intakes/:intakeId/queue` (owner|admin) — transactional gate. Re-runs `checkBuildEligibility({requirePackage:true, requirePackageFresh:true})` immediately before insert; also rejects on the `activeOrchestration` snapshot field; recovers from the `(package_id, idempotency_key)` OR `(intake_id, non-terminal)` uniqueness violations without producing duplicates.
- `GET /api/build-orchestration/intakes/:intakeId` (owner|admin|builder|finance) — orchestration history.
- `GET /api/build-orchestration/:orchestrationId` — single lookup.
- `PATCH /api/build-orchestration/:orchestrationId/status` (admin — worker uses internal service key which bypasses role checks) — worker-facing state advance; verifies correlation id; runs transition matrix; on lost race, returns 409.
- `POST /api/build-orchestration/:orchestrationId/retry` (owner|admin) — cancels a `blocked` parent to free the uniqueness slot, then re-runs eligibility and creates a NEW row with `parent_orchestration_id` set.
- `POST /api/build-orchestration/:orchestrationId/cancel` (owner|admin) — transitions any non-terminal state to `cancelled`.

### 6. Server wiring
`server/src/index.ts` mounts both routers under `requireAuth`. Existing CORS `PATCH` method allowance already covers the worker status endpoint.

### 7. Audit events emitted
- `build_delivery_package_created`
- `build_delivery_package_versioned`
- `build_package_accessed`
- `build_package_acknowledged`
- `build_delivery_note_added`
- `scope_change_requested`
- `build_eligibility_checked`
- `build_queue_requested`
- `build_started`
- `build_completed`
- `build_failed`
- `build_blocked`
- `build_retry_requested`
- `build_cancelled`

Every event includes intake id, build reference number, package version, actor id (or null for internal service), correlation id where relevant, and a reason field when the transition demands one.

### 8. Tests
- `build-eligibility.test.ts` — 9 tests covering every failure classification, the eligible baseline, the `requirePackage=true` gate, the fresh-package requirement, and the active-orchestration surface.
- `build-orchestration.test.ts` — 8 unit tests over the transition matrix, terminal/non-terminal classification, commercial-stage mapping, and correlation-id uniqueness.
- `build-delivery.test.ts` — 22 tests over auth/role gating, invalid UUIDs, package creation eligibility gating, idempotency, active-orchestration guard, acknowledgement idempotency + status guard + fresh path, queue eligibility gating (missing package, stale package, active orch), queue idempotency, dry-run eligibility, status/retry/cancel edge cases, and the build-start protection assertion (no writes to `build_cards`/`deployments`/`payments`/`invoices`).

**Full suite:** `13 files / 188 tests / 0 failures` (verified via `npx vitest run`). Phase 7 adds 39 tests.

## Build-start protection evidence

- The `queue` handler asserts the package is fresh, then persists the orchestration row and calls the `notifyWorkerOfQueuedJob` seam. The seam performs no network side effect in this repo — the orchestration row is the queue-of-record. Any future durable queue must consume `state='queued'` rows only; the seam location keeps that swap in one place.
- Duplicate calls collapse via two indexes: unique `(package_id, idempotency_key)` returns the same row, and unique partial `(intake_id) WHERE state IN (queued, in_progress, blocked)` prevents a second active orchestration.
- Retry never mutates the failed parent — it creates a new row with `parent_orchestration_id`. If the parent is `blocked`, it is first cancelled to free the uniqueness slot; if that cancellation loses the race, the retry returns 409 without inserting.
- No worker or route reads `agreement_drafts.status='ready_for_build_handoff'` and starts a build — Phase 6's inert signal remains inert; Phase 7 adds an explicit `build_orchestrations` row as the only build trigger.
- The queue response asserts explicitly: "No payment has been captured by this action." A dedicated test in `build-delivery.test.ts` verifies no writes land on `build_cards`, `deployments`, `payments`, or `invoices` during any request path.

## Delivery-package integrity guarantees

- Frozen `package_payload jsonb` records the exact approved inputs at freeze time.
- `package_checksum` is `sha256(canonical-JSON(payload))` — the canonicalizer sorts object keys recursively so the same payload always produces the same digest.
- The frozen row also stores the exact `agreement_draft_id`+`agreement_draft_version` and `build_card_id`+`build_card_version` used to build it.
- The queue path calls `checkBuildEligibility({requirePackageFresh:true})` which rejects if the current agreement or build-card version no longer matches the frozen references, producing `delivery_package_stale`.
- Creating a new package supersedes any prior `active` package with the same intake — historical rows remain visible but only the newest active row can be queued.
- Creation is blocked while an active orchestration exists (would otherwise leave the worker referencing the wrong checksum).

## Authorization model

- Owners and administrators may authorize the final build handoff (create packages, queue, retry, cancel).
- Finance may view packages and orchestration state but cannot queue.
- Builders may retrieve authorized packages, acknowledge receipt, and record notes; they cannot create packages, queue, retry, or cancel.
- Intake operators, architects, and other internal roles are not admitted on Phase 7 endpoints.
- Clients have no route into any Phase 7 endpoint. Every endpoint is behind `requireAuth` + `requireRole`.
- Storage access remains behind the existing asset-endpoint gate; the delivery package never embeds signed URLs or bucket credentials.

## Idempotency and concurrency

- Package creation: `Idempotency-Key` header queried first; on unique-index conflict the retry lookup returns the same row.
- Queue creation: `Idempotency-Key` scoped to `(package_id, key)`; the queue endpoint also recovers from the `(intake_id, non-terminal)` uniqueness slot losing a race by returning the existing active orchestration id with a 409.
- Worker status transitions use optimistic `.eq("state", currentState)` locking. A lost race returns 409.
- Acknowledgement is idempotent per `(package_id, actor)` — duplicate insert races recover the row.

## What Phase 7 does **not** do

- Does not start a build worker from any unauthorized state.
- Does not capture payment or introduce a PSP integration.
- Does not modify the Phase 6 finance/agreement state machine.
- Does not expose any orchestration or package endpoint to clients.
- Does not permit builders to modify approved scope, price, or timeline — change requests are logged as notes and require a new owner/finance review.

## Follow-ups for the deployment team

- Apply `server/src/migrations/006_build_delivery.sql` to Supabase (staging → production).
- Wire a durable queue behind `notifyWorkerOfQueuedJob` when a worker is chosen. The row is authoritative — the seam just adds an eager push signal.
- Run a live smoke test through the full transition chain against a real `ready_for_build_handoff` intake: create package → acknowledge → queue → worker PATCH `in_progress` → PATCH `completed`.
- Extend the frontend Factory Console (Phase 5 surface) to surface Phase 7 states.
