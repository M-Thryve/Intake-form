# Phase 9 backend verification

## Manual cross-tenant probe

Use two real Supabase magic-link sessions and two intake UUIDs:

```powershell
$headers = @{ Authorization = "Bearer $CLIENT_A_ACCESS_TOKEN" }
Invoke-WebRequest -Uri "$PORTAL_BASE_URL/api/portal/intakes/$CLIENT_B_INTAKE_ID" -Headers $headers
```

The response must be HTTP `404` with `Intake not found`. It must not be
`403`, and the response body must not reveal whether Client B's UUID exists.
Repeat the probe against `/build-card`, `/agreement`, `/assets`, and
`/timeline` for the same UUID.

## RLS probe

With a Supabase client created using the public anon key and Client A's access
token, query `intakes` and each client-readable child table. Only Client A's
rows should be returned. Queries against `audit_events`, `analysis_runs`,
`mcp_runs`, `finance_reviews`, `owner_gate_decisions`, `users`, and the other
internal-deliberation tables listed in migration 014 must return zero rows.

## Migration repeatability

Apply migrations 013 and 014 in the target Supabase project, then apply them
again. The second run must complete without duplicate-column, duplicate-index,
duplicate-policy, or duplicate-trigger errors. The repository verifier can be
run before applying them:

```powershell
Push-Location server
npm.cmd run migrate:verify
Pop-Location
```

This workspace has no configured Supabase project or local database, so the
live anon-key RLS and twice-applied migration probes remain deployment-gate
checks rather than local test results.
