-- Prompt 5: align uploaded_assets with the signed-upload route and bind every
-- metadata row to the intake identity issued at first persistence.

ALTER TABLE public.uploaded_assets
  ADD COLUMN IF NOT EXISTS storage_key text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'clean', 'blocked', 'failed')),
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS requirement_key text,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id),
  ADD COLUMN IF NOT EXISTS build_reference_number text,
  ADD COLUMN IF NOT EXISTS upload_attempt_count integer NOT NULL DEFAULT 1;

UPDATE public.uploaded_assets AS ua
   SET storage_key = COALESCE(ua.storage_key, NULLIF(ua.storage_path, '')),
       file_size_bytes = COALESCE(ua.file_size_bytes, ua.size_bytes),
       client_id = COALESCE(ua.client_id, i.client_id),
       build_reference_number = COALESCE(ua.build_reference_number, i.build_reference_number)
  FROM public.intakes i
 WHERE i.id = ua.intake_id;

ALTER TABLE public.uploaded_assets
  ALTER COLUMN storage_key SET DEFAULT '',
  ALTER COLUMN storage_key SET NOT NULL,
  ALTER COLUMN file_size_bytes SET DEFAULT 0,
  ALTER COLUMN file_size_bytes SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_intake_client
  ON public.uploaded_assets(intake_id, client_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_reference
  ON public.uploaded_assets(build_reference_number);
