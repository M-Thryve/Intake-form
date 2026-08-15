# STATE.md — M-THRYVE Intake Form

## Project Memory

- React + Vite + Tailwind v4 frontend; Node.js + Supabase backend (`server/`).
- Backend dev server: `PORT=3200 npm run dev` in `server/` (default port changed 3000 → 3200).
  Frontend dev server: `npm run dev` in project root (port 8443, proxies `/api` → localhost:3200).
- Supabase project ref: `ilbyzsktnllevfbomesc` (in `server/.env`). Migrations APPLIED —
  all 16 (`000`–`015`) applied via Management API; 48 public tables live (40 expected + booking/lead tables).
  Legacy booking-API `idempotency_keys` was renamed to `idempotency_keys_legacy` (preflight, no data lost).
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
- `lusziumbodejmtdzuzbf` (BUILD IT WORKSPACE) received 5 missing tables (intake_assets, intake_clients,
  intake_pages_features, intake_projects, intake_templates) as a no-op safeguard; not a target.
- Service token stored at `~/.supabase/access-token` was replaced (old one backed up to
  `access-token.bak-wrong-account`).
