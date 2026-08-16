DROP INDEX IF EXISTS public.idx_uploaded_assets_reference;
DROP INDEX IF EXISTS public.idx_uploaded_assets_intake_client;

ALTER TABLE public.uploaded_assets
  DROP COLUMN IF EXISTS upload_attempt_count,
  DROP COLUMN IF EXISTS build_reference_number,
  DROP COLUMN IF EXISTS client_id,
  DROP COLUMN IF EXISTS requirement_key,
  DROP COLUMN IF EXISTS uploaded_at,
  DROP COLUMN IF EXISTS scan_status,
  DROP COLUMN IF EXISTS file_size_bytes,
  DROP COLUMN IF EXISTS storage_key;
