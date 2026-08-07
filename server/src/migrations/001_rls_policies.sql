-- Migration: 001_rls_policies
-- Phase 3: RLS policies for non-service-role access
--
-- Access model:
--   service_role  → bypasses RLS (Supabase default, used by Express server)
--   authenticated → users table lookup determines role-based access
--   anon          → denied on all tables
--
-- Roles:
--   intake_operator, owner, architect, finance, builder, admin → internal staff
--   client (future) → sees only own intakes via client.email = auth.email()
--
-- Service-role key is used by the Express server for all current operations.
-- These policies prepare for future authenticated access (Factory Console, client portal).

-- ═══════════════════════════════════════════════════════════
-- Helper function: get the role of the authenticated user
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('intake_operator', 'owner', 'architect', 'finance', 'builder', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
$$;

-- ═══════════════════════════════════════════════════════════
-- users: internal users can read all, only admin can write
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_internal ON public.users;
CREATE POLICY users_select_internal ON public.users
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS users_insert_admin ON public.users;
CREATE POLICY users_insert_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin());

DROP POLICY IF EXISTS users_update_admin ON public.users;
CREATE POLICY users_update_admin ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin());

-- ═══════════════════════════════════════════════════════════
-- clients: internal users read all, intake_operator+ can write
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_select_internal ON public.clients;
CREATE POLICY clients_select_internal ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS clients_insert_internal ON public.clients;
CREATE POLICY clients_insert_internal ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

DROP POLICY IF EXISTS clients_update_internal ON public.clients;
CREATE POLICY clients_update_internal ON public.clients
  FOR UPDATE TO authenticated
  USING (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- intakes: internal read all, intake_operator+ can insert
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intakes_select_internal ON public.intakes;
CREATE POLICY intakes_select_internal ON public.intakes
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS intakes_insert_internal ON public.intakes;
CREATE POLICY intakes_insert_internal ON public.intakes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

DROP POLICY IF EXISTS intakes_update_owner_admin ON public.intakes;
CREATE POLICY intakes_update_owner_admin ON public.intakes
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin());

-- ═══════════════════════════════════════════════════════════
-- intake child tables: follow intake access pattern
-- ═══════════════════════════════════════════════════════════

-- intake_asset_qualifications
ALTER TABLE public.intake_asset_qualifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iaq_select ON public.intake_asset_qualifications;
CREATE POLICY iaq_select ON public.intake_asset_qualifications
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS iaq_insert ON public.intake_asset_qualifications;
CREATE POLICY iaq_insert ON public.intake_asset_qualifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_asset_statuses
ALTER TABLE public.intake_asset_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ias_select ON public.intake_asset_statuses;
CREATE POLICY ias_select ON public.intake_asset_statuses
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ias_insert ON public.intake_asset_statuses;
CREATE POLICY ias_insert ON public.intake_asset_statuses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_asset_services
ALTER TABLE public.intake_asset_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iasvc_select ON public.intake_asset_services;
CREATE POLICY iasvc_select ON public.intake_asset_services
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS iasvc_insert ON public.intake_asset_services;
CREATE POLICY iasvc_insert ON public.intake_asset_services
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- uploaded_assets
ALTER TABLE public.uploaded_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ua_select ON public.uploaded_assets;
CREATE POLICY ua_select ON public.uploaded_assets
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ua_insert ON public.uploaded_assets;
CREATE POLICY ua_insert ON public.uploaded_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

DROP POLICY IF EXISTS ua_update ON public.uploaded_assets;
CREATE POLICY ua_update ON public.uploaded_assets
  FOR UPDATE TO authenticated
  USING (public.is_internal_user());

-- intake_template_selections
ALTER TABLE public.intake_template_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS its_select ON public.intake_template_selections;
CREATE POLICY its_select ON public.intake_template_selections
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS its_insert ON public.intake_template_selections;
CREATE POLICY its_insert ON public.intake_template_selections
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_page_contents
ALTER TABLE public.intake_page_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ipc_select ON public.intake_page_contents;
CREATE POLICY ipc_select ON public.intake_page_contents
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ipc_insert ON public.intake_page_contents;
CREATE POLICY ipc_insert ON public.intake_page_contents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_enterprise_requirements
ALTER TABLE public.intake_enterprise_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ier_select ON public.intake_enterprise_requirements;
CREATE POLICY ier_select ON public.intake_enterprise_requirements
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ier_insert ON public.intake_enterprise_requirements;
CREATE POLICY ier_insert ON public.intake_enterprise_requirements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_features
ALTER TABLE public.intake_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS if_select ON public.intake_features;
CREATE POLICY if_select ON public.intake_features
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS if_insert ON public.intake_features;
CREATE POLICY if_insert ON public.intake_features
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_design_preferences
ALTER TABLE public.intake_design_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idp_select ON public.intake_design_preferences;
CREATE POLICY idp_select ON public.intake_design_preferences
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS idp_insert ON public.intake_design_preferences;
CREATE POLICY idp_insert ON public.intake_design_preferences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_payment_preferences
ALTER TABLE public.intake_payment_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ipp_select ON public.intake_payment_preferences;
CREATE POLICY ipp_select ON public.intake_payment_preferences
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ipp_insert ON public.intake_payment_preferences;
CREATE POLICY ipp_insert ON public.intake_payment_preferences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- intake_voucher_redemptions
ALTER TABLE public.intake_voucher_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ivr_select ON public.intake_voucher_redemptions;
CREATE POLICY ivr_select ON public.intake_voucher_redemptions
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ivr_insert ON public.intake_voucher_redemptions;
CREATE POLICY ivr_insert ON public.intake_voucher_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

-- ═══════════════════════════════════════════════════════════
-- templates: readable by all authenticated, writable by admin
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_select ON public.templates;
CREATE POLICY templates_select ON public.templates
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS templates_insert_admin ON public.templates;
CREATE POLICY templates_insert_admin ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin());

DROP POLICY IF EXISTS templates_update_admin ON public.templates;
CREATE POLICY templates_update_admin ON public.templates
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin());

-- template_pages
ALTER TABLE public.template_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tp_select ON public.template_pages;
CREATE POLICY tp_select ON public.template_pages
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tp_insert_admin ON public.template_pages;
CREATE POLICY tp_insert_admin ON public.template_pages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin());

-- template_features
ALTER TABLE public.template_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tf_select ON public.template_features;
CREATE POLICY tf_select ON public.template_features
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tf_insert_admin ON public.template_features;
CREATE POLICY tf_insert_admin ON public.template_features
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin());

-- ═══════════════════════════════════════════════════════════
-- vouchers: readable by internal, writable by owner/admin
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vouchers_select ON public.vouchers;
CREATE POLICY vouchers_select ON public.vouchers
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS vouchers_insert ON public.vouchers;
CREATE POLICY vouchers_insert ON public.vouchers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin());

DROP POLICY IF EXISTS vouchers_update ON public.vouchers;
CREATE POLICY vouchers_update ON public.vouchers
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin());

-- ═══════════════════════════════════════════════════════════
-- build_cards: readable by internal, writable by owner/admin + system
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.build_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_select ON public.build_cards;
CREATE POLICY bc_select ON public.build_cards
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS bc_insert ON public.build_cards;
CREATE POLICY bc_insert ON public.build_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());

DROP POLICY IF EXISTS bc_update ON public.build_cards;
CREATE POLICY bc_update ON public.build_cards
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin());

-- ═══════════════════════════════════════════════════════════
-- mcp_runs: readable by internal, writable by system (service role)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.mcp_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mr_select ON public.mcp_runs;
CREATE POLICY mr_select ON public.mcp_runs
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- MCP runs are created by the service role (server-side only).
-- No authenticated INSERT policy needed — service role bypasses RLS.

-- ═══════════════════════════════════════════════════════════
-- owner_gate_decisions: owner/admin only
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.owner_gate_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ogd_select ON public.owner_gate_decisions;
CREATE POLICY ogd_select ON public.owner_gate_decisions
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS ogd_insert ON public.owner_gate_decisions;
CREATE POLICY ogd_insert ON public.owner_gate_decisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin());

-- ═══════════════════════════════════════════════════════════
-- audit_events: append-only, readable by owner/admin
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ae_select ON public.audit_events;
CREATE POLICY ae_select ON public.audit_events
  FOR SELECT TO authenticated
  USING (public.is_owner_or_admin());

-- Audit events are written by the service role (server-side only).
-- No authenticated INSERT policy — service role bypasses RLS.

-- ═══════════════════════════════════════════════════════════
-- idempotency_keys: service-role only (no authenticated access)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated role — idempotency is a server-side concern.
-- Service role bypasses RLS for read/write.

-- ═══════════════════════════════════════════════════════════
-- Storage policies for intake-assets bucket
-- ═══════════════════════════════════════════════════════════

-- The intake-assets bucket is private by default.
-- Uploads use signed URLs generated server-side (service role).
-- Downloads use time-limited signed URLs generated server-side.
-- No direct anon or authenticated bucket access.
