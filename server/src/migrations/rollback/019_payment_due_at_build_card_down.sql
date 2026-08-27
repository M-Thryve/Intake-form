-- Rollback: 019_payment_due_at_build_card
-- Reverts the commercial_stage extension and drops the payments table.

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

DROP TABLE IF EXISTS public.payments;
