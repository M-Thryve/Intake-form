# STATE.md — M-THRYVE Intake Form

## Project Memory

- React + Vite + Tailwind v4 frontend; Node.js + Supabase backend (`server/`).
- Backend dev server: `PORT=3200 npm run dev` in `server/` (default port changed 3000 → 3200).
  Frontend dev server: `npm run dev` in project root (port 8443, proxies `/api` → localhost:3200).
- **Canonical Supabase project ref: `lusziumbodejmtdzuzbf` (BUILD IT WORKSPACE)** — decided
  2026-08-28. This supersedes the earlier `ilbyzsktnllevfbomesc` designation below. Both
  `server/.env` (`SUPABASE_URL`) and `.env.local` (`VITE_SUPABASE_URL`) already point here,
  verified by reading the live browser client and a signed upload URL. 60 public tables,
  `intake-assets` bucket, 20 intakes, 11 uploaded assets.
  The frontend and backend MUST always name the same project: the backend verifies the
  frontend's JWT via `getUser()` against its own `SUPABASE_URL`, so any divergence makes
  every authenticated call fail with 401 regardless of account state.
- Prior target `ilbyzsktnllevfbomesc` (BUILD-IT): migrations APPLIED — all 16 (`000`–`015`)
  applied via Management API; 51 public tables live. Legacy booking-API `idempotency_keys`
  was renamed to `idempotency_keys_legacy` (preflight, no data lost). Retains 8 historical
  intakes (newest 2026-08-24) and zero accounts. Not in use as of 2026-08-28.
- Migration files fixed for internal consistency: 005 (voucher/redemption columns), 009 (client_details
  jsonb), 012 (audit_events.event_type), 013 (non-partial normalized_email unique index). See summary.

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260814-001 | Supabase migration audit + apply prep | 2026-08-14 | (no commit — per repo rules, commit disabled without authorization) | [260814-supabase-migration-audit](./quick/260814-supabase-migration-audit/) |
| 260814-002 | Apply all 16 Supabase migrations to ilbyzsktnllevfbomesc (16/16 OK) | 2026-08-14 | (no commit) | [260814-supabase-migration-audit](./quick/260814-supabase-migration-audit/) |

## Blockers/Concerns

- `ckektudtegnodczibkgx` (a DIFFERENT booking app, old token's account) had 9/16 migrations
  **wrongly applied** during the wrong-project detour; rollback pending user decision.
- ~~`lusziumbodejmtdzuzbf` (BUILD IT WORKSPACE) received 5 missing tables as a no-op safeguard;
  not a target.~~ **Superseded 2026-08-28** — it is now the canonical project (see Project Memory).
- **Railway env vars are UNVERIFIED.** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
  `SUPABASE_ANON_KEY` must name `lusziumbodejmtdzuzbf`. Not readable from the local
  environment. Vercel `VITE_*` vars were set by the user on 2026-08-28; note that Vite
  inlines them at build time, so they take effect only after a redeploy.
- `public.users` in `lusziumbodejmtdzuzbf` holds a Phase 7 test fixture
  (`phase7-owner-2feb5d0c@example.com`, role `owner`, no matching `auth.users` row). It can
  never authenticate, so it carries no access risk. **It cannot simply be deleted:** it is
  referenced by 4 `audit_events.actor_user_id` (nullable) and 4
  `build_orchestrations.requested_by` (NOT NULL), both `ON DELETE NO ACTION`. Removing it
  means either deleting those Phase 7 records and nulling audit rows, or reassigning them to
  a real user (which would falsify the audit trail). Left in place pending a decision.
- Service token stored at `~/.supabase/access-token` was replaced (old one backed up to
  `access-token.bak-wrong-account`).
