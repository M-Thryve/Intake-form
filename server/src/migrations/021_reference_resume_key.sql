-- Migration: 021_reference_resume_key
-- Adds a partial unique index on intakes.build_reference_number so it can
-- serve as the lookup key for draft resume (Phase 2 of the entry-gate /
-- reference-recovery work). Migration 000 declared this column UNIQUE, but
-- the constraint never made it onto the live database. Partial so the
-- discard path — which never issues a reference — keeps working, and so
-- multiple NULLs remain legal.

CREATE UNIQUE INDEX IF NOT EXISTS idx_intakes_build_reference_unique
  ON public.intakes (build_reference_number)
  WHERE build_reference_number IS NOT NULL;
