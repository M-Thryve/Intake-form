-- Rollback: 020_build_card_prep_after_approval

ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_commercial_stage_check;
ALTER TABLE public.intakes ADD CONSTRAINT intakes_commercial_stage_check CHECK (
  commercial_stage IS NULL OR commercial_stage IN (
    'agreement_draft_pending',
    'finance_review_pending',
    'finance_changes_required',
    'finance_approved',
    'ready_for_build_handoff',
    'payment_pending',
    'payment_settled'
  )
);

ALTER TABLE public.build_cards DROP COLUMN IF EXISTS prepared_at;
