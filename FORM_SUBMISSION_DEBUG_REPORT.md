# Form and Draft Submission — Diagnosis Report

**Date:** 2026-08-14  
**Scope:** Frontend action through API and Supabase persistence  
**Mode:** Diagnosis only; no implementation changes were made for this report.

## Executive finding

The submission path is currently running in an ambiguous local runtime state, and the database boundary has not been proven healthy.

The strongest confirmed problem is configuration/process drift:

- `server/.env` pins the API to port `3000` (`server/.env:6`).
- The current Vite proxy points `/api` to port `3200` (`vite.config.ts:39`).
- The server code's fallback default was also changed to `3200` (`server/src/lib/config.ts:43`), while its error text and deployment documentation still describe `3000`.
- At inspection time, both `3000` and `3200` had independent Node listeners, and both returned `200` from `/api/health`.
- A separate Vite start attempt reported `Port 8443 is already in use`; an existing process was already listening there.

This means the browser can be talking to a different API process than the one being edited or restarted. That can make draft and submit behavior appear unchanged and makes any database error difficult to attribute. It is not yet possible to identify the final database error without observing one actual POST response or the corresponding API process log; issuing a POST was intentionally not done in this report because it could create or mutate an intake.

## Request path traced

```text
Outcome buttons in src/App.tsx
  -> toSubmissionPayload() in src/api/intake.ts
  -> POST /api/intakes with command save_draft or submit
  -> Vite proxy (currently localhost:3200)
  -> Express intakeRouter
  -> draft or submit Zod validation
  -> Supabase RPC public.submit_intake
  -> intake tables, idempotency_keys, and audit_events
```

Relevant code locations:

- UI handlers: `src/App.tsx:1187`, `src/App.tsx:1215`
- Browser request: `src/api/intake.ts:231`
- API route and command branching: `server/src/routes/intakes.ts:17`, `server/src/routes/intakes.ts:55`, `server/src/routes/intakes.ts:71`
- Supabase persistence call: `server/src/routes/intakes.ts:231`
- RPC definition expected by the server: `server/src/migrations/015_phase2_atomic_submit.sql:7`

## Evidence and interpretation

### 1. Runtime routing is not deterministic — high confidence

The frontend uses same-origin `/api/intakes` unless `VITE_API_BASE_URL` is set (`src/api/intake.ts:15-16`). Vite forwards `/api` to `http://localhost:3200` (`vite.config.ts:39`). However, the checked server environment explicitly says `PORT=3000` (`server/.env:6`).

During read-only probing:

| Endpoint | Result |
|---|---|
| `http://localhost:3000/api/health` | `200`, Express health response |
| `http://localhost:3200/api/health` | `200`, Express health response |
| `http://localhost:8443/` | `200` from an already-running Vite process |

`netstat` showed separate listeners on `3000`, `3200`, and `8443`. The Vite startup log also shows a failed duplicate start because `8443` was already occupied.

### 2. Database/RPC execution remains unverified — medium-to-high confidence as the next boundary

Both commands eventually call the same server route and then `public.submit_intake`. The local migration file defines that RPC, but a local SQL file does not prove that the function and all required tables exist in the connected Supabase project.

The following database facts were not verified in this report:

- migration `000_phase2_intake_schema.sql` was applied;
- migration `015_phase2_atomic_submit.sql` was applied after earlier lifecycle migrations;
- the running API processes use the intended Supabase project and service-role credentials;
- the RPC succeeds for the current payload;
- the connected database accepts inserts into the intake, idempotency, client, and audit tables.

The API health endpoint only confirms that Express is alive; it does not test Supabase.

### 3. The current code still has test/contract drift — confirmed, but not sufficient by itself to prove the live failure

The previous verification found 299 of 306 server tests passing. The seven failures were concentrated in incomplete Supabase mock chains and a stale contract test that still expected removed payment/confirmation requirements. This indicates the test suite is not currently a reliable end-to-end signal for the live database path.

The earlier debug report was marked resolved, but the port/process state above is new operational evidence and supersedes its assumption that only port `3000` needed to be running.

## Most likely failure sequence

1. The user clicks **Save as draft** or **Submit intake**.
2. The browser sends `POST /api/intakes` to the already-running Vite process.
3. Vite forwards it to whichever API instance is on `3200`.
4. If that process is stale or connected to a different environment, it can reject the payload, fail its idempotency lookup, or fail at `submit_intake` even though `/api/health` is green.
5. The frontend turns any non-2xx response or network exception into `submissionError`, so the visible symptom is simply that the action does not complete.

## Diagnosis conclusion

The first problem to resolve is the duplicate/misaligned local runtime: one canonical API port and one canonical API process must be established before judging the frontend or database implementation. After that, the next decisive evidence is the actual response body/status for one draft POST and one submit POST, followed by the API log line around the Supabase RPC.

No database write, migration, process restart, or source-code fix was performed while creating this report.

