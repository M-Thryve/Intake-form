-- DESTRUCTIVE: Rollback for 006_build_delivery

DROP POLICY IF EXISTS bo_select ON public.build_orchestrations;
ALTER TABLE public.build_orchestrations DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_bo_state;
DROP INDEX IF EXISTS idx_bo_intake;
DROP INDEX IF EXISTS idx_bo_one_active_per_intake;
DROP INDEX IF EXISTS idx_bo_correlation;
DROP INDEX IF EXISTS idx_bo_idempotency;
DROP TABLE IF EXISTS public.build_orchestrations;

DROP POLICY IF EXISTS bdn_select ON public.build_delivery_notes;
ALTER TABLE public.build_delivery_notes DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_bdn_open;
DROP INDEX IF EXISTS idx_bdn_intake;
DROP TABLE IF EXISTS public.build_delivery_notes;

DROP POLICY IF EXISTS bpa_select ON public.build_package_acknowledgements;
ALTER TABLE public.build_package_acknowledgements DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_bpa_intake;
DROP TABLE IF EXISTS public.build_package_acknowledgements;

DROP POLICY IF EXISTS bdp_select ON public.build_delivery_packages;
ALTER TABLE public.build_delivery_packages DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_bdp_status;
DROP INDEX IF EXISTS idx_bdp_intake;
DROP INDEX IF EXISTS idx_bdp_idempotency;
DROP TABLE IF EXISTS public.build_delivery_packages;

-- Revert commercial_stage CHECK to Phase 6 states only
DO $$
BEGIN
  ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_commercial_stage_check;
  ALTER TABLE public.intakes ADD CONSTRAINT intakes_commercial_stage_check CHECK (
    commercial_stage IS NULL OR commercial_stage IN (
      'agreement_draft_pending',
      'finance_review_pending',
      'finance_changes_required',
      'finance_approved',
      'ready_for_build_handoff'
    )
  );
END $$;
