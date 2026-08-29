# Phase 3 Execution Prompt — Entry Step & Frontend Draft Recovery

Paste the block below into a fresh session. It is self-contained.

---

## Prompt

Repository: `D:\MTHRYVW\Intake-form` (M-THRYVE Intake Form — React + Vite frontend, Express + Supabase API server).

Implement **Phase 3** of the entry-gate / reference-recovery work described in `docs/briefings/entry-gate-reference-recovery.md`. Read that briefing first for context, then do only Phase 3. Do not start Phases 4–5.

### Where things stand

**Phases 1 and 2 are complete and verified.**

- `server/src/lib/reference.ts` retries reference generation and throws `REFERENCE_GENERATION_FAILED`; the route maps it to a 503.
- `server/src/routes/intakes.ts` exposes `loadIntakeForResume(intakeId)` shared by two routes:
  - `GET /api/intakes/:intakeId` — the existing UUID-keyed resume, response envelope unchanged
  - `GET /api/intakes/by-reference/:reference` — new; normalizes input, validates `/^MTH-\d{4}-\d{4}-[0-9A-F]{4}$/`, resolves reference → id, returns the **identical** envelope
- 21 tests in `server/src/__tests__/intake-resume-read.test.ts` cover both routes, including envelope byte-equality between them.

**Both routes return the same shape**, so the frontend can use one rehydration path for both.

**The migration `021_reference_resume_key.sql` is still NOT applied to the live database** (verified — `idx_intakes_build_reference_unique` is absent). This does not block Phase 3 work, but nothing in this feature may deploy until it is applied. Repeat this in your final report.

### Server response contract you are consuming

`GET /api/intakes/by-reference/:reference` returns:

- **200** `{ success: true, intake: { intakeId, clientId, referenceNumber, status, lifecycleStatus, outcome, payload, missingRequirements, uploadedAssets, operatorNotes, hasBuildCard, createdAt, updatedAt } }`
- **400** `{ success: false, error: "Invalid reference number format" }` — malformed input, no DB call made
- **404** `{ success: false, error: "No intake found for that reference number" }`
- **429** `{ success: false, error: "Too many lookup attempts. Please wait before trying again." }` — 10 failed lookups per user in 5 minutes
- **500** `{ success: false, error: "Failed to reopen intake" }`

Each status needs its own operator-facing message on the entry step. A 404 here almost always means a typo; a 429 means wait; a 400 means the format is wrong before anything was even looked up.

### Task 3.1 — Add the step

Add `'entry'` to the `StepId` union in `src/types/intake.ts:269`.

In `src/data/flow.ts`, prepend it to `base` so it leads every flow variant:

```ts
const base: StepId[] = ['entry', 'intro', 'build-approach', 'client-details']
```

`validateStep` in `src/data/validation.ts:29` is a switch with a default that produces no errors, so `'entry'` needs no case there. Confirm this rather than assuming.

### Task 3.2 — Fix the navigation arithmetic

`'intro'` is currently special-cased as the first step in **five** places in `src/App.tsx`. All five need `'entry'` handled too. Find each and reason about it — do not blind-replace:

1. **`progressTotal`** (~line 1265) — `flow.length - 2` becomes `- 3`, since the flow gained a step that is not part of the counted progress
2. **`progressPct`** (~line 1266) — currently zero-cases `'intro'` and `'build-card'`; add `'entry'`
3. **Top bar** (~line 1752) — `currentStep !== 'intro' && currentStep !== 'build-card'` gates the `Step X of Y` label and the discard button. The discard button must not appear on `entry`; there is nothing to discard yet
4. **Nav container** (~line 3170) — `justifyContent: currentStep === 'intro' ? 'flex-end' : 'space-between'`
5. **Back / Continue buttons** (~lines 3171-3179) — Back must not render on `entry`; the primary Continue button must not render on `entry` at all

For (5), the cleanest approach mirrors how `'outcome'` is already handled: the whole nav block is wrapped in `!submitting && currentStep !== 'outcome'`. Extend that condition to exclude `'entry'` as well, since both actions on the entry step are card-local.

Also add an early return for `'entry'` in `handleNext` (~line 1462), matching the existing `if (currentStep === 'outcome') return`.

### Task 3.3 — Build the entry step UI

Render it in the same visual language as the existing `intro` step (~line 1805) — the dark card style, `monoLabel` eyebrow, `Icon` components. Do not introduce a new design system.

Two cards:

- **Start a new intake** → `setStepIndex(flow.indexOf('intro'))`. Nothing else changes; the existing path stays exactly as it is.
- **Resume a saved draft** → reveals a monospace reference input with an `MTH-` format hint, inline client-side format validation, and a `Recover Draft` button.

Client-side, validate against the same pattern the server uses before making a request, so an obvious typo does not consume a throttle slot.

### Task 3.4 — Recovery handler

Add `resumeByReference(reference)` to `src/api/intake.ts`, next to the existing `getIntakeDraft` (line 271). Model it on that function — same `credentials: 'include'`, same `getApiAuthHeaders()`, same error envelope shape.

Then refactor the resume path so both entry points share one code path:

**Extract the body of the mount effect** (`src/App.tsx:1287-1331`, inside `getIntakeDraft(...).then(...)`) into a shared `applyResumedIntake(record)` function. The URL-driven effect and the new reference-driven handler must both call it, so the two paths cannot drift.

`applyResumedIntake` keeps the existing guard ladder exactly:

1. Missing `intakeId` / `clientId` / `referenceNumber` → "returned without stable identifiers"
2. `outcome === 'submitted' && !hasBuildCard` → "contact an administrator"
3. **New:** `outcome === 'discarded'` → "This intake was discarded and cannot be resumed"

The server returns discarded intakes without objection; this guard is deliberately client-side.

On success it does what the effect does today: `rehydrateDraftState` → merge over `EMPTY_FORM` → `setForm` / `setPageContents` → the identifier setters → `setResumeEditingStep` → `setOutcomeFinalized` → `setStepIndex` by outcome.

### Task 3.5 — Failure UX

Errors render **inline on the entry step**, never as a full-page takeover.

A failed lookup must leave the operator on `entry` with the reference input still populated so a typo can be corrected. It must never drop them into a blank wizard — that would silently discard whatever they had typed.

Note that the mount effect already has `resumeState === 'loading'` and `'error'` branches (~lines 1789-1800). Since `entry` is now step 0, a URL-driven resume would briefly flash the entry cards before rehydrating. Suppress the entry cards while `resumeState === 'loading'` so the existing loading branch shows instead.

### Task 3.6 — Tests

Add `src/__tests__/entry-step.test.tsx`, following the patterns in `src/__tests__/inline-validation.integration.test.tsx` (vitest + Testing Library; `npm test` from the repo root).

Cover:
- `entry` renders on mount, before `intro`
- "Start a new intake" advances to `intro`
- A client-side-invalid reference is rejected without any fetch
- A valid reference rehydrates the form and lands on `draft-saved`
- 404 / 429 / 500 each surface their own message, and the operator stays on `entry` with the input intact
- A `discarded` outcome is refused with the new message

**Existing suites will break** where they assume `stepIndex 0 === intro`. Check and update at minimum `src/__tests__/inline-validation.integration.test.tsx` and `src/__tests__/prompt5-assets-rehydration.test.tsx`. Update them to step through `entry` rather than weakening the assertions.

### Verification

From the repo root:

```bash
npm test
```

```bash
npx tsc --noEmit
```

Then verify in the browser. A Vite dev server runs on port `8443` (`npm run dev`) and the API server must be running separately (`cd server && npm run dev`). Confirm: the entry step is the first thing rendered, "Start a new intake" reaches the existing intro, and a reference number recovered from a real saved draft rehydrates the form.

**Known pre-existing server-side failures — do not fix, do not count as regressions:** `build-card-lifecycle.test.ts` (mock-hoisting bug), `prompt5-assets.test.ts` (422/201 mismatch), `validation.test.ts`.

### Constraints

- Do not commit or push. Per `AGENTS.md`, commits require explicit authorization.
- Do not apply the migration.
- Do not touch `server/src/` — Phase 2 is done and its contract is fixed.
- Do not change the `draft-saved` identifier card yet — demoting Intake ID and Client ID is Phase 4.
- Do not add dependencies.
- Follow the existing code style in `App.tsx`: inline style objects, no CSS modules, no new component library.

### Done when

- `entry` is the first step in every flow variant, with correct progress arithmetic and no stray Back/Continue/discard controls.
- "Start a new intake" reaches the existing intro path unchanged.
- A reference number recovers a draft through the same `applyResumedIntake` path the URL resume uses.
- 400 / 404 / 429 / 500 and the discarded case each produce a distinct inline message, with the operator left on `entry` and their input preserved.
- `npm test` and `tsc --noEmit` pass, with existing step-index-dependent suites updated rather than weakened.
- The migration is reported as still pending.
