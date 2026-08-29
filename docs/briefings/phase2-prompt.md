# Phase 2 Execution Prompt — Server Lookup by Reference Number

Paste the block below into a fresh session. It is self-contained.

---

## Prompt

Repository: `D:\MTHRYVW\Intake-form` (M-THRYVE Intake Form — React + Vite frontend, Express + Supabase API server).

Implement **Phase 2** of the entry-gate / reference-recovery work described in `docs/briefings/entry-gate-reference-recovery.md`. Read that briefing first for context, then do only Phase 2. Do not start Phases 3–5.

### Where things stand

**Phase 1 is complete and verified.** `server/src/migrations/021_reference_resume_key.sql` adds a partial unique index on `intakes.build_reference_number`, `server/src/lib/reference.ts` retries up to 3 times and throws `REFERENCE_GENERATION_FAILED` on exhaustion, and `server/src/routes/intakes.ts` maps that to a 503.

**The migration is written but NOT applied to the live database.** Phase 2 can be built and tested against mocks without it, but must not be deployed until it is applied — Phase 1's `referenceExists()` check is TOCTOU-racy on its own (two concurrent first-persistences can both find nothing and both write the same reference). The DB unique index is the only real guarantee that a reference resolves to at most one intake. Note this in your final report; do not apply it yourself.

**Goal of Phase 2:** let a saved draft be recovered by its client-facing reference number `MTH-YYMM-NNNN-XXXX`, not just by its internal UUID.

### Facts already established — do not re-investigate

- `GET /api/intakes/:intakeId` (`server/src/routes/intakes.ts:61-158`) is the existing UUID-keyed resume read. It rebuilds the payload from `submission_payload` plus four parallel joins on `uploaded_assets`, `intake_website_questionnaire`, `intake_scope_items`, and `build_cards`.
- **That route has zero server-side test coverage.** Every existing `api/intakes` test is a POST. This is why Task 2.0 exists and must come first.
- No migration is needed for the audit event: `audit_events.event_type` has no CHECK constraint, and `actor_type` already permits `'operator'` (migration `010`).
- Route ordering is a non-issue. `/:intakeId` matches one path segment; `/by-reference/:reference` is two, so Express cannot confuse them regardless of registration order.
- There is no rate-limiting anywhere in `server/src`. `server/src/middleware/` holds only `auth.ts` and `internal-auth.ts`.
- `/api/intakes` sits behind `requireAuth` (`server/src/index.ts:63`). This route is operator-facing; the client quotes their number to an authenticated operator. The reference is a lookup key, not a bearer token.

### Task 2.0 — Characterization tests first

**Do this before touching any product code.** Write `server/src/__tests__/intake-resume-read.test.ts` covering the *current* `GET /api/intakes/:intakeId` behaviour, and confirm it passes against the unmodified route. These tests are what prove the Task 2.1 refactor is behaviour-preserving.

Model the harness on `server/src/__tests__/prompt5-assets.test.ts` — it has an in-file table-backed Supabase fake (a `state.tables` Map plus a chainable query builder supporting `.eq()`, `.order()`, `.maybeSingle()`) and already seeds every table this route reads. There is no shared helper module; copy and adapt the pattern.

Cover:
- Invalid (non-UUID) id → `400 Invalid intake ID`
- Unknown id → `404 Intake not found`
- A draft with uploaded assets → assets appear in `payload.assets.uploads` and in the top-level `uploadedAssets`, mapped through `mapUploadedAsset`
- `intake_scope_items` rows override `payload.scope.coreFeatures` / `extensions` / `customFeatures`
- `websiteQuestionnaire` is attached when `projectType === 'ai-assisted-website'` and deleted otherwise
- `template` is stripped unless `projectType === 'templated-website'`; `enterprise` is stripped unless `buildPath === 'enterprise'`
- `outcome` derivation: `draft`/`in_progress` → `draft`, `discarded` → `discarded`, anything else → `submitted`
- `hasBuildCard` is true only when `outcome === 'submitted'` and a build card row exists

### Task 2.1 — Extract the shared loader

Extract the body of `GET /api/intakes/:intakeId` into `async function loadIntakeForResume(intakeId: string)` returning the same `intake` object the route currently builds. The existing route becomes a thin caller.

This is a pure refactor — no behaviour change. Task 2.0's tests must still pass unmodified afterwards. The point is that both entry points produce byte-identical rehydration payloads.

### Task 2.2 — The by-reference route

Add `GET /api/intakes/by-reference/:reference` to `server/src/routes/intakes.ts`:

- Normalize the input: `trim().toUpperCase().replace(/\s+/g, '')`
- Validate against `/^MTH-\d{4}-\d{4}-[0-9A-F]{4}$/` → `400 Invalid reference number format` on a miss, **before any database call**
- Resolve `build_reference_number` → `id` via `.maybeSingle()`. Absent → `404 No intake found for that reference number`
- Delegate to `loadIntakeForResume(id)` and return the identical response envelope as the UUID route, so the frontend can reuse one rehydration path

Keep the error messages operator-facing and specific — a 404 here usually means a typo, not a missing intake.

### Task 2.3 — Audit and throttle

**Audit:** on every *resolved* lookup, insert an `audit_events` row with `event_type: 'resume_lookup'`, `actor_type: 'operator'`, the resolving `intake_id`, and an `event_payload` carrying the reference that was used. No migration needed. Do not write an audit row for format rejections.

**Throttle:** build a small in-memory limiter — 10 *failed* lookups per authenticated user within 5 minutes → `429 Too many lookup attempts. Please wait before trying again.` Successful lookups do not count against the limit.

A plain `Map` keyed by `req.user.id` with a timestamp array is the right size for this. It is per-process and resets on restart; that is acceptable, because the threat model is a compromised operator session brute-forcing the 4-hex suffix, not anonymous public traffic. Do not add a rate-limiting dependency. Keep it local to the route module or a small helper — do not build general-purpose middleware.

Note that `requireAuth` sets `req.isInternalService = true` and leaves `req.user` undefined under the development bypass (`NODE_ENV === 'development' && DEV_AUTH_BYPASS`). Handle that case so local development does not crash on an undefined key.

### Task 2.4 — Tests for the new route

Extend `intake-resume-read.test.ts` or add a sibling file:

- Format rejection → 400, with no database call made
- Lowercase and whitespace-padded input normalizes and resolves
- Unknown reference → 404
- A draft reference → the same envelope the UUID route returns for that intake
- A submitted-with-build-card reference → resolves, `hasBuildCard: true`
- A resolved lookup writes exactly one `resume_lookup` audit row
- The 11th failed lookup in the window → 429; a successful lookup does not increment the counter

### Verification

Run from `server/`:

```bash
npm test
```

```bash
npx tsc --noEmit
```

**Three pre-existing failures are unrelated to this work and were present before Phase 1. Do not fix them and do not count them as regressions:**
- `build-card-lifecycle.test.ts` — the whole file fails to load on a mock-hoisting bug in the test itself (`Cannot access 'fromMock' before initialization`)
- `prompt5-assets.test.ts` — "rejects invalid upload requests" expects 422, receives 201 (asset upload validation, likely stale after commit `f8a3fc2`)
- `validation.test.ts`

Everything else must pass, including all of Task 2.0's and 2.4's new tests.

### Constraints

- Do not apply the migration to the live Supabase project. Report it as still pending.
- Do not commit or push. Per `AGENTS.md`, commits require explicit authorization.
- Do not touch `src/App.tsx`, `src/data/flow.ts`, `src/types/intake.ts`, or `src/api/intake.ts` — those are Phase 3.
- Do not change the response shape of the existing `GET /api/intakes/:intakeId`. The frontend depends on it and Phase 3 will depend on both routes matching exactly.
- Do not add a rate-limiting or caching dependency to `package.json`.

### Done when

- `GET /api/intakes/:intakeId` has characterization tests that passed before the refactor and still pass after it.
- `loadIntakeForResume()` is shared by both routes and neither can drift from the other.
- `GET /api/intakes/by-reference/:reference` normalizes, validates, resolves, and 404s correctly.
- Resolved lookups write a `resume_lookup` audit event; repeated failures throttle at 429.
- `npm test` shows no new failures beyond the three known ones, and `tsc --noEmit` is clean.
- The migration is reported as pending, with a note that Phase 2 must not deploy before it is applied.
