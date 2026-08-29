# Phase 4 Execution Prompt — Promote the Reference, Demote the Internal IDs

Paste the block below into a fresh session. It is self-contained.

---

## Prompt

Repository: `D:\MTHRYVW\Intake-form` (M-THRYVE Intake Form — React + Vite frontend, Express + Supabase API server).

Implement **Phase 4** of the entry-gate / reference-recovery work described in `docs/briefings/entry-gate-reference-recovery.md`, plus the Phase 3 cleanup in Task 4.0 below. Read that briefing first for context. Do not start Phase 5.

### Where things stand

Phases 1–3 are complete and verified:

- **Phase 1** — `reference.ts` retries generation, throws `REFERENCE_GENERATION_FAILED`, route maps it to 503.
- **Phase 2** — `loadIntakeForResume()` is shared by `GET /api/intakes/:intakeId` and the new `GET /api/intakes/by-reference/:reference`. 21 tests, including envelope byte-equality between the two routes.
- **Phase 3** — `'entry'` leads every flow; the entry step offers "Start a new intake" and "Resume by reference"; `applyResumedIntake()` is shared by the URL-driven and reference-driven paths; 400/404/429/500 and discarded each get an inline message.

Current test state — **these are the known-good baselines, do not try to fix them:**
- Frontend `npx vitest run` → 173 pass, 1 fail (`auth.test.ts`, a `window.sessionStorage` issue, pre-existing and unrelated)
- Server `cd server && npm test` → 377 pass, 3 fail (`build-card-lifecycle.test.ts` mock-hoisting bug, `prompt5-assets.test.ts` 422/201 mismatch, `validation.test.ts`)

**Migration `021_reference_resume_key.sql` is still NOT applied to the live database.** Verified — `idx_intakes_build_reference_unique` is absent. Nothing in this feature ships until it is applied. Repeat this in your final report.

### Task 4.0 — Clean up four Phase 3 leftovers

These were found in review. All are small; do them first.

**(a) Dead branch in `handleRecoverDraft`** (`src/App.tsx` ~line 1509). The code reads:

```ts
if (err.includes('discarded')) {
  setEntryError('This intake was discarded and cannot be resumed.')
} else {
  setEntryError(err)
}
```

`applyResumedIntake` returns exactly that string for the discarded case, so both branches set an identical value. Worse, it branches by substring-matching an error message, which silently breaks if the wording ever changes. Collapse it to `setEntryError(err)`.

**(b) Unreachable `else` in `applyResumedIntake`** (`src/App.tsx` ~line 1319). The final `else { setStepIndex(...indexOf('outcome')) }` was only reachable for a `discarded` outcome, which now returns early at the guard above it. Remove the dead branch, or restructure the conditional so the remaining `draft` / `submitted` cases are explicit.

**(c) Network errors lose their detail.** `resumeByReference` in `src/api/intake.ts` returns no `httpStatus` from its `catch`, so an unreachable API server falls through to the generic "Something went wrong. Please try again." Compare `persistDraft` in `App.tsx`, which surfaces a specific "API server not reachable" message with the underlying detail in dev. Give the entry step the same treatment so a dev running without `cd server && npm run dev` is told what is actually wrong.

**(d) Record an out-of-scope test fix.** Phase 3 changed `Apex Business` → `Distribution Center` in `src/__tests__/phase5b-inline-validation.test.tsx`. That is a template-catalogue rename unrelated to the entry step — the test was already failing at baseline for that reason. No action needed; just note it in your report so the "no regressions" baseline stays honest.

### Task 4.1 — Promote the reference number

In the `draft-saved` card (`src/App.tsx` ~lines 3054-3100), the "Draft Identifiers" block currently gives the reference number, Client ID, and Intake ID near-equal visual weight.

The reference number is the one thing the client keeps and the one thing they can act on — it is now literally the key they type into the entry step to get back in. Make it the hero of that card:

- Larger than the current 20px, in the existing gold (`#F5B400`) treatment
- Keep the existing copy button and `copiedRef` behaviour
- Replace the current supporting line ("Use this reference when contacting M-THRYVE about this draft. No Build Card has been generated yet.") with copy that tells the client what the number is *for* — that keeping it is how this draft gets reopened and finished later. Write it in the user's own terms; do not mention endpoints, UUIDs, or lookups.

Match the existing dark-card visual language. Do not introduce a new design system, CSS modules, or dependencies.

### Task 4.2 — Demote the internal identifiers

Move **Client ID** and **Intake ID** into a collapsed disclosure inside the same card — a native `<details>` labelled "Internal identifiers" is the right primitive.

They stay one click away for support work; they stop competing with the reference number for the client's attention.

Both must remain in the DOM when expanded, with their existing monospace treatment and `wordBreak: 'break-all'`.

Give the `<summary>` a visible keyboard focus state, consistent with the other controls on the page.

### Task 4.3 — Confirm build-card needs no change

The `build-card` step (~line 3169) already renders only the Build Reference Number — the comment there reads "first and only appearance" and there is no ID trio to demote. Confirm this by reading it; do not change it.

### Task 4.4 — Leave the console untouched

`src/console/IntakeDetail.tsx` and `src/console/ReviewQueue.tsx` must not change. Those are operator surfaces where the UUIDs *are* the working identifier. This phase is about the client-facing confirmation card only.

### What must not change

Both IDs stay in every API response and in component state. `App.tsx` still guards on all three identifiers being present before advancing a step, and `assetBinding` still requires all three (`src/App.tsx` ~line 1560, the `savedIntakeId && savedClientId && savedReferenceNumber` check). **This phase is presentation only** — if you find yourself editing `persistDraft`, `handleSubmitIntake`, or `ensureAssetBinding`, stop and reconsider.

### Task 4.5 — Tests

Extend `src/__tests__/entry-step.test.tsx` or add a sibling:

- After a draft save, the reference number is visible on `draft-saved` without any interaction
- Client ID and Intake ID are **not** visible until the disclosure is expanded
- Expanding the disclosure reveals both, with their full values intact
- The copy button still copies the reference number

Check whether any existing test asserts on the current always-visible Client ID / Intake ID layout and update it if so.

### Verification

From the repo root:

```bash
npx vitest run
```

```bash
npx tsc --noEmit
```

Then confirm in the browser. Vite dev server runs on port `8443` (`npm run dev`); the API server runs separately (`cd server && npm run dev`). Save a draft, confirm the reference number reads as the primary artifact of that screen, then copy it, reload to the entry step, and recover the draft with it. That round trip is the real acceptance test for Phases 1–4 together.

### Constraints

- Do not commit or push. Per `AGENTS.md`, commits require explicit authorization.
- Do not apply the migration.
- Do not touch `server/src/`.
- Do not add dependencies.
- Follow the existing style in `App.tsx`: inline style objects, no CSS modules.

### Done when

- The four Task 4.0 cleanups are done and the discarded-guard message flows through one path.
- The reference number is unmistakably the primary element of the `draft-saved` card, with copy explaining what it is for.
- Client ID and Intake ID are present but collapsed, keyboard-accessible.
- `assetBinding` and the three-identifier guards are untouched.
- `npx vitest run` shows no new failures beyond the known `auth.test.ts`, and `tsc --noEmit` is clean.
- The save → copy → recover round trip works end to end in the browser.
- The migration is reported as still pending.
