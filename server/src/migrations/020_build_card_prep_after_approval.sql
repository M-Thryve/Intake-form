-- Migration: 020_build_card_prep_after_approval
-- Change 6 (owner decision 2026-08-27): the Build Card is prepared AFTER owner
-- approval, over a true 2-3 day prep window, and only then issued for the client
-- to review and pay. Sequence:
--   submitted -> (owner review) -> approved
--   approved  -> commercial_stage 'build_card_preparing'
--             -> build_cards.status 'preparing' with prepared_at = approved_at + SLA
--   prepared_at reached -> build_cards.status 'issued'
--                          + commercial_stage 'payment_pending' (client pays)
--   payment confirmed     -> commercial_stage 'payment_settled'
-- The old 'waiting_owner_review' / 'approved' Build Card lifecycle is retired:
-- the Build Card is no longer an artifact the owner reviews before approving.

-- 1. Track when a prepared Build Card becomes issuable.
ALTER TABLE public.build_cards ADD COLUMN IF NOT EXISTS prepared_at timestamptz;

-- 2. Insert the post-approval prep stage into the commercial_stage check.
DO $$
BEGIN
  ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_commercial_stage_check;
  ALTER TABLE public.intakes ADD CONSTRAINT intakes_commercial_stage_check CHECK (
    commercial_stage IS NULL OR commercial_stage IN (
      'agreement_draft_pending',
      'finance_review_pending',
      'finance_changes_required',
      'finance_approved',
      'ready_for_build_handoff',
      'build_card_preparing',
      'payment_pending',
      'payment_settled'
    )
  );
END $$;
