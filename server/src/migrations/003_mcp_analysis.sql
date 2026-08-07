-- Migration: 003_mcp_analysis
-- Phase 4: MCP Analysis infrastructure tables
--
-- Adds:
--   owner_release_packages – Factory Console review package storage
--   Indexes on mcp_runs for common query patterns

-- ═══════════════════════════════════════════════════════════
-- owner_release_packages: stores the combined review package
-- for the Factory Console human gate. One per intake.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.owner_release_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  release_package jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

ALTER TABLE public.owner_release_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orp_select ON public.owner_release_packages;
CREATE POLICY orp_select ON public.owner_release_packages
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- Ensure mcp_runs has columns needed by Phase 4
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.mcp_runs
  DROP COLUMN IF EXISTS build_reference_number,
  DROP COLUMN IF EXISTS retry_count,
  DROP COLUMN IF EXISTS correlation_id,
  DROP COLUMN IF EXISTS input_version,
  DROP COLUMN IF EXISTS output_version;

ALTER TABLE public.mcp_runs
  ADD COLUMN IF NOT EXISTS build_reference_number text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correlation_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS input_version text NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS output_version text;

-- ═══════════════════════════════════════════════════════════
-- Indexes for common MCP analysis query patterns
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_mcp_runs_intake_id
  ON public.mcp_runs(intake_id);

CREATE INDEX IF NOT EXISTS idx_mcp_runs_role
  ON public.mcp_runs(server_role);

CREATE INDEX IF NOT EXISTS idx_mcp_runs_status
  ON public.mcp_runs(status);

CREATE INDEX IF NOT EXISTS idx_mcp_runs_correlation
  ON public.mcp_runs(correlation_id);

-- ═══════════════════════════════════════════════════════════
-- Ensure mcp_runs RLS policy exists
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.mcp_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mr_select ON public.mcp_runs;
CREATE POLICY mr_select ON public.mcp_runs
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- Service role bypasses RLS and handles all writes (insert/update).