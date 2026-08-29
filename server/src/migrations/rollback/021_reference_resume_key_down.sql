-- Rollback: 021_reference_resume_key

DROP INDEX IF EXISTS public.idx_intakes_build_reference_unique;
