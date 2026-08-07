-- Migration: 014_client_rls
-- Phase 9 WS-3: client-scoped read policies.
--
-- The API projection is the first line of defence. These policies are the
-- second line: a client session can only read rows reachable from its own
-- client_users mapping, and internal deliberation tables have no client policy.

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
    FROM public.client_users
   WHERE user_id = auth.uid()
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.apply_client_select_policy(
  p_table text,
  p_policy text,
  p_using_clause text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_policy, p_table);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
    p_policy, p_table, p_using_clause
  );
END;
$$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_select_client ON public.clients;
CREATE POLICY clients_select_client ON public.clients
  FOR SELECT TO authenticated
  USING (id = public.current_client_id());

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_users_select_self ON public.client_users;
CREATE POLICY client_users_select_self ON public.client_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS intakes_select_client ON public.intakes;
CREATE POLICY intakes_select_client ON public.intakes
  FOR SELECT TO authenticated
  USING (client_id = public.current_client_id());

-- Current physical table names used by the Phase 5-8 backend.
SELECT public.apply_client_select_policy('intake_features', 'intake_features_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('intake_page_contents', 'intake_page_contents_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('intake_template_selections', 'intake_template_selections_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('uploaded_assets', 'uploaded_assets_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('build_cards', 'build_cards_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('agreement_drafts', 'agreement_drafts_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');

-- Logical Phase 9 names are supported when those normalized tables exist.
-- The helper is conditional so this migration remains compatible with the
-- current legacy physical names while preserving the intended contract.
SELECT public.apply_client_select_policy('intake_projects', 'intake_projects_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('intake_templates', 'intake_templates_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('intake_pages_features', 'intake_pages_features_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');
SELECT public.apply_client_select_policy('intake_assets', 'intake_assets_select_client', 'intake_id IN (SELECT id FROM public.intakes WHERE client_id = public.current_client_id())');

-- Enable RLS and deliberately create no client policies for internal-only
-- deliberation. A client role therefore receives zero rows from these tables.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'intake_events', 'audit_events', 'analysis_runs', 'mcp_runs',
    'owner_gate_decisions', 'owner_release_packages', 'finance_reviews',
    'build_delivery_packages', 'build_orchestrations', 'build_delivery_notes',
    'users'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_client', table_name);
    END IF;
  END LOOP;
END $$;

-- This function is only a migration helper and is not part of the runtime
-- surface. Keep it available for future additive policy migrations.
