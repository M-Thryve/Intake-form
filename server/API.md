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
