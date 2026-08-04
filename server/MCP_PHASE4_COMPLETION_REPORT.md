# Phase 4 Completion Report: MCP Analysis and Advisory Build Card Preparation

**Branch:** `feat/phase-4-mcp-analysis`  
**Commit:** `e75d02e`  
**PR:** https://github.com/M-Thryve/Intake-form/pull/new/feat/phase-4-mcp-analysis

---

## MCP Roles Implemented

| Role | Status | Key Capabilities |
|------|--------|-----------------|
| **Intake Validation** | Done | Tier consistency checks, missing info detection, voucher presence flagging, findings with severity |
| **Asset Readiness** | Done | Status counts, readiness classification (ready/partial/insufficient), blocker findings for rejected assets |
| **Scope Analysis** | Done | Complexity classification, included work items, dependencies, risks, ambiguities |
| **Pricing and Timeline** | Done | Tier-based multipliers, always preliminary, confidence levels (low/medium/high), price components |
| **Build Card** | Done | Consolidates all MCP output, owner-review-required true, analysis status (complete/partial/failed) |
| **Audit** | Done | Inline audit_events written during orchestration -- MCP run lifecycle traceability |

## Input and Output Contract Versions

- Input version: `1.0.0` (all roles)
- Output version: `1.0.0` (all roles, via `MCP_OUTPUT_VERSIONS` constant)

## Orchestration and Retry Behavior

- Async via `orchestrateAnalysis()` called **after** submission response (non-blocking)
- Independent roles execute **in parallel** with **30-second timeout** each
- Build Card runs sequentially after prerequisite analyses complete
- Retries (POST `/api/analysis/runs/:runId/retry`) bounded at **3** (MAX_RETRIES)
- Duplicate Build Card generation prevented via `hasCompletedBuildCard(intakeId)`
- Failed runs leave intake untouched -- intake stays `submitted`
- Release packages stored in `owner_release_packages` table for Factory Console

## Database Changes

Migration `003_mcp_analysis.sql`:

- Added `owner_release_packages` table (one per intake, stores combined review package)
- Added columns to `mcp_runs`: `build_reference_number`, `retry_count`, `correlation_id`, `input_version`, `output_version`
- Added indexes: `intake_id`, `server_role`, `status`, `correlation_id` on `mcp_runs`
- Added RLS policy for `owner_release_packages` (internal user read-only)

## Authorization Model

Operation | Roles Allowed
----------|--------------
Trigger analysis | `owner`, `admin`, `builder`
Retry failed MCP run | `owner`, `admin`
View runs, package, build card | Any authenticated internal user

All endpoints behind `requireAuth` middleware (Phase 3 JWT + API_INTERNAL_KEY auth).

## Data Minimization and Redaction

- `mcp-sanitization.ts` (`buildSanitizedContext`) -- builds sanitized context excluding:
  - Client name, email, phone
  - Supabase keys
  - Signed URLs and tokens
  - Storage keys
- MCPs never receive unrestricted database credentials
- Build Card deliberately shows `[client name -- available in full intake]` placeholder
- Sanitized context validated against `sanitizedIntakeContextSchema`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analysis/intakes/:id/trigger` | Queue MCP analysis (fire-and-forget) |
| GET | `/api/analysis/intakes/:id/runs` | List all MCP run statuses for intake |
| POST | `/api/analysis/runs/:id/retry` | Retry a failed or timed-out MCP run |
| GET | `/api/analysis/intakes/:id/package` | Factory Console review package (Build Card + all findings) |
| GET | `/api/analysis/intakes/:id/build-card` | Preliminary Build Card only |
| PATCH | `/api/analysis/intakes/:id/build-card` | Regenerate Build Card |

## Test Results

- **105 tests passing** (73 Phase 3 + 32 Phase 4 MCP)
- Coverage breakdown:
  - Contracts and schemas: 4 tests
  - Intake Validation MCP: 4 tests
  - Asset Readiness MCP: 5 tests
  - Scope Analysis MCP: 5 tests
  - Pricing and Timeline MCP: 4 tests
  - Build Card MCP: 4 tests
  - Protect gate boundary: 2 tests
  - Data minimization: 2 tests
  - Contract versioning: 2 tests

## Example Preliminary Build Card Output

```json
{
  "generatedAt": "2025-08-04T...",
  "status": "waiting_owner_review",
  "buildReferenceNumber": "MTH-2508-0001-ABCD",
  "clientSummary": {
    "name": "[client name -- available in full intake]",
    "company": "Acme Corp",
    "industry": "Retail"
  },
  "projectSummary": {
    "name": "Acme Website",
    "type": "E-commerce",
    "description": "Online retail platform"
  },
  "tier": "template",
  "scopeSummary": "Template-based web application with 5 features across 6 pages",
  "assetReadinessSummary": {
    "status": "ready",
    "readyCount": 3,
    "totalCount": 3,
    "notes": []
  },
  "preliminaryPricing": {
    "rangePhp": "PHP 20,000 PHP 35,000",
    "estimatedTimeline": "2.6 weeks",
    "confidence": "high"
  },
  "risks": ["No significant risks identified"],
  "open": ["No pending questions"],
  "mcpRunReferences": [
    { "role": "intake_verification", "runId": "...", "status": "completed" },
    { "role": "asset_overview", "runId": "...", "status": "completed" },
    { "role": "scope_profile", "runId": "...", "status": "completed" },
    { "role": "pricing_usd", "runId": "...", "status": "completed" }
  ],
  "analysisStatus": "complete",
  "ownerReviewRequired": true,
  "version": "1.0.0"
}
```

## Acceptance Criteria Verification

| Criteria | Status |
|----------|--------|
| Submitted intake can be queued for MCP analysis asynchronously | Pass |
| Required MCP roles run with traceable `mcp_runs` records | Pass |
| MCP outputs use stable structured contracts | Pass (all Zod-validated) |
| Asset analysis uses persisted asset status | Pass |
| Scope analysis identifies assumptions, risks, dependencies, open questions | Pass |
| Pricing outputs are explicitly preliminary | Pass (schema enforces `isPreliminary: true`) |
| Preliminary Build Card generated and linked to the intake | Pass |
| Build Card includes MCP run references and owner-review-required status | Pass (schema enforces `ownerReviewRequired: true`) |
| Failure/timeout is visible and retryable | Pass (retry endpoint, MAX_RETRIES guard) |
| Duplicate events do not create duplicate Build Cards | Pass (`hasCompletedBuildCard` guard) |
| Only authorized internal roles can retrieve analysis and Build Card | Pass (auth middleware on all endpoints) |
| MCPs cannot approve, reject, authorize payment, or start a build | Pass (no such actions exist) |
| Intake remains submitted/waiting_owner_review after analysis | Pass |
| Sensitive data not passed unnecessarily | Pass (buildSanitizedContext, PII exclusion) |
| Tests cover all required scenarios | Pass (32 new tests, 105 total) |

## Remaining Issues

| Issue | Owner | Next Action |
|-------|-------|------------|
| No LLM-backed MCP runs -- analysis is rule-based only | Phase 4b | Wire AI framework (OpenAI/Claude) for real intake analysis |
| Migration 003 not applied to Supabase | Owner | Run in SQL Editor |
| Scan status is placeholder -- no real scanner wired | Phase 4+ (deferred from Phase 3) | Integrate antivirus scanner |
| Orchestration fails silently in background if DB unavailable | Phase 5 | Add dead-letter queue and alerts |
| CORS still uses `ALLOWED_ORIGINS=*` default for | Deployment | Set explicit origin for production |