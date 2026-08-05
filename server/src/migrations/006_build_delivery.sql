-- Migration: 006_build_delivery
-- Phase 7: Build delivery handoff + controlled build orchestration.
--
-- Adds:
--   build_delivery_packages       -- versioned, immutable-after-handoff delivery snapshot
--   build_package_acknowledgements -- builder receipt log
--   build_delivery_notes          -- builder clarification / blocker log
--   build_orchestrations          -- persisted orchestration record (queue dispatch record)
--   intakes.commercial_stage      -- extended to cover build-delivery states
--
-- Contract: no record in this migration authorizes payment or triggers a build worker.
--           The build worker consumes build_orchestrations rows *after* the server
--           finishes its transactional gate. This migration only creates the schema.

-- ═══════════════════════════════════════════════════════════
-- Extend intakes.commercial_stage to include Phase 7 states.
-- Phase 6 already established the earlier states.
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
      'build_delivery_package_created',
      'build_awaiting_acknowledgement',
      'build_queued',
      'build_in_progress',
      'build_blocked',
      'build_failed',
      'build_completed',
      'build_cancelled'
    )
  );
END $$;

-- ═══════════════════════════════════════════════════════════
-- build_delivery_packages
--   Versioned frozen snapshot handed to authorized builders.
--   One active package per (intake_id, version).
--   Package integrity is guarded by package_checksum (sha256 of package_payload).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.build_delivery_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  build_reference_number text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN (
    'active',
    'superseded',
    'invalidated'
  )),

  -- Frozen references to the exact source records included in this snapshot.
  agreement_draft_id uuid NOT NULL REFERENCES public.agreement_drafts(id),
  agreement_draft_version integer NOT NULL,
  build_card_id uuid NOT NULL REFERENCES public.build_cards(id),
  build_card_version integer NOT NULL,
  owner_decision_id uuid NOT NULL REFERENCES public.owner_gate_decisions(id),
  reviewed_analysis_version text,
  voucher_redemption_id uuid REFERENCES public.intake_voucher_redemptions(id),

  -- Frozen full snapshot + integrity guard.
  package_payload jsonb NOT NULL,
  package_checksum text NOT NULL,

  -- Author + idempotency.
  created_by uuid REFERENCES public.users(id),
  idempotency_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  invalidated_reason text,
  invalidated_at timestamptz,
  UNIQUE (intake_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bdp_idempotency
  ON public.build_delivery_packages(intake_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bdp_intake
  ON public.build_delivery_packages(intake_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_bdp_status
  ON public.build_delivery_packages(status);

ALTER TABLE public.build_delivery_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bdp_select ON public.build_delivery_packages;
CREATE POLICY bdp_select ON public.build_delivery_packages
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- Writes stay behind service-role. RLS blocks direct client writes.

-- ═══════════════════════════════════════════════════════════
-- build_package_acknowledgements
--   Append-only log of builder receipt confirmations.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.build_package_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.build_delivery_packages(id) ON DELETE CASCADE,
  package_version integer NOT NULL,
  acknowledged_by uuid NOT NULL REFERENCES public.users(id),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (package_id, acknowledged_by)
);

CREATE INDEX IF NOT EXISTS idx_bpa_intake
  ON public.build_package_acknowledgements(intake_id, acknowledged_at DESC);

ALTER TABLE public.build_package_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bpa_select ON public.build_package_acknowledgements;
CREATE POLICY bpa_select ON public.build_package_acknowledgements
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- build_delivery_notes
--   Builder-authored clarification requests + delivery blockers.
--   Cannot modify approved scope – any material change must
--   re-enter owner/finance workflow.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.build_delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.build_delivery_packages(id) ON DELETE CASCADE,
  package_version integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('clarification', 'blocker', 'change_request')),
  message text NOT NULL,
  authored_by uuid NOT NULL REFERENCES public.users(id),
  authored_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text
);

CREATE INDEX IF NOT EXISTS idx_bdn_intake
  ON public.build_delivery_notes(intake_id, authored_at DESC);

CREATE INDEX IF NOT EXISTS idx_bdn_open
  ON public.build_delivery_notes(intake_id) WHERE resolved_at IS NULL;

ALTER TABLE public.build_delivery_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bdn_select ON public.build_delivery_notes;
CREATE POLICY bdn_select ON public.build_delivery_notes
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- build_orchestrations
--   Persisted record of a controlled build dispatch attempt.
--   One "active" (non-terminal) row per intake at a time is
--   enforced by a partial unique index.
--
--   The row is created BEFORE the worker is notified. The worker
--   only ever consumes rows whose state advanced past 'queued'
--   through this server, keeping the gate in one place.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.build_orchestrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.build_delivery_packages(id),
  package_version integer NOT NULL,
  package_checksum text NOT NULL,
  build_reference_number text NOT NULL,
  state text NOT NULL CHECK (state IN (
    'queued',
    'in_progress',
    'blocked',
    'failed',
    'completed',
    'cancelled'
  )),
  correlation_id text NOT NULL,
  worker_job_id text,
  requested_by uuid NOT NULL REFERENCES public.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  attempt integer NOT NULL DEFAULT 1,
  parent_orchestration_id uuid REFERENCES public.build_orchestrations(id),
  reason text,
  failure_code text,
  failure_detail text,
  idempotency_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotent trigger: same key against same package returns same row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bo_idempotency
  ON public.build_orchestrations(package_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Correlation id must be unique so worker acknowledgements land on the right row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bo_correlation
  ON public.build_orchestrations(correlation_id);

-- At most one non-terminal orchestration per intake at any moment.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bo_one_active_per_intake
  ON public.build_orchestrations(intake_id)
  WHERE state IN ('queued', 'in_progress', 'blocked');

CREATE INDEX IF NOT EXISTS idx_bo_intake
  ON public.build_orchestrations(intake_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_bo_state
  ON public.build_orchestrations(state);

ALTER TABLE public.build_orchestrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bo_select ON public.build_orchestrations;
CREATE POLICY bo_select ON public.build_orchestrations
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- Phase 7 audit_events event_type values (documentation only – audit_events already exists):
--   build_delivery_package_created
--   build_delivery_package_versioned
--   build_delivery_package_invalidated
--   build_package_accessed
--   build_package_acknowledged
--   build_delivery_note_added
--   build_eligibility_checked
--   build_queue_requested
--   build_started
--   build_completed
--   build_failed
--   build_blocked
--   build_retry_requested
--   build_cancelled
--   scope_change_requested
-- ═══════════════════════════════════════════════════════════
