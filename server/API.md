# Intake API Reference

Base URL: `http://localhost:3000` (development)

## Health Check

### `GET /api/health`

Returns server status.

**Response (200)**
```json
{ "status": "ok", "environment": "development" }
```

---

## Intake Submission

### `POST /api/intakes`

Submit a new intake. See Phase 2 documentation for full payload contract.

**Request**
```json
{
  "idempotencyKey": "string (min 5 chars)",
  "intake": { /* IntakeSubmissionPayload */ }
}
```

**Responses**
- `201` — Intake created
- `200` — Idempotent replay (same key + same payload)
- `400` — Missing idempotency key or intake payload
- `409` — Idempotency key reused with different payload
- `422` — Validation errors

---

## Asset Pipeline

### `POST /api/assets/upload-request`

Request a signed upload URL for a file. The file is NOT sent through this endpoint — the client uploads directly to storage using the returned URL.

**Request**
```json
{
  "intakeId": "uuid",
  "filename": "logo.png",
  "mimeType": "image/png",
  "fileSizeBytes": 102400
}
```

**Response (201)**
```json
{
  "success": true,
  "assetId": "uuid",
  "uploadUrl": "https://...signed-upload-url...",
  "token": "upload-token",
  "storageKey": "intakes/{intakeId}/{timestamp}-logo.png",
  "expiresIn": 3600
}
```

**Errors**
- `404` — Intake not found
- `409` — Intake not in draft/submitted state
- `422` — Validation failed (bad MIME type, oversized, dangerous extension, path traversal)

**File validation rules:**
- Max size: configurable via `MAX_UPLOAD_SIZE_MB` (default 25MB)
- Allowed MIME types: images (jpeg, png, gif, webp, svg+xml), documents (pdf, docx, xlsx, pptx, txt, csv), fonts (ttf, otf, woff, woff2), media (mp4, webm, mpeg, wav), archives (zip)
- Blocked extensions: .exe, .bat, .cmd, .sh, .ps1, .dll, .jar, etc.
- No path traversal (`../`), no path separators in filenames

---

### `POST /api/assets/:assetId/confirm-upload`

Confirm that a file was successfully uploaded to storage. Call this after completing the PUT to the signed URL.

**Response (200)**
```json
{
  "success": true,
  "assetId": "uuid",
  "status": "uploaded",
  "message": "Upload confirmed — file verified in storage"
}
```

**Errors**
- `404` — Asset not found
- `409` — Asset not in pending state

---

### `PATCH /api/assets/:assetId/status`

Transition an asset to a new lifecycle state.

**Request**
```json
{
  "status": "scanning" | "ready" | "rejected" | "failed",
  "reason": "optional explanation"
}
```

**Response (200)**
```json
{
  "success": true,
  "assetId": "uuid",
  "previousStatus": "uploaded",
  "status": "scanning"
}
```

**Valid state transitions:**
```
pending   → uploaded, failed
uploaded  → scanning, ready, rejected, failed
scanning  → ready, rejected, failed
ready     → (terminal)
rejected  → (terminal)
failed    → (terminal)
```

---

### `GET /api/assets/intake/:intakeId`

List all assets for an intake with summary counts.

**Response (200)**
```json
{
  "success": true,
  "intakeId": "uuid",
  "assets": [
    {
      "id": "uuid",
      "original_filename": "logo.png",
      "mime_type": "image/png",
      "file_size_bytes": 102400,
      "asset_status": "ready",
      "scan_status": "clean",
      "rejection_reason": null,
      "uploaded_at": "2026-08-04T..."
    }
  ],
  "summary": {
    "total": 3,
    "ready": 2,
    "pending": 1,
    "rejected": 0,
    "failed": 0
  }
}
```

---

### `GET /api/assets/:assetId/download`

Generate a time-limited signed URL for downloading or previewing an asset.

**Response (200)**
```json
{
  "success": true,
  "assetId": "uuid",
  "downloadUrl": "https://...signed-download-url...",
  "filename": "logo.png",
  "expiresIn": 300
}
```

**Errors**
- `404` — Asset not found
- `409` — Asset upload not yet confirmed (still pending)

---

## Error Format

All error responses follow:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": [{ "field": "fieldName", "message": "Specific issue" }]
}
```

## Authentication

Currently all endpoints use the service-role key server-side. No client-side authentication is required in Phase 3. RLS policies are prepared for future authenticated access (see `server/src/migrations/001_rls_policies.sql`).

---

## Phase 6 — Agreement and Finance Handoff

All endpoints require `Authorization: Bearer <token>` (a Supabase user JWT or the shared internal service key). Role enforcement is per-endpoint; a `403` response indicates the caller's role is not permitted.

None of these endpoints capture payment or start a build. Marking a package "ready for build handoff" only signals the later, separate build-delivery gate is unblocked.

### `GET /api/agreement/intakes/:intakeId`

**Roles:** `owner`, `admin`, `finance`.

Returns the eligibility snapshot plus the latest agreement draft (or `null`).

**Response (200)**
```json
{
  "success": true,
  "eligibility": { "eligible": true, "snapshot": { /* ... */ } },
  "draft": { "id": "...", "version": 1, "status": "draft", "draft_package": { /* ... */ } }
}
```

### `POST /api/agreement/intakes/:intakeId`

**Roles:** `owner`, `admin`. Optional header: `Idempotency-Key`.

Creates a new agreement draft version from the approved intake + build card. Idempotent per `(intakeId, idempotencyKey)` — a repeat call with the same key returns the original draft. Any prior draft is marked `superseded`.

**Errors:**
- `409` — intake is not eligible (missing approval, superseded by later decision, blocked assets, missing build card, failed analysis).
- `422` — invalid request body.

**Response (201)**
```json
{
  "success": true,
  "draft": { "id": "...", "version": 1, "status": "draft", "draft_package": { /* ... */ } },
  "message": "Agreement draft prepared. Not legally executed. No payment captured. No build started."
}
```

### `POST /api/agreement/intakes/:intakeId/voucher`

**Roles:** `owner`, `admin`, `finance`.

**Request**
```json
{ "voucherCode": "MTH-REF-XYZ" }
```

Validates the voucher server-side against `vouchers`, computes the discount on the approved build card's `preliminary_price_php`, and records or updates a redemption row.

**Rejects (`422`):**
- `not_found`, `expired`, `already_used`, `revoked`, `self_redemption`, `duplicate_for_intake`, `invalid_status`.

**Response (200)**
```json
{
  "success": true,
  "validation": {
    "ok": true,
    "code": "valid",
    "voucherId": "...",
    "discountPercent": 10,
    "discountAmountPhp": 5000
  },
  "redemptionId": "...",
  "message": "Voucher recorded. Final commercial terms remain subject to finance approval."
}
```

### `GET /api/agreement/intakes/:intakeId/versions`

**Roles:** `owner`, `admin`, `finance`.

Returns the ordered version history for the intake's agreement drafts.

### `GET /api/finance/intakes/:intakeId`

**Roles:** `finance`, `owner`, `admin`.

Returns the finance handoff package: latest draft, payment preferences, and review history.

### `POST /api/finance/intakes/:intakeId/submit`

**Roles:** `owner`, `admin`.

Submits the current draft for finance review. Transition: `draft` or `finance_changes_required` → `pending_finance_review`.

**Request**
```json
{ "reason": "Submitting for finance review after voucher validated" }
```

### `PATCH /api/finance/intakes/:intakeId/review`

**Roles:** `finance`, `admin`.

Records a finance decision.

**Request**
```json
{
  "action": "approve | reject | request_changes",
  "reason": "min 5 chars, max 2000 chars",
  "adjustments": { "finalPricePhp": 120000, "discountAmountPhp": 5000, "finalTimelineDays": 30 }
}
```

**Allowed transitions:**
- `approve`: `pending_finance_review` → `finance_approved`
- `reject`, `request_changes`: → `finance_changes_required`

Concurrent updates return `409`. All actions append a `finance_reviews` row.

### `POST /api/finance/intakes/:intakeId/ready-for-build-handoff`

**Roles:** `owner`, `admin`.

Final commercial gate. Transition: `finance_approved` → `ready_for_build_handoff`. **Does not** trigger the build.

**Response (200)**
```json
{
  "success": true,
  "resultingStatus": "ready_for_build_handoff",
  "message": "Package marked ready for the separate build-delivery handoff. No build has been started. No payment has been captured."
}
```

## Phase 6 State Machine

Agreement draft `status` values:

- `draft` → owner/admin can submit for finance review
- `pending_finance_review` → finance can approve / reject / request changes
- `finance_changes_required` → owner/admin can resubmit
- `finance_approved` → owner/admin can mark ready for build handoff
- `ready_for_build_handoff` → terminal; build-delivery is a separate later handoff
- `superseded` → a new draft version replaced this one

`intakes.commercial_stage` mirrors these transitions:

- `agreement_draft_pending` → `finance_review_pending` → `finance_changes_required` → `finance_approved` → `ready_for_build_handoff`

