-- DESTRUCTIVE: Rollback for 001_rls_policies
-- Drops all RLS policies and helper functions created by migration 001.

-- Users
DROP POLICY IF EXISTS users_select_internal ON public.users;
DROP POLICY IF EXISTS users_insert_admin ON public.users;
DROP POLICY IF EXISTS users_update_admin ON public.users;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Clients
DROP POLICY IF EXISTS clients_select_internal ON public.clients;
DROP POLICY IF EXISTS clients_insert_internal ON public.clients;
DROP POLICY IF EXISTS clients_update_internal ON public.clients;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- Intakes
DROP POLICY IF EXISTS intakes_select_internal ON public.intakes;
DROP POLICY IF EXISTS intakes_insert_internal ON public.intakes;
DROP POLICY IF EXISTS intakes_update_owner_admin ON public.intakes;
ALTER TABLE public.intakes DISABLE ROW LEVEL SECURITY;

-- Intake child tables
DROP POLICY IF EXISTS iaq_select ON public.intake_asset_qualifications;
DROP POLICY IF EXISTS iaq_insert ON public.intake_asset_qualifications;
ALTER TABLE public.intake_asset_qualifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ias_select ON public.intake_asset_statuses;
DROP POLICY IF EXISTS ias_insert ON public.intake_asset_statuses;
ALTER TABLE public.intake_asset_statuses DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iasvc_select ON public.intake_asset_services;
DROP POLICY IF EXISTS iasvc_insert ON public.intake_asset_services;
ALTER TABLE public.intake_asset_services DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ua_select ON public.uploaded_assets;
DROP POLICY IF EXISTS ua_insert ON public.uploaded_assets;
DROP POLICY IF EXISTS ua_update ON public.uploaded_assets;
ALTER TABLE public.uploaded_assets DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS its_select ON public.intake_template_selections;
DROP POLICY IF EXISTS its_insert ON public.intake_template_selections;
ALTER TABLE public.intake_template_selections DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ipc_select ON public.intake_page_contents;
DROP POLICY IF EXISTS ipc_insert ON public.intake_page_contents;
ALTER TABLE public.intake_page_contents DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ier_select ON public.intake_enterprise_requirements;
DROP POLICY IF EXISTS ier_insert ON public.intake_enterprise_requirements;
ALTER TABLE public.intake_enterprise_requirements DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS if_select ON public.intake_features;
DROP POLICY IF EXISTS if_insert ON public.intake_features;
ALTER TABLE public.intake_features DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idp_select ON public.intake_design_preferences;
DROP POLICY IF EXISTS idp_insert ON public.intake_design_preferences;
ALTER TABLE public.intake_design_preferences DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ipp_select ON public.intake_payment_preferences;
DROP POLICY IF EXISTS ipp_insert ON public.intake_payment_preferences;
ALTER TABLE public.intake_payment_preferences DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ivr_select ON public.intake_voucher_redemptions;
DROP POLICY IF EXISTS ivr_insert ON public.intake_voucher_redemptions;
ALTER TABLE public.intake_voucher_redemptions DISABLE ROW LEVEL SECURITY;

-- Templates
DROP POLICY IF EXISTS templates_select ON public.templates;
DROP POLICY IF EXISTS templates_insert_admin ON public.templates;
DROP POLICY IF EXISTS templates_update_admin ON public.templates;
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tp_select ON public.template_pages;
DROP POLICY IF EXISTS tp_insert_admin ON public.template_pages;
ALTER TABLE public.template_pages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tf_select ON public.template_features;
DROP POLICY IF EXISTS tf_insert_admin ON public.template_features;
ALTER TABLE public.template_features DISABLE ROW LEVEL SECURITY;

-- Vouchers
DROP POLICY IF EXISTS vouchers_select ON public.vouchers;
DROP POLICY IF EXISTS vouchers_insert ON public.vouchers;
DROP POLICY IF EXISTS vouchers_update ON public.vouchers;
ALTER TABLE public.vouchers DISABLE ROW LEVEL SECURITY;

-- Build cards
DROP POLICY IF EXISTS bc_select ON public.build_cards;
DROP POLICY IF EXISTS bc_insert ON public.build_cards;
DROP POLICY IF EXISTS bc_update ON public.build_cards;
ALTER TABLE public.build_cards DISABLE ROW LEVEL SECURITY;

-- MCP runs
DROP POLICY IF EXISTS mr_select ON public.mcp_runs;
ALTER TABLE public.mcp_runs DISABLE ROW LEVEL SECURITY;

-- Owner gate decisions
DROP POLICY IF EXISTS ogd_select ON public.owner_gate_decisions;
DROP POLICY IF EXISTS ogd_insert ON public.owner_gate_decisions;
ALTER TABLE public.owner_gate_decisions DISABLE ROW LEVEL SECURITY;

-- Audit events
DROP POLICY IF EXISTS ae_select ON public.audit_events;
ALTER TABLE public.audit_events DISABLE ROW LEVEL SECURITY;

-- Idempotency keys
ALTER TABLE public.idempotency_keys DISABLE ROW LEVEL SECURITY;

-- Helper functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_internal_user();
DROP FUNCTION IF EXISTS public.is_owner_or_admin();
