-- Migration: 005_agreement_finance
-- Phase 6: Agreement preparation and internal finance handoff.
--
-- Adds:
--   agreement_drafts       – versioned agreement draft packages per intake
--   finance_reviews        – append-only finance decision log per agreement version
--   intakes.commercial_stage – Phase 6 sub-state (Phase 5 status stays as 'approved')
--   intake_voucher_redemptions extensions – discount amount, verifier, idempotency
--   agreement_drafts.idempotency_key – idempotent handoff creation
--
-- Contract: no records in this migration authorize payment or start a build.

-- ═══════════════════════════════════════════════════════════
-- intakes.commercial_stage — Phase 6 sub-workflow
-- Null means Phase 6 has not begun (or intake ineligible).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS commercial_stage text;

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

CREATE INDEX IF NOT EXISTS idx_intakes_commercial_stage
  ON public.intakes(commercial_stage);

-- ═══════════════════════════════════════════════════════════
-- agreement_drafts — versioned draft packages
-- One row per (intake_id, version). Latest version is the active draft.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agreement_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  build_reference_number text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN (
    'draft',
    'pending_finance_review',
    'finance_changes_required',
    'finance_approved',
    'ready_for_build_handoff',
    'superseded'
  )),
  draft_package jsonb NOT NULL DEFAULT '{}',
  preliminary_price_php integer,
  final_price_php integer,
  discount_amount_php integer,
  voucher_redemption_id uuid REFERENCES public.intake_voucher_redemptions(id),
  owner_decision_id uuid REFERENCES public.owner_gate_decisions(id),
  build_card_id uuid REFERENCES public.build_cards(id),
  reviewed_build_card_version text,
  reviewed_analysis_version text,
  idempotency_key text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_drafts_idempotency
  ON public.agreement_drafts(intake_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agreement_drafts_intake
  ON public.agreement_drafts(intake_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_drafts_status
  ON public.agreement_drafts(status);

ALTER TABLE public.agreement_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_select ON public.agreement_drafts;
CREATE POLICY ad_select ON public.agreement_drafts
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- Writes go through service-role (Express server); RLS blocks direct client writes.

-- ═══════════════════════════════════════════════════════════
-- finance_reviews — append-only decision log per agreement version
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.finance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  agreement_draft_id uuid NOT NULL REFERENCES public.agreement_drafts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN (
    'submit_for_review',
    'approve',
    'reject',
    'request_changes',
    'mark_ready_for_build_handoff'
  )),
  reason text NOT NULL,
  adjustments jsonb NOT NULL DEFAULT '{}',
  reviewed_by uuid NOT NULL REFERENCES public.users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  prior_status text,
  resulting_status text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_reviews_intake
  ON public.finance_reviews(intake_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_reviews_agreement
  ON public.finance_reviews(agreement_draft_id, reviewed_at DESC);

ALTER TABLE public.finance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fr_select ON public.finance_reviews;
CREATE POLICY fr_select ON public.finance_reviews
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- intake_voucher_redemptions — Phase 6 additions
-- Guarantees exactly one *valid* redemption per intake and tracks the verifier.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.intake_voucher_redemptions
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.users(id);

-- Existing UNIQUE (intake_id) permits one row per intake; a re-check overwrites.
-- Add partial unique index to prevent duplicate *valid* redemptions when history is kept.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ivr_one_valid_per_intake
  ON public.intake_voucher_redemptions(intake_id)
  WHERE verification_status = 'valid';

-- ═══════════════════════════════════════════════════════════
-- Audit event marker rows (documentation only – audit_events already exists)
-- Phase 6 event_type values:
--   agreement_draft_created
--   agreement_draft_versioned
--   voucher_validated
--   voucher_redemption_recorded
--   voucher_rejected
--   finance_submitted_for_review
--   finance_approved
--   finance_rejected
--   finance_changes_requested
--   ready_for_build_handoff
--   commercial_stage_changed
-- ═══════════════════════════════════════════════════════════
