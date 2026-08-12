# Server Deployment Guide

## Local Development

```bash
cd server
cp .env.example .env
# Edit .env — set SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard > Settings > API
npm install
npm run preflight   # verify config before starting
npm run dev         # starts on http://localhost:3000
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Yes | — | Server-side key (server-only; use one, never both) |
| `SUPABASE_ANON_KEY` | No | — | Anon key for future client-scoped auth |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment name |
| `SUPABASE_STORAGE_BUCKET` | No | intake-assets | Storage bucket name |
| `MAX_UPLOAD_SIZE_MB` | No | 25 | Max upload file size in MB |

## Providing Secrets in Deployment

**Never commit real secrets.** Use your platform's environment variable injection:

| Platform | Method |
|----------|--------|
| **Render** | Dashboard > Environment > Environment Variables |
| **Railway** | Dashboard > Variables |
| **Fly.io** | `fly secrets set SUPABASE_SERVICE_ROLE_KEY=...` |
| **Vercel** | Dashboard > Settings > Environment Variables |
| **Docker** | `docker run -e SUPABASE_SERVICE_ROLE_KEY=...` or `--env-file` |
| **GitHub Actions** | Repository Settings > Secrets and variables > Actions |

The server validates all required variables at startup and exits with a clear error if any are missing.

## Preflight Check

Run before deployment to verify configuration:

```bash
npm run preflight
```

This validates all required variables are present, not placeholder values, and correctly formatted. It does NOT print secret values.

## Database Migrations

Apply every migration in `server/src/migrations` in filename order. The Phase 2
foundation and atomic submission function are included in
`000_phase2_intake_schema.sql` and `015_phase2_atomic_submit.sql`.

```sql
-- 1. Phase 2 foundation
-- Run: server/src/migrations/000_phase2_intake_schema.sql

-- 2. RLS policies (Phase 3)
-- Run: server/src/migrations/001_rls_policies.sql

-- 3. Asset pipeline tables (Phase 3)
-- Run: server/src/migrations/002_asset_pipeline.sql

-- ...continue through 014_client_rls.sql...

-- Final atomic submission RPC
-- Run: server/src/migrations/015_phase2_atomic_submit.sql
```

Apply via Supabase Dashboard SQL Editor or `supabase db push`.

## Storage Bucket

The `002_asset_pipeline.sql` migration creates the `intake-assets` bucket automatically. If running migrations manually, ensure the bucket exists:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-assets', 'intake-assets', false)
ON CONFLICT (id) DO NOTHING;
```

## Secret Rotation

To rotate `SUPABASE_SERVICE_ROLE_KEY`:

1. Generate a new key in Supabase Dashboard > Settings > API
2. Update the environment variable in your deployment platform
3. Restart or redeploy the server
4. The old key is invalidated automatically by Supabase
5. No code changes required

## Production Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set via platform env vars (not `.env` file)
- [ ] `NODE_ENV=production`
- [ ] `npm run preflight` passes
- [ ] RLS migration applied (`001_rls_policies.sql`)
- [ ] Asset pipeline migration applied (`002_asset_pipeline.sql`)
- [ ] `intake-assets` storage bucket exists and is private
- [ ] CORS origin restricted to production frontend URL
- [ ] No `.env` file with real secrets in the deployment

## Edge Function (Deprecated)

The `supabase/functions/intake-submit/` Edge Function is **deprecated** as of Phase 3. The Express server is the single production API path. See `supabase/functions/intake-submit/DEPRECATED.md` for details.
