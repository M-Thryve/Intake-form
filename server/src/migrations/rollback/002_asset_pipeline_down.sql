-- DESTRUCTIVE: Rollback for 002_asset_pipeline

DROP POLICY IF EXISTS asl_select ON public.asset_state_log;
ALTER TABLE public.asset_state_log DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_asset_state_log_asset_id;
DROP INDEX IF EXISTS idx_uploaded_assets_status;
DROP INDEX IF EXISTS idx_uploaded_assets_intake_id;

DROP TABLE IF EXISTS public.asset_state_log;

ALTER TABLE public.uploaded_assets DROP COLUMN IF EXISTS storage_bucket;
ALTER TABLE public.uploaded_assets DROP COLUMN IF EXISTS validated_mime_type;
ALTER TABLE public.uploaded_assets DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE public.uploaded_assets DROP COLUMN IF EXISTS asset_status;
