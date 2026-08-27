-- Migration: 010_templates_industry_tags
-- Phase 5B REV-03: Industry-template mapping infrastructure
--
-- Adds industry_tags column to the templates table and updates RLS to
-- enforce the active-flag visibility rule for non-admin users.
--
-- Tables affected:
--   public.templates — add industry_tags text[], active_flag boolean
--   public.audit_events — ensure template_override events are captured
--
-- Access model:
--   admin           → sees all templates (including inactive)
--   authenticated   → sees only templates WHERE active_flag = true
--   anon            → denied

-- ═══════════════════════════════════════════════════════════
-- 1. Add industry_tags and active_flag columns to templates
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS industry_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS active_flag boolean DEFAULT true;

-- Backfill: set active_flag = true for any existing rows
UPDATE public.templates SET active_flag = true WHERE active_flag IS NULL;

-- ═══════════════════════════════════════════════════════════
-- 2. Replace existing templates_select policy with gated version
--    that respects active_flag for non-admin users.
-- ═══════════════════════════════════════════════════════════

-- Drop the old unrestricted policy
DROP POLICY IF EXISTS templates_select ON public.templates;

-- Non-admins see only active templates
CREATE POLICY templates_select_active ON public.templates
  FOR SELECT TO authenticated
  USING (
    active_flag = true
    OR public.is_owner_or_admin()
  );

-- ═══════════════════════════════════════════════════════════
-- 3. audit_events: allow template_override events via service role
-- ═══════════════════════════════════════════════════════════

-- audit_events already has RLS enabled and a SELECT policy for
-- owner/admin. Service role bypasses RLS for INSERT, so
-- template_override records are written server-side without
-- additional policy changes.

-- Ensure the event_type CHECK constraint covers the new event.
-- If the table has a CHECK constraint on event_type, add it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_events_event_type_check'
    AND conrelid = 'public.audit_events'::regclass
  ) THEN
    ALTER TABLE public.audit_events
      DROP CONSTRAINT audit_events_event_type_check;

    ALTER TABLE public.audit_events
      ADD CONSTRAINT audit_events_event_type_check
      CHECK (event_type IN (
        'intake_created',
        'intake_submitted',
        'intake_discarded',
        'intake_updated',
        'asset_uploaded',
        'asset_scanned',
        'asset_rejected',
        'mcp_run_started',
        'mcp_run_completed',
        'mcp_run_failed',
        'build_card_generated',
        'owner_reviewed',
        'decision_made',
        'template_override',
        'system_event'
      ));
  ELSE
    ALTER TABLE public.audit_events
      ADD CONSTRAINT audit_events_event_type_check
      CHECK (event_type IN (
        'intake_created',
        'intake_submitted',
        'intake_discarded',
        'intake_updated',
        'asset_uploaded',
        'asset_scanned',
        'asset_rejected',
        'mcp_run_started',
        'mcp_run_completed',
        'mcp_run_failed',
        'build_card_generated',
        'owner_reviewed',
        'decision_made',
        'template_override',
        'system_event'
      ));
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. Index for industry_tags queries
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_templates_industry_tags
  ON public.templates USING GIN (industry_tags);

CREATE INDEX IF NOT EXISTS idx_templates_active_flag
  ON public.templates (active_flag) WHERE active_flag = true;