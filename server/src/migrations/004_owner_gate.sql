-- Migration: 004_owner_gate
-- Phase 5: Factory Console owner gate decision support
--
-- Ensures the owner_gate_decisions table has the columns
-- needed by Phase 5 and adds the review_queue view.

-- ═══════════════════════════════════════════════════════════
-- Ensure owner_gate_decisions has all Phase 5 columns
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.owner_gate_decisions
  DROP COLUMN IF EXISTS build_reference_number,
  DROP COLUMN IF EXISTS reviewed_build_card_version,
  DROP COLUMN IF EXISTS reviewed_analysis_version,
  DROP COLUMN IF EXISTS resulting_status;

ALTER TABLE public.owner_gate_decisions
  ADD COLUMN IF NOT EXISTS build_reference_number text,
  ADD COLUMN IF NOT EXISTS reviewed_build_card_version text,
  ADD COLUMN IF NOT EXISTS reviewed_analysis_version text,
  ADD COLUMN IF NOT EXISTS resulting_status text;

-- ═══════════════════════════════════════════════════════════
-- Ensure intakes.status supports all owner-gate workflow states
-- ═══════════════════════════════════════════════════════════

-- Verify the check constraint covers all needed statuses
DO $$
BEGIN
  ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_status_check;
  ALTER TABLE public.intakes ADD CONSTRAINT intakes_status_check CHECK (
    status IN (
      'draft',
      'submitted',
      'analysis_running',
      'waiting_owner_review',
      'needs_clarification',
      'approved',
      'rejected',
      'cancelled'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- Ensure build_cards has version tracking columns
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.build_cards
  ADD COLUMN IF NOT EXISTS mcp_run_refs jsonb,
  ADD COLUMN IF NOT EXISTS analysis_version text;

-- ═══════════════════════════════════════════════════════════
-- Indexes for owner console queries
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_intakes_status
  ON public.intakes(status);

CREATE INDEX IF NOT EXISTS idx_owner_gate_decisions_intake
  ON public.owner_gate_decisions(intake_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_intake_type
  ON public.audit_events(intake_id, event_type);