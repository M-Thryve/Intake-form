# Production Deployment Checklist

Consolidated operational readiness checklist for deploying and running the intake system in production.

## Migrations

- [ ] Migrations **001–010** applied to the production Supabase project.
- [ ] Rollback plan documented for each migration (down scripts or manual reversion).
- [ ] `DROP POLICY IF EXISTS` precedes every `CREATE POLICY` statement.
- [ ] Client ID backfill (migration 009/010) completed; `client_id` is `NOT NULL`.

## Environment

- [ ] `ALLOWED_ORIGINS` set to the production frontend origin (e.g. `https://intake.mthryve.com`), **not** `*`.
- [ ] Staging `ALLOWED_ORIGINS` set to the staging origin (e.g. `https://staging-intake.mthryve.com`).
- [ ] Supabase service-role key rotated for production (server-side only).
- [ ] `API_INTERNAL_KEY` generated (minimum 32 characters).
- [ ] `SUPABASE_ANON_KEY` configured for JWT verification.
- [ ] JWT signing secret configured (Supabase default or explicit).
- [ ] CORS methods enumerated: `GET, POST, PATCH, DELETE, OPTIONS`.

## Monitoring

- [ ] Server logs shipped to a log aggregator.
- [ ] Failed background job counter has an alert.
- [ ] 5xx response-rate alert configured.
- [ ] Database connection-pool exhaustion alert configured.
- [ ] Storage quota alert at **80%** and **95%**.

## Backups

- [ ] Supabase point-in-time recovery enabled.
- [ ] Nightly database dump to separate storage.
- [ ] Backup restore tested at least once.

## Access

- [ ] Owner and admin accounts provisioned.
- [ ] Builder and finance accounts provisioned.
- [ ] Break-glass admin account documented and secured.
- [ ] MFA required for all internal roles.

## Rollback

- [ ] Blue-green or canary deployment configured.
- [ ] Rollback runbook documented.
- [ ] Database rollback tested in staging.

## Post-deployment verification

- [ ] `/api/health` returns `status: ok` with the correct environment.
- [ ] One end-to-end intake (submit → owner approve) succeeds in production.
- [ ] Audit events are being written for all meaningful actions.
- [ ] No PII visible in logs, URLs, or audit event payloads.