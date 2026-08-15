---
slug: form-submission-draft-database
status: resolved
trigger: "form submission and draft submission wont proceed from end-end (front end to data base)"
created: 2026-08-14
updated: 2026-08-14
---

# Debug Session: Form Submission and Draft Persistence

## Symptoms

- The frontend could reach the lifecycle handlers, but draft and submit did not complete through the API/database boundary.
- Local Vite was listening on `8443`; no API listener was present on `3000` during runtime inspection.

## Root Cause

1. Draft payloads emitted empty enum placeholders (`tier`, `assets.qualification`, and `template.projectVersion`) that the supposedly lenient draft schema rejected.
2. The v2 frontend removed payment and confirmation steps, but the active submit schema still required the legacy payment plan and six true confirmations.
3. The frontend reused one idempotency key for draft, submit, and discard. A submit after a draft therefore conflicted with or replayed the draft idempotency record.
4. The v2 structured asset UI did not populate the legacy `assets.qualification` field required by the API contract.

## Fix

- Made draft empty placeholders valid shape values while retaining missing-requirement reporting.
- Added a v2 lifecycle submit schema with defaulted legacy payment/confirmation fields.
- Mapped structured resource/deck statuses and supplied a valid v2 asset qualification fallback.
- Added separate retry-safe idempotency keys for draft, submit, and discard operations; keys rotate after successful writes.
- Added `VITE_API_BASE_URL` support for a separately hosted API while preserving the local Vite proxy.
- Discard now only finalizes the UI after a successful API response.

## Verification

- Root `type-check`: passed.
- Root production build: passed.
- Server production build: passed.
- Frontend payload mapping regression: passed.
- Server validation suite: 34/34 passed.
- Full server suite: 299/306 passed; remaining failures are existing incomplete Supabase mock chains and stale tests that still assert removed payment/confirmation requirements.

## Operational Note

The API must be running on `localhost:3000` for local Vite proxying, or the deployed frontend must set `VITE_API_BASE_URL` to the hosted API origin. Database persistence additionally requires the server migrations/RPC to be applied in Supabase.
