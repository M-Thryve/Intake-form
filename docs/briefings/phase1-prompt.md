# Phase 1 Execution Prompt — Reference Number as Resume Key

Paste the block below into a fresh session. It is self-contained.

---

## Prompt

Repository: `D:\MTHRYVW\Intake-form` (M-THRYVE Intake Form — React + Vite frontend, Express + Supabase API server).

Implement **Phase 1** of the entry-gate / reference-recovery work described in `docs/briefings/entry-gate-reference-recovery.md`. Read that briefing first for context, then do only Phase 1. Do not start Phases 2–5.

### Background

`intakes.build_reference_number` holds the client-facing handle `MTH-YYMM-NNNN-XXXX`. It is issued once on first persistence (draft or submit) and never regenerated. A later phase will make it the lookup key for resuming a saved draft.

Two things must be true before that is safe, and neither is true today:

1. **The column has no unique constraint and no index on the live database.** Migration `000_phase2_intake_schema.sql:32` declares `build_reference_number text UNIQUE`, but the deployed table carries only `intakes_pkey`. Verified against project `lusziumbodejmtdzuzbf`. Existing data is clean — 22 rows, 21 references, 21 distinct, 1 NULL from a discard — so the index can be added with no backfill.
2. **`generateBuildReferenceNumber()` is racy.** It derives its sequence from `count(*)` over the current month, so two concurrent intakes can compute the same sequence; only the 4 random hex characters separate them. Today a collision writes a silent duplicate. Once the unique index exists it becomes a failed insert, which must be handled.

### Task 1.1 — Migration

Create `server/src/migrations/021_reference_resume_key.sql`.

Follow the conventions in the neighbouring migrations: a two-line `--` comment header explaining why the migration exists, and `IF NOT EXISTS` on the index so re-application is idempotent.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_intakes_build_reference_unique
  ON public.intakes (build_reference_number)
  WHERE build_reference_number IS NOT NULL;
```

The index is partial because the discard path never issues a reference number, and multiple NULLs must remain legal. It doubles as the lookup index for Phase 2.

Use a plain `CREATE UNIQUE INDEX`, **not** `CONCURRENTLY`. Migrations here are applied through the Supabase SQL Editor or `supabase db push` (see `server/DEPLOYMENT.md`), both of which can wrap statements in a transaction — `CONCURRENTLY` is illegal inside one and leaves an INVALID index if it fails. The table has 22 rows; the lock is imperceptible.

Also create the matching rollback at `server/src/migrations/rollback/021_reference_resume_key_down.sql`, following the style of the existing `rollback/*_down.sql` files:

```sql
DROP INDEX IF EXISTS public.idx_intakes_build_reference_unique;
```

Do **not** apply either migration to the live database. Leave it for explicit authorization.

### Task 1.2 — Collision retry

Update `server/src/lib/reference.ts`.

`generateBuildReferenceNumber()` currently computes the reference and returns it unconditionally. Add a bounded retry so a unique-violation on insert does not surface as a raw Postgres error:

- Attempt generation up to **3 times**, drawing a fresh random suffix each attempt.
- Before returning a candidate, check it is not already present in `intakes.build_reference_number`. The `count`-based sequence already reads the table, so one extra targeted lookup per attempt is acceptable at this volume.
- After 3 exhausted attempts, throw `new Error("REFERENCE_GENERATION_FAILED")`.

Then handle that error in `server/src/routes/intakes.ts`. `handleSubmitOrDiscard` already has a typed-error ladder around the `persistIntake` call (`INTAKE_NOT_FOUND`, `ASSET_SCOPE_MISMATCH`, `IDEMPOTENCY_CONFLICT`). Add a branch for `REFERENCE_GENERATION_FAILED` returning **503** with the message `"Could not issue a reference number. Please retry."` — it is transient and retryable, unlike the existing 4xx cases.

Note that `generateBuildReferenceNumber()` is called from two places: `handleSubmitOrDiscard` (first persistence) and the update branch of `persistIntake` (backfill when an existing row has no reference). Both must surface the error the same way.

### Task 1.3 — Tests

Add to `server/src/__tests__/` following the existing patterns in that directory (vitest, `npm test` from `server/`).

Cover:
- A generated reference matches `/^MTH-\d{4}-\d{4}-[0-9A-F]{4}$/`.
- When the first candidate already exists, generation retries and returns a different, unused reference.
- When every attempt collides, it throws `REFERENCE_GENERATION_FAILED`.
- The route maps `REFERENCE_GENERATION_FAILED` to a 503 with the expected body.

Mock the Supabase client the way the existing server tests do — do not hit a live database.

### Verification

Run from `server/`:

```bash
npm test
```

```bash
npm run migrate:verify
```

`migrate:verify` checks that every `CREATE POLICY` has a preceding `DROP POLICY IF EXISTS`. This migration adds no policies, so it should pass untouched — run it to confirm nothing regressed.

Also confirm `npx tsc --noEmit` is clean from `server/`.

### Constraints

- Do not apply the migration to the live Supabase project. Report that it is ready and wait for authorization.
- Do not commit or push. Per `AGENTS.md`, commits require explicit authorization.
- Do not touch `src/App.tsx`, `src/data/flow.ts`, or `src/types/intake.ts` — those are Phase 3.
- Do not add the `by-reference` route — that is Phase 2.

### Done when

- `021_reference_resume_key.sql` and its rollback exist and are idempotent.
- `generateBuildReferenceNumber()` retries and throws a typed error on exhaustion.
- The route returns 503 for that error, from both call sites.
- `npm test`, `npm run migrate:verify`, and `tsc --noEmit` all pass.
- The migration is reported as pending, not applied.
