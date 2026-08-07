-- DESTRUCTIVE: Rollback for 009_client_id_backfill

DROP POLICY IF EXISTS intakes_select ON public.intakes;

ALTER TABLE public.intakes ALTER COLUMN client_id DROP NOT NULL;
