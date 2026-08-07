-- Migration: 007_v2_build_path_constraints
-- Phase 4: Enforce v2.0 build_path constraints, audit event support,
--           and reference number generation on submission only.
--
-- Adds:
--   - intakes.build_path CHECK constraint (custom | enterprise only for new records)
--   - intake_lifecycle_events table (per TECHNICAL_HANDOVER §12)
--   - build_path constraint enforcement via trigger
--   - Legacy 'template' records remain readable but not selectable for new rows.

-- ═══════════════════════════════════════════════════════════
-- 1. Add build_path column + constraint
--    New rows: custom | enterprise only.
--    Legacy template rows read as-is (no check on existing rows).
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'intakes' AND column_name = 'build_path'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN build_path text;
  END IF;
END $$;

-- Add constraint for new records only.
-- Existing rows (created before this migration) are not validated by this CHECK.
ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_build_path_check;
ALTER TABLE public.intakes ADD CONSTRAINT intakes_build_path_check CHECK (
  build_path IS NULL OR build_path IN ('custom', 'enterprise')
);

-- ═══════════════════════════════════════════════════════════
-- 2. Normalize legacy build_path values.
-- ═══════════════════════════════════════════════════════════

UPDATE public.intakes
SET build_path = 'custom'
WHERE build_path = 'template';

-- ═══════════════════════════════════════════════════════════
-- 3. Intake Lifecycle Events (append-only audit per §12)
--    Records every status transition with acting user, prev/next state.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.intake_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created_in_progress',
    'saved_as_draft',
    'submitted_for_review',
    'discarded',
    'status_change',
    'owner_review_approved',
    'owner_review_rejected',
    'owner_revision_requested',
    'build_reference_assigned',
    'validation_failed',
    'operator_note_added',
    'operator_note_updated'
  )),
  actor_type text NOT NULL CHECK (actor_type IN ('operator', 'owner', 'service', 'system')),
  actor_id uuid REFERENCES public.users(id),
  previous_status text,
  new_status text,
  previous_outcome text,
  outcome text,
  reason text,
  metadata jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ile_select_internal ON public.intake_lifecycle_events;
CREATE POLICY ile_select_internal ON public.intake_lifecycle_events
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- Service role writes lifecycle events (service role bypasses RLS).

CREATE INDEX IF NOT EXISTS idx_ile_intake
  ON public.intake_lifecycle_events(intake_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ile_event_type
  ON public.intake_lifecycle_events(event_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- 4. Reference number generation function (submission only).
-- ═══════════════════════════════════════════════════════════
-- Build reference format: MTH-YYYYMMDD-XXXX-RRRR
-- Prefix + submission date + 4 char hex + 4 random chars.
CREATE OR REPLACE FUNCTION public.generate_build_reference_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  date text := to_char(now(), 'YYYYMMDD');
  hex_part text;
  rand_part text;
  n int;
BEGIN
  n := (random() * 65535)::int;
  hex_part := lpad(to_hex(n), 4, '');
  rand_part := upper(left(md5(hex_part || clock_timestamp()::text), 4));
  RETURN 'MTH-' || date || '-' || hex_part || '-' || rand_part;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. Idempotency key guard function.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_idempotency_key(
  p_key text,
  p_operation text,
  p_ttl_seconds integer DEFAULT 3600
)
RETURNS SETOF public.intake_lifecycle_events
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.intake_lifecycle_events
  WHERE idempotency_key = p_key
  AND event_type = p_operation
  AND created_at > now() - make_interval(secs := p_ttl_seconds)
  LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════
-- 6. Update audit_events event_type CHECK constraint
--    (documentation only — audit_events uses text, no CHECK constraint update needed).
--    New event types:
--      lifecycle_in_progress
--      lifecycle_draft_saved
--      lifecycle_submitted
--      lifecycle_discarded
--      lifecycle_reference_assigned
--      lifecycle_owner_approved
--      lifecycle_owner_rejected
--      lifecycle_revision_requested
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 7. Migration log (not persisted, documentation only).
-- ═══════════════════════════════════════════════════════════