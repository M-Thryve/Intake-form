-- DESTRUCTIVE: Rollback for 004_owner_gate

DROP INDEX IF EXISTS idx_audit_events_intake_type;
DROP INDEX IF EXISTS idx_owner_gate_decisions_intake;
DROP INDEX IF EXISTS idx_intakes_status;

ALTER TABLE public.build_cards DROP COLUMN IF EXISTS analysis_version;
ALTER TABLE public.build_cards DROP COLUMN IF EXISTS mcp_run_refs;

ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_status_check;

ALTER TABLE public.owner_gate_decisions DROP COLUMN IF EXISTS resulting_status;
ALTER TABLE public.owner_gate_decisions DROP COLUMN IF EXISTS reviewed_analysis_version;
ALTER TABLE public.owner_gate_decisions DROP COLUMN IF EXISTS reviewed_build_card_version;
ALTER TABLE public.owner_gate_decisions DROP COLUMN IF EXISTS build_reference_number;
