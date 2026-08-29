# Briefing — Entry Gate & Reference-Based Draft Recovery

**Status:** Draft — awaiting approval
**Date:** 2026-08-29
**Scope:** `src/App.tsx`, `src/data/flow.ts`, `src/types/intake.ts`, `src/api/intake.ts`, `server/src/routes/intakes.ts`, `server/src/lib/reference.ts`, new migration `021`

---

## 1. What is being asked

The intake wizard should open on a choice, not on the pitch:

- **Start a new intake**, or
- **Resume a drafted one**, recovered by its **reference number**.

Alongside that, the three identifiers get explicit roles:

| Identifier | Role after this change |
|---|---|
| **Reference number** (`MTH-YYMM-NNNN-XXXX`) | The client-facing handle. What a client keeps and quotes to finish and submit a real build. |
| **Intake ID** (UUID) | Internal. Row identity, asset binding, console deep links. |
| **Client ID** (UUID) | Internal. Cross-intake identity resolved from the email. |

---

## 2. How it works today

**Draft saves already issue a reference number.** `handleSubmitOrDiscard` generates one on first persistence — draft *or* submit — and never regenerates it (`server/src/routes/intakes.ts:372`). The number a client receives on their first draft-save is the same one on the final Build Card. Discards never get one.

**Resume already exists, but only by UUID.** A mount effect in `src/App.tsx:1277` reads `?resume=`, `?intakeId=`, or `/resume/<uuid>` and calls `GET /api/intakes/:intakeId`, which rebuilds the full payload from `submission_payload` plus live joins on assets, scope items, questionnaire, and build cards. The route is UUID-only by deliberate design, with no enumeration endpoint.

**Client ID is resolved server-side, never by the frontend.** A `BEFORE INSERT` trigger on `intakes` normalizes the submitted email — lowercase, `+tag` stripped — and matches it against a unique index on `clients.normalized_email` (`server/src/migrations/013_client_identity.sql:225`).

**The gap:** nothing is persisted to `localStorage`, and the reference number — the one thing the client actually keeps — is not a lookup key anywhere in the system. A client who closes the tab has their number on screen and no way to use it.

---

## 3. Findings from the live system

### 3.1 The reference number has no unique index — blocker

Migration `000_phase2_intake_schema.sql:32` declares `build_reference_number text UNIQUE`, but the deployed `intakes` table carries only `intakes_pkey`. There is no unique constraint and no index of any kind on the column.

This is harmless today because nothing looks up by reference. The moment it becomes the resume key, a duplicate makes recovery ambiguous and every lookup becomes a sequential scan.

**Current data is clean** — 22 rows, 21 references, 21 distinct, 1 NULL from a discard. A partial unique index can be added now with no backfill.

### 3.2 Reference-based resume is safe here — because the operator is the one using it

`/api/intakes` sits behind `requireAuth` (`server/src/index.ts:63`). The client quotes their number to an operator who is *already authenticated*. The reference functions as a lookup key, not a bearer token.

That boundary is load-bearing. `MTH-YYMM-NNNN-XXXX` carries only 4 hex characters of real entropy — the year, month, and sequence are all predictable. If this ever becomes client-facing self-service resume, the reference alone is not sufficient authentication and must be paired with the email address.

### 3.3 The reference generator is racy

`generateBuildReferenceNumber()` derives its sequence from `count(*)` over the current month. Under concurrency two intakes can compute the same sequence; only the 4 random hex characters keep them apart. Today a collision would write a silent duplicate. Once the unique index lands, it becomes a failed insert instead — which needs handling.

---

## 4. Plan

### Phase 1 — Database

**1.1** New migration `021_reference_resume_key.sql`:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_intakes_build_reference_unique
  ON public.intakes (build_reference_number)
  WHERE build_reference_number IS NOT NULL;
```

Partial, so the discard path (which never issues a reference) keeps working. Doubles as the lookup index.

**1.2** Add collision retry to `server/src/lib/reference.ts` — 3 attempts with a fresh random suffix each, then a typed `REFERENCE_GENERATION_FAILED`.

### Phase 2 — Server: lookup by reference

**2.1** Extract the body of `GET /api/intakes/:intakeId` (`intakes.ts:61-158`) into a shared `loadIntakeForResume(intakeId)`. The existing route becomes a thin caller. No behaviour change — this exists so both entry points produce byte-identical rehydration payloads.

**2.2** New route `GET /api/intakes/by-reference/:reference`, registered **before** `/:intakeId` so the UUID matcher cannot swallow it:

- Normalize — `trim().toUpperCase().replace(/\s+/g, '')`
- Validate against `/^MTH-\d{4}-\d{4}-[0-9A-F]{4}$/` → `400` on miss, before any DB hit
- Resolve reference → `id` → `404 No intake found for that reference number` when absent
- Delegate to `loadIntakeForResume(id)`, return the identical envelope

**2.3** Write a `resume_lookup` audit event on every resolved hit. Add a per-session throttle — 10 failed lookups in 5 minutes → `429`. This defends against a compromised operator session brute-forcing the hex suffix; it is not a defence against the client.

### Phase 3 — Frontend: the entry step

**3.1** Add `'entry'` to the `StepId` union (`src/types/intake.ts:269`) and prepend it to `base` in `src/data/flow.ts` so it leads every flow variant.

**3.2** Fix the navigation arithmetic — three places assume `intro` is index 0:

- `progressTotal = flow.length - 2` → `- 3`
- `progressPct` zero-cases `'intro'` and `'build-card'` → add `'entry'` (`App.tsx:1266`)
- The back button and the `Step {stepIndex} of {progressTotal}` label (`App.tsx:1753`) must exclude `entry`

**3.3** Build the step — two cards in the existing intro card styling:

- **Start a new intake** → `setStepIndex(flow.indexOf('intro'))`. The current path is otherwise untouched.
- **Resume a saved draft** → reveals a monospace reference input with an `MTH-` prefix hint, inline format validation, and a `Recover Draft` button.

The entry step suppresses the global Continue button entirely, the way `outcome` already does — both actions are card-local.

**3.4** Add `resumeByReference(reference)` to `src/api/intake.ts` and a `handleRecoverDraft` reusing the exact guard ladder already in the mount effect (`App.tsx:1287-1331`):

1. `!success || !record` → surface `response.error`
2. Missing `intakeId` / `clientId` / `referenceNumber` → "returned without stable identifiers"
3. `submitted && !hasBuildCard` → "contact an administrator"
4. `outcome === 'discarded'` → **new** — "This intake was discarded and cannot be resumed"

Extract the effect body into a shared `applyResumedIntake(record)` that both the URL effect and the new handler call, so the two paths cannot drift.

**3.5** Errors render inline on the entry step, never as a full-page takeover. A failed lookup leaves the operator on the entry step with the field populated so a typo can be corrected — it must never bounce them into a blank wizard.

### Phase 4 — Demote the internal identifiers

In the `draft-saved` card (`App.tsx:2921-2949`):

- **Reference number** becomes the hero — larger, existing gold treatment, copy button, and new supporting copy: *"Keep this number. It's how you or M-THRYVE reopen this draft to finish and submit your build."*
- **Intake ID** and **Client ID** move into a collapsed "Internal identifiers" disclosure — one click away for support, no longer competing with the reference.

Same treatment on `build-card` if it renders the trio. `IntakeDetail.tsx` and `ReviewQueue.tsx` are untouched — those are console surfaces where the UUIDs are the working identifier.

Both IDs remain in every API response. `App.tsx` still guards on all three being present, and `assetBinding` still requires all three (`App.tsx:1560`). This is presentation only.

### Phase 5 — Docs & tests

**Server** — new `server/src/__tests__/reference-resume.test.ts`: format rejection, unknown reference → 404, draft → full payload, submitted-with-card → payload, discarded → flagged, case and whitespace normalization, throttle trip. Plus a `reference.test.ts` case for retry-on-collision.

**Frontend** — new `src/__tests__/entry-step.test.tsx`: entry renders first on mount, "Start new" reaches `intro`, a valid reference rehydrates the form and lands on `draft-saved`, a bad reference keeps the operator on entry with the input intact.

Existing suites that assume `stepIndex 0 === intro` need updating — `inline-validation.integration.test.tsx` and `prompt5-assets-rehydration.test.tsx` are the likely ones.

**Docs** — `docs/support/resubmission-procedure.md` gains a "Recovering a draft by reference number" section. The `/resume/<uuid>` path stays documented as the console deep link.

---

## 5. Sequencing

Phase 1 → 2 → 3 → 4 → 5.

Phase 1 must land before Phase 2 ships, or concurrent references can go duplicate and make lookup ambiguous. Phases 3 and 4 are independent of each other and can be one commit each.

---

## 6. Open decisions

**The entry gate is unconditional.** Every operator hits a chooser on every session, including the common "just start a new one" case. A lighter alternative is a subtle "Have a reference number?" link on the existing intro step. The gate was requested explicitly and is what this plan builds — the alternative is noted, not recommended over it.

**Discarded intakes cannot be looked up by reference.** A discard never issues a reference number, so guard 4 in Phase 3.4 only fires for an intake discarded *after* a draft-save had already issued one. Confirm this is intended, versus allowing a discarded draft to be reopened.

**Client-facing self-service resume is out of scope.** If it is ever wanted, Section 3.2 applies: the reference must be paired with the email address before it can authenticate anyone outside an operator session.
