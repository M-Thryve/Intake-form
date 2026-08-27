-- Migration: 019_payment_due_at_build_card
-- Change 5 (owner decision 2026-08-27): payment becomes due when the Build Card
-- is issued to the client for review. The client then pays to unlock the full
-- Build Card detail. No real payment-service-provider (PSP) integration exists
-- yet; the `payments` table and `commercial_stage` values below model the state
-- and act as the explicit integration seam.
--
-- Contract: this migration authorizes NO charge. It only records intent and
-- state. Capturing funds is deferred to the PSP wired into lib/payments.ts.

-- ═══════════════════════════════════════════════════════════
-- 1. Extend intakes.commercial_stage with the client payment gate.
--    payment_pending   – Build Card issued to client; payment now due
--    payment_settled   – client paid; full Build Card unlocked
-- ═══════════════════════════════════════════════════════════
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
      'payment_pending',
      'payment_settled'
    )
  );
END $$;

-- ═══════════════════════════════════════════════════════════
-- 2. payments – explicit integration point for a PSP (Stripe / Paymongo).
--    Rows are created when a Build Card is issued (intent pending) and updated
--    to `paid` when the provider confirms. No money moves in this codebase.
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  client_id uuid,
  amount_php numeric NOT NULL,
  currency text NOT NULL DEFAULT 'PHP',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider text,
  provider_ref text,
  client_secret text,
  build_card_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payments_intake ON public.payments(intake_id);

