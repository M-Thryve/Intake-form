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
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Service role key (server-side only) |
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

Apply migrations in order after deploying the schema from Phase 2:

```sql
-- 1. RLS policies (Phase 3)
-- Run: server/src/migrations/001_rls_policies.sql

-- 2. Asset pipeline tables (Phase 3)
-- Run: server/src/migrations/002_asset_pipeline.sql
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
