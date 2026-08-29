# Phase 5 Execution Prompt — Gaps, Docs, and Ship Readiness

Paste the block below into a fresh session. It is self-contained.

---

## Prompt

Repository: `D:\MTHRYVW\Intake-form` (M-THRYVE Intake Form — React + Vite frontend, Express + Supabase API server).

Implement **Phase 5** — the final phase — of the entry-gate / reference-recovery work described in `docs/briefings/entry-gate-reference-recovery.md`. Read that briefing first for context.

Phase 5 as originally scoped was "docs and tests", but tests were folded into Phases 2–4 as they were built. What remains is: close three open gaps, write the documentation, and bring the feature to a shippable state.

### Where things stand

Phases 1–4 are complete:

- **Phase 1** — `reference.ts` retries generation and throws `REFERENCE_GENERATION_FAILED`; the route maps it to 503.
- **Phase 2** — `loadIntakeForResume()` shared by `GET /api/intakes/:intakeId` and `GET /api/intakes/by-reference/:reference`; 21 tests including envelope byte-equality.
- **Phase 3** — `'entry'` leads every flow; entry step offers "Start a new intake" and "Resume by reference"; `applyResumedIntake()` shared by both resume paths.
- **Phase 4** — reference number promoted to hero on `draft-saved`; Client ID and Intake ID collapsed into an "Internal identifiers" disclosure.

Current verified baselines — **do not try to fix these:**
- Frontend `npx vitest run` → 175 pass, 1 fail (`auth.test.ts`, a `window.sessionStorage` issue, pre-existing and unrelated)
- Server `cd server && npm test` → 377 pass, 3 fail (`build-card-lifecycle.test.ts` mock-hoisting bug, `prompt5-assets.test.ts` 422/201 mismatch, `validation.test.ts`)

### Task 5.0 — Close three open gaps

**(a) `outline: none` on the disclosure with no replacement — accessibility regression.**

`src/App.tsx` ~line 3073, the `<summary>` for "Internal identifiers" sets `outline: 'none'`. There is no `:focus` or `:focus-visible` rule anywhere in `src/index.css`, so a keyboard user tabbing to that control now gets no visual indication at all. Phase 4 was asked for a visible focus state and this removed the only one.

Inline styles cannot express `:focus-visible`, which is presumably why `outline: none` was reached for. Fix it properly: either drop `outline: 'none'` and let the UA default show, or add a `:focus-visible` rule to `src/index.css` and keep the custom treatment. Verify by tabbing to it in a browser — do not assume.

**(b) The chevron never rotates.**

The same `<summary>` renders an `Icon name="chevron-right"` with `transition: 'transform 0.15s'`, but nothing rotates it when the `<details>` opens — that requires a `details[open] summary svg` rule, which an inline style cannot express. Right now the transition is dead styling and the chevron points the same way open or closed, which reads as broken. Either add the CSS rule or remove the transition and the chevron.

While you are there, respect `prefers-reduced-motion` for any transform you add.

**(c) Task 4.0c was reported done but is not.**

`resumeByReference` in `src/api/intake.ts` now returns `httpStatus: 0` on a network failure, and its `error` field carries the real detail. But `handleRecoverDraft` in `src/App.tsx` (~line 1489) has no branch for status `0` — it falls into the final `else` and shows the generic "Something went wrong. Please try again." The detailed message is computed and then discarded.

The intent was to match `persistDraft`, which tells a developer the API server is unreachable and includes the underlying detail in dev. Add the missing branch so status `0` surfaces that message.

### Task 5.1 — Document the recovery flow

Add a section to `docs/support/resubmission-procedure.md`: **"Recovering a draft by reference number."**

Match the existing voice in that file — numbered operator steps, plain language, no endpoint or UUID talk in the client-facing parts. Cover:

- Where the client gets the number (the `draft-saved` screen, after any draft save)
- What the operator does: open the intake form, choose "Resume a saved draft" on the first screen, enter the reference
- Format `MTH-YYMM-NNNN-XXXX`; case and surrounding whitespace do not matter
- What each failure means in operator terms — reference not found (usually a typo), too many attempts (wait a few minutes), discarded intake (cannot be resumed)
- That `/resume/<uuid>` remains the console deep link for operators working from `IntakeDetail`, and is unchanged

Also review the three identifiers as described in the existing support docs — if any of them describe the Intake ID or Client ID as something the client is given or should quote, update that. The reference number is now the only client-facing handle.

### Task 5.2 — Apply the migration

`server/src/migrations/021_reference_resume_key.sql` has been pending through all four phases. Verified again: `idx_intakes_build_reference_unique` is **not** on the live database. The feature cannot ship without it — Phase 1's `referenceExists()` check is TOCTOU-racy, and the partial unique index is the only real guarantee that a reference resolves to at most one intake.

**Do not apply it yourself.** Instead, prepare it and hand it over:

1. Re-run the safety check and report the numbers:
   ```sql
   SELECT count(*) AS total,
          count(build_reference_number) AS with_ref,
          count(DISTINCT build_reference_number) AS distinct_ref
     FROM public.intakes;
   ```
   `with_ref` and `distinct_ref` must be equal. If they are not, **stop** — there are duplicate references and the index will fail. Report the duplicates instead of proceeding.
2. State the exact SQL to run and where (Supabase SQL Editor, project `lusziumbodejmtdzuzbf`, or `supabase db push`).
3. State the rollback: `server/src/migrations/rollback/021_reference_resume_key_down.sql`.

### Task 5.3 — End-to-end verification

With both servers running (`npm run dev` for Vite on `8443`, and `cd server && npm run dev`), walk the full round trip and report what you observed at each step:

1. Start a new intake from the entry step
2. Fill enough to save a draft; capture the reference number shown
3. Reload to the entry step, choose "Resume a saved draft", enter that reference
4. Confirm the form rehydrates with the same data and lands on `draft-saved`
5. Confirm the internal identifiers disclosure is collapsed, expands on click, and is reachable by keyboard
6. Try a well-formed but unknown reference and confirm the 404 message
7. Try a malformed reference and confirm it is rejected client-side without a network call

If anything fails, fix it and re-run. Do not report the phase complete on unverified steps.

### Task 5.4 — Final report

Produce a short summary covering:

- What shipped across all five phases, in one paragraph
- Every file added or modified, grouped by phase
- Final test counts for both suites, against the known baselines above
- The migration handover from Task 5.2
- Anything still outstanding

Note the two known unrelated issues so they are not lost: the `prompt5-assets.test.ts` 422/201 failure (invalid asset uploads being accepted — either a stale test or a real validation regression after commit `f8a3fc2`), and the `build-card-lifecycle.test.ts` mock-hoisting bug.

### Verification

```bash
npx vitest run
```

```bash
npx tsc --noEmit
```

```bash
cd server && npm test
```

### Constraints

- Do not apply the migration. Prepare and hand it over per Task 5.2.
- Do not commit or push. Per `AGENTS.md`, commits require explicit authorization.
- Do not fix the known pre-existing failures.
- Do not add dependencies.

### Done when

- The disclosure has a real keyboard focus state, verified in a browser.
- The chevron either animates correctly or is gone.
- A network failure on reference lookup shows the detailed unreachable-server message.
- `docs/support/resubmission-procedure.md` documents the recovery flow, and no support doc still tells a client to quote an Intake ID or Client ID.
- The migration is prepared with its safety check run and the numbers reported.
- The end-to-end round trip is verified step by step in a browser, not assumed.
- Both suites match their known baselines with no new failures.
