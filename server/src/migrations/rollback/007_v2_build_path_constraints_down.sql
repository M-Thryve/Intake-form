-- DESTRUCTIVE: Rollback for 007_v2_build_path_constraints

DROP FUNCTION IF EXISTS public.check_idempotency_key(text, text, integer);
DROP FUNCTION IF EXISTS public.generate_build_reference_number();

DROP POLICY IF EXISTS ile_select_internal ON public.intake_lifecycle_events;
ALTER TABLE public.intake_lifecycle_events DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_ile_event_type;
DROP INDEX IF EXISTS idx_ile_intake;
DROP TABLE IF EXISTS public.intake_lifecycle_events;

ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_build_path_check;
ALTER TABLE public.intakes DROP COLUMN IF EXISTS build_path;
