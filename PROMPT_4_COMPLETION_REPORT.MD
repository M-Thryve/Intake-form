# PROMPT 4 COMPLETION REPORT
## M-THRYVE Intake Form v3.0 — Draft/Submit Lifecycle, Stable Identifiers, Draft Saved, Follow-up Outbox

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm --prefix server test` | ✅ 327/327 passed |
| `npm --prefix server run build` | ✅ Clean |
| `npm run type-check` | ✅ Clean |
| `npm run build` | ✅ Clean |
| `npm test` | ✅ 158/158 passed |

---

## Claim-by-Claim Evidence

### 1. Generate Reference Number on First Persistence (Draft AND Submit) — D-1 Fix

**File:** `server/src/routes/intakes.ts`

**Before (D-1 bug):**
```typescript
const buildRef = command === "submit" ? await generateBuildReferenceNumber() : null;
```

**After:**
```typescript
const buildRef = command === "discard"
  ? null
  : (existingIntakeId ? null : await generateBuildReferenceNumber());
```

- `save_draft` without `intakeId` → generates reference ✅
- `submit` without `intakeId` → generates reference ✅
- Re-save with `existingIntakeId` → skips generation (reference already assigned) ✅
- `discard` → always null ✅

**Test evidence:** `lifecycle.test.ts` Test 1 now asserts `toBe("MTH-20260806-FAKE-TEST")` for `save_draft`.

---

### 2. clientId Sourced from `intakes.client_id` — D-2 Fix

**File:** `server/src/routes/intakes.ts`

**Before (D-2 bug):** clientId read from `intake_clients.id` (wrong table/column).

**After:**
```typescript
// D-2 fix: clientId lives on intakes.client_id, not intake_clients.id
let clientId: string | null = null;
if (intakeId && !rpcResponseBody) {
  const { data: intakeRow } = await supabase
    .from("intakes")
    .select("client_id")
    .eq("id", intakeId)
    .maybeSingle();
  if (intakeRow) clientId = (intakeRow as Record<string, string>).client_id ?? null;
}
```

---

### 3. Remove Client-Side Fallback clientId Fabrication — D-3 Fix

**File:** `src/App.tsx`

**Before (D-3 bug):**
```typescript
setClientVoucher(response.clientId || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)
```

**After:**
```typescript
if (response.clientId) setClientVoucher(response.clientId)
```

No fallback fabrication. If the server returns no clientId, the voucher state is left unchanged.

---

### 4. `intakeId` Update Path — D-4 Fix (No New Row on Re-Save)

**File:** `server/src/routes/intakes.ts`

- `existingIntakeId` extracted from `req.body.intakeId`
- Threaded through `handleSubmitOrDiscard` → `persistIntake`
- New update branch at top of `persistIntake`: if `existingIntakeId` present, does `UPDATE intakes SET status=... WHERE id=...` instead of calling the RPC
- Returns existing `build_reference_number` from the DB row
- Idempotency key and audit event still written on re-save

**Frontend (`src/api/intake.ts`):** `lifecycleOp`, `saveDraft`, `submitIntakeForReview` all accept and forward `intakeId`.

**Frontend (`src/App.tsx`):**
- `savedIntakeId` state stores the server-assigned ID after first draft save
- Subsequent `saveDraft` calls pass `savedIntakeId` to the API

---

### 5. Navigate to `draft-saved` Step After Successful Draft Save

**File:** `src/App.tsx`

**Before:** `setOutcomeFinalized('draft')` only — showed inline banner on the outcome page.

**After:**
```typescript
setStepIndex(flow.indexOf('draft-saved'))
```

The `draft-saved` step is already part of the flow (confirmed in `src/data/flow.ts`). The step now renders a dedicated confirmation page with:
- Amber "Draft Saved" status chip
- "Intake Saved as Draft" heading
- Draft identifiers panel (Reference Number + Intake ID with copy button)
- Missing requirements list (up to 8 items shown, with overflow count)
- "Continue Editing" button → returns to review step
- "Submit for Review" button → calls `handleSubmitIntake`, disabled if requirements remain

---

### 6. `draft_saved` Outbox Entry Written

**File:** `server/src/routes/intakes.ts`

Written for **first persistence** (new intake, no `existingIntakeId`):
```typescript
if (isDraft && intakeId) {
  await supabase.from("notification_outbox").upsert(
    {
      intake_id: intakeId,
      event_type: "draft_saved",
      channel: "email",
      recipient_ref: clientId,
      payload: { intakeId, clientId, referenceNumber: buildRef, status: "draft", outcome: "draft" },
    },
    { onConflict: "intake_id,event_type", ignoreDuplicates: true },
  );
}
```

Also written for **re-saves** (update path, `existingIntakeId` present) with the same ON CONFLICT deduplication.

Deduplication: `upsert` with `ignoreDuplicates: true` on the `intake_id,event_type` partial unique index — re-saves do not create duplicate outbox rows.

---

### 7. Type Contract Updates

**File:** `src/types/intake.ts`

- `FormData`: added `intakeId?`, `clientId?`, `referenceNumber?` (stable identifiers stored in form state)
- `IntakeSubmissionPayload`: added `intakeId?` (sent on re-saves for update path routing)
- `IntakeSubmissionResponse`: added `referenceNumber?: string | null`, `command?: string`; widened `buildReferenceNumber` to `string | null`

---

### 8. Use `submitIntakeForReview` (Not Deprecated `submitIntake`)

**File:** `src/App.tsx`

```typescript
// Before (using deprecated function)
const response = await submitIntake(payload, getLifecycleKey('submit'))

// After
const response = await submitIntakeForReview(payload, getLifecycleKey('submit'), savedIntakeId || undefined)
```

`submitIntakeForReview` added to imports; `submitIntake` import retained for any legacy callers.

---

## Files Changed

| File | Nature of Change |
|------|-----------------|
| `server/src/routes/intakes.ts` | D-1 buildRef fix, D-2 clientId fix, intakeId update path, draft_saved outbox |
| `server/src/__tests__/lifecycle.test.ts` | Test 1: save_draft buildReferenceNumber now non-null |
| `server/src/__tests__/e2e-intake-lifecycle.test.ts` | Test 17: save_draft buildReferenceNumber now matches MTH pattern |
| `src/types/intake.ts` | Added intakeId/clientId/referenceNumber to FormData; intakeId to Payload; referenceNumber/command to Response |
| `src/api/intake.ts` | Pass intakeId through lifecycleOp, saveDraft, submitIntakeForReview |
| `src/App.tsx` | D-3 fallback removal, draft-saved navigation, draft-saved step render, submitIntakeForReview import |
| `src/__tests__/inline-validation.integration.test.tsx` | Updated draft-save assertion to match new step text |
| `src/__tests__/phase5b-inline-validation.test.tsx` | Updated draft-save assertion to match new step text |

---

## Deferred Prompt 5 Work

The following are explicitly NOT implemented (Prompt 5 scope):

- Draft recovery/resume flow (loading a draft by intakeId from URL param or storage)
- Email dispatch from the outbox (outbox is written but not consumed)
- `notification_outbox` worker/polling
- `intake_submitted` outbox entry (separate from `draft_saved`)
- Owner-review follow-up notifications
- Any client-portal read path

---

## Unresolved Contract Ambiguity

- **`referenceNumber` vs `buildReferenceNumber`**: The handover uses both names. The server response uses `buildReferenceNumber`; `IntakeSubmissionResponse` now carries both fields for compatibility. Future cleanup should canonicalize to one name.
- **`intakes.client_id` availability in mock**: The D-2 fix reads `intakes.client_id` via a SELECT after the RPC. In the test mocks, `maybeSingle` returns `null` by default, so `clientId` will be `null` in mock-based tests unless the mock is seeded. This is correct behavior — no mock changes required for existing tests.
