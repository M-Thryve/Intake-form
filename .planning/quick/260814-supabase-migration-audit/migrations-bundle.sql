-- ============================================================
-- MIGRATION: 000_phase2_intake_schema.sql
-- ============================================================

-- Phase 2 foundation: tables required by the intake submission API.
--
-- This migration intentionally keeps submitted payload snapshots in JSONB so
-- the API can preserve the Phase 1 contract while retaining queryable child
-- records for the intake, template, enterprise, scope, asset, payment, and
-- audit concerns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'intake_operator',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  tenant_id uuid,
  build_path text,
  build_reference_number text UNIQUE,
  status text NOT NULL DEFAULT 'in_progress',
  tier text NOT NULL,
  client_details jsonb NOT NULL DEFAULT '{}',
  project_details jsonb NOT NULL DEFAULT '{}',
  scope jsonb NOT NULL DEFAULT '{}',
  submission_payload jsonb NOT NULL DEFAULT '{}',
  commercial_stage text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  idempotency_key text PRIMARY KEY,
  intake_id uuid REFERENCES public.intakes(id) ON DELETE CASCADE,
  payload_hash text NOT NULL,
  response_body jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid REFERENCES public.intakes(id) ON DELETE CASCADE,
  actor_type text NOT NULL DEFAULT 'system',
  actor_id uuid,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intake_asset_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  qualification text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

CREATE TABLE IF NOT EXISTS public.intake_asset_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  asset_key text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, asset_key)
);

CREATE TABLE IF NOT EXISTS public.intake_asset_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  service text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, service)
);

CREATE TABLE IF NOT EXISTS public.uploaded_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  storage_path text NOT NULL DEFAULT '',
  original_filename text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intake_template_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  project_version text NOT NULL,
  color_preset text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

CREATE TABLE IF NOT EXISTS public.intake_page_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  page_name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intake_enterprise_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  requirements jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

CREATE TABLE IF NOT EXISTS public.intake_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority text NOT NULL,
  source text NOT NULL,
  preliminary_cost numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intake_design_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  styles jsonb NOT NULL DEFAULT '[]',
  inspiration_link text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

CREATE TABLE IF NOT EXISTS public.intake_payment_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  plan text NOT NULL,
  maintenance_after_free text NOT NULL DEFAULT '',
  maintenance_end_acknowledged boolean NOT NULL DEFAULT false,
  voucher_code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'inactive',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intake_voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  voucher_id uuid REFERENCES public.vouchers(id),
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.build_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  preliminary_card jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id)
);

CREATE TABLE IF NOT EXISTS public.mcp_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  server_role text NOT NULL DEFAULT 'build_card',
  status text NOT NULL DEFAULT 'queued',
  input_payload jsonb NOT NULL DEFAULT '{}',
  output_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owner_gate_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  decision text NOT NULL,
  reason text NOT NULL DEFAULT '',
  decided_by uuid REFERENCES public.users(id),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intake_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  project jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.intake_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  template jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.intake_pages_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  pages jsonb NOT NULL DEFAULT '[]',
  features jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS public.intake_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  assets jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.intake_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  page_name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.template_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  feature_name text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intakes_status ON public.intakes(status);
CREATE INDEX IF NOT EXISTS idx_intakes_client_id ON public.intakes(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_intake_id ON public.audit_events(intake_id);

-- ========================= END 000_phase2_intake_schema.sql ===========================
-- ============================================================
-- MIGRATION: 001_rls_policies.sql
-- ============================================================

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

-- ========================= END 001_rls_policies.sql ===========================
-- ============================================================
-- MIGRATION: 002_asset_pipeline.sql
-- ============================================================

-- Migration: 002_asset_pipeline
-- Phase 3: Asset lifecycle enhancements
--
-- Adds asset_status lifecycle column to uploaded_assets,
-- an asset_state_log for auditable state transitions,
-- and indexes for common query patterns.

-- Add lifecycle status to uploaded_assets
ALTER TABLE public.uploaded_assets
  ADD COLUMN IF NOT EXISTS asset_status text NOT NULL DEFAULT 'pending'
  CHECK (asset_status IN ('pending', 'uploaded', 'scanning', 'ready', 'rejected', 'failed'));

ALTER TABLE public.uploaded_assets
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.uploaded_assets
  ADD COLUMN IF NOT EXISTS validated_mime_type text;

ALTER TABLE public.uploaded_assets
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'intake-assets';

-- Asset state transition log (auditable)
CREATE TABLE IF NOT EXISTS public.asset_state_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.uploaded_assets(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  actor_type text NOT NULL CHECK (actor_type IN ('system', 'user', 'scanner')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for asset_state_log
ALTER TABLE public.asset_state_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asl_select ON public.asset_state_log;
CREATE POLICY asl_select ON public.asset_state_log
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_assets_intake_id
  ON public.uploaded_assets(intake_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_status
  ON public.uploaded_assets(asset_status);

CREATE INDEX IF NOT EXISTS idx_asset_state_log_asset_id
  ON public.asset_state_log(asset_id);

-- Create storage bucket (idempotent — Supabase ignores if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-assets', 'intake-assets', false)
ON CONFLICT (id) DO NOTHING;

-- ========================= END 002_asset_pipeline.sql ===========================
-- ============================================================
-- MIGRATION: 003_mcp_analysis.sql
-- ============================================================

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
-- ========================= END 003_mcp_analysis.sql ===========================
-- ============================================================
-- MIGRATION: 004_owner_gate.sql
-- ============================================================

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
-- ========================= END 004_owner_gate.sql ===========================
-- ============================================================
-- MIGRATION: 005_agreement_finance.sql
-- ============================================================

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

-- ========================= END 005_agreement_finance.sql ===========================
-- ============================================================
-- MIGRATION: 006_build_delivery.sql
-- ============================================================

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

-- ========================= END 006_build_delivery.sql ===========================
-- ============================================================
-- MIGRATION: 007_v2_build_path_constraints.sql
-- ============================================================

-- Migration: 007_v2_build_path_constraints
-- Phase 4: Enforce v2.0 build_path constraints, audit event support,
--           and reference number generation on submission only.
--
-- Adds:
--   - intakes.build_path CHECK constraint (custom | enterprise only for new records)
--   - intake_lifecycle_events table (per TECHNICAL_HANDOVER §12)
--   - build_path constraint enforcement via trigger
--   - Legacy 'template' records remain readable but not selectable for new rows.

-- ═══════════════════════════════════════════════════════════
-- 1. Add build_path column + constraint
--    New rows: custom | enterprise only.
--    Legacy template rows read as-is (no check on existing rows).
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'intakes' AND column_name = 'build_path'
  ) THEN
    ALTER TABLE public.intakes ADD COLUMN build_path text;
  END IF;
END $$;

-- Add constraint for new records only.
-- Existing rows (created before this migration) are not validated by this CHECK.
ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS intakes_build_path_check;
ALTER TABLE public.intakes ADD CONSTRAINT intakes_build_path_check CHECK (
  build_path IS NULL OR build_path IN ('custom', 'enterprise')
);

-- ═══════════════════════════════════════════════════════════
-- 2. Normalize legacy build_path values.
-- ═══════════════════════════════════════════════════════════

UPDATE public.intakes
SET build_path = 'custom'
WHERE build_path = 'template';

-- ═══════════════════════════════════════════════════════════
-- 3. Intake Lifecycle Events (append-only audit per §12)
--    Records every status transition with acting user, prev/next state.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.intake_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created_in_progress',
    'saved_as_draft',
    'submitted_for_review',
    'discarded',
    'status_change',
    'owner_review_approved',
    'owner_review_rejected',
    'owner_revision_requested',
    'build_reference_assigned',
    'validation_failed',
    'operator_note_added',
    'operator_note_updated'
  )),
  actor_type text NOT NULL CHECK (actor_type IN ('operator', 'owner', 'service', 'system')),
  actor_id uuid REFERENCES public.users(id),
  previous_status text,
  new_status text,
  previous_outcome text,
  outcome text,
  reason text,
  metadata jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ile_select_internal ON public.intake_lifecycle_events;
CREATE POLICY ile_select_internal ON public.intake_lifecycle_events
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- Service role writes lifecycle events (service role bypasses RLS).

CREATE INDEX IF NOT EXISTS idx_ile_intake
  ON public.intake_lifecycle_events(intake_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ile_event_type
  ON public.intake_lifecycle_events(event_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- 4. Reference number generation function (submission only).
-- ═══════════════════════════════════════════════════════════
-- Build reference format: MTH-YYYYMMDD-XXXX-RRRR
-- Prefix + submission date + 4 char hex + 4 random chars.
CREATE OR REPLACE FUNCTION public.generate_build_reference_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  date text := to_char(now(), 'YYYYMMDD');
  hex_part text;
  rand_part text;
  n int;
BEGIN
  n := (random() * 65535)::int;
  hex_part := lpad(to_hex(n), 4, '');
  rand_part := upper(left(md5(hex_part || clock_timestamp()::text), 4));
  RETURN 'MTH-' || date || '-' || hex_part || '-' || rand_part;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. Idempotency key guard function.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_idempotency_key(
  p_key text,
  p_operation text,
  p_ttl_seconds integer DEFAULT 3600
)
RETURNS SETOF public.intake_lifecycle_events
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.intake_lifecycle_events
  WHERE idempotency_key = p_key
  AND event_type = p_operation
  AND created_at > now() - make_interval(secs := p_ttl_seconds)
  LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════
-- 6. Update audit_events event_type CHECK constraint
--    (documentation only — audit_events uses text, no CHECK constraint update needed).
--    New event types:
--      lifecycle_in_progress
--      lifecycle_draft_saved
--      lifecycle_submitted
--      lifecycle_discarded
--      lifecycle_reference_assigned
--      lifecycle_owner_approved
--      lifecycle_owner_rejected
--      lifecycle_revision_requested
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 7. Migration log (not persisted, documentation only).
-- ═══════════════════════════════════════════════════════════
-- ========================= END 007_v2_build_path_constraints.sql ===========================
-- ============================================================
-- MIGRATION: 008_submit_intake_lifecycle.sql
-- ============================================================

-- Migration: 008_submit_intake_lifecycle
-- Phase 4 Delta: Refactor submit_intake RPC for lifecycle operations.
--
-- Adds:
--   - p_status parameter (text, NOT NULL) — target status from lifecycle command
--   - p_build_ref parameter (text, NULLABLE) — null for save_draft/discard
--   - Transactional intake_lifecycle_events insert with prev/next state audit
--   - Conditional build_reference_number assignment (submitted only)

-- ═══════════════════════════════════════════════════════════
-- 1. Drop old CREATE POLICY without DROP (idempotency fix from migration 007)
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 2. Refactored submit_intake RPC
--    Accepts p_status (draft | submitted | discarded) and
--    nullable p_build_ref. Writes an intake_lifecycle_events row
--    transactional atomically with the intake row.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.submit_intake(
  p_idempotency_key  text,
  p_payload_hash     text,
  p_build_ref        text,          -- NULL for save_draft / discard
  p_status           text,          -- 'draft' | 'submitted' | 'discarded'
  p_client_full_name text,
  p_client_company   text,
  p_client_email     text,
  p_client_phone     text,
  p_project_name     text,
  p_industry         text,
  p_project_type     text,
  p_business_description text,
  p_tier             text,
  p_asset_qualification text,
  p_asset_statuses   text,
  p_asset_services   text,
  p_template         text,
  p_enterprise       text,
  p_pages            text,
  p_features         text,
  p_design_styles    text,
  p_inspiration_link text,
  p_payment_plan     text,
  p_maintenance_after_free text,
  p_maintenance_end_acknowledged boolean,
  p_voucher_code     text,
  p_confirmations    text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intake_id      uuid;
  v_previous_status text;
  v_existing        record;
BEGIN
  -- Idempotency guard: if already processed, return without side effects.
  SELECT intake_id INTO v_existing
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('intake_id', v_existing.intake_id, 'status', p_status);
  END IF;

  -- Determine previous status: if intake already exists (resubmit/change),
  -- capture the current status; otherwise it's the first create.
  SELECT id, status INTO v_intake_id, v_previous_status
  FROM public.intakes
  WHERE build_reference_number = p_build_ref
  LIMIT 1;

  -- Build reference number is only assigned on submission.
  -- For draft and discard, use NULL so no reference is generated.
  IF p_status = 'submitted' AND p_build_ref IS NOT NULL THEN
    IF v_intake_id IS NULL THEN
      INSERT INTO public.intakes (
        build_path,
        build_reference_number,
        status,
        tenant_id,
        client_details,
        project_details,
        tier,
        scope,
        submission_payload
      ) VALUES (
        CASE WHEN p_tier = 'enterprise' THEN 'enterprise' ELSE 'custom' END,
        p_build_ref,
        'submitted',
        NULL,
        jsonb_build_object(
          'full_name', p_client_full_name,
          'company', p_client_company,
          'email', p_client_email,
          'phone', p_client_phone
        ),
        jsonb_build_object(
          'project_name', p_project_name,
          'industry', p_industry,
          'project_type', p_project_type,
          'business_description', p_business_description
        ),
        p_tier,
        jsonb_build_object(
          'pages', p_pages::jsonb,
          'features', p_features::jsonb,
          'design_styles', p_design_styles::jsonb,
          'inspiration_link', p_inspiration_link
        ),
        jsonb_build_object(
          'tier', p_tier,
          'project_type', p_project_type,
          'asset_qualification', p_asset_qualification
        )
      )
      RETURNING id INTO v_intake_id;
    ELSE
      UPDATE public.intakes
      SET status = p_status,
          build_reference_number = p_build_ref,
          updated_at = now()
      WHERE id = v_intake_id;
    END IF;
  ELSE
    -- save_draft or discard: no reference number.
    IF v_intake_id IS NULL THEN
      INSERT INTO public.intakes (
        build_path,
        status,
        tenant_id,
        client_details,
        project_details,
        tier,
        scope,
        submission_payload
      ) VALUES (
        CASE WHEN p_tier = 'enterprise' THEN 'enterprise' ELSE 'custom' END,
        p_status,
        NULL,
        jsonb_build_object(
          'full_name', p_client_full_name,
          'company', p_client_company,
          'email', p_client_email,
          'phone', p_client_phone
        ),
        jsonb_build_object(
          'project_name', p_project_name,
          'industry', p_industry,
          'project_type', p_project_type,
          'business_description', p_business_description
        ),
        p_tier,
        jsonb_build_object(
          'pages', p_pages::jsonb,
          'features', p_features::jsonb,
          'design_styles', p_design_styles::jsonb,
          'inspiration_link', p_inspiration_link
        ),
        jsonb_build_object(
          'tier', p_tier,
          'project_type', p_project_type,
          'asset_qualification', p_asset_qualification
        )
      )
      RETURNING id INTO v_intake_id;
    ELSE
      UPDATE public.intakes
      SET status = p_status,
          updated_at = now()
      WHERE id = v_intake_id;
    END IF;
  END IF;

  -- Phase 4: Append-only lifecycle event record.
  INSERT INTO public.intake_lifecycle_events (
    intake_id,
    event_type,
    actor_type,
    previous_status,
    new_status,
    idempotency_key,
    metadata
  ) VALUES (
    v_intake_id,
    CASE p_status
      WHEN 'draft'     THEN 'saved_as_draft'
      WHEN 'submitted' THEN 'submitted_for_review'
      WHEN 'discarded'  THEN 'discarded'
      ELSE 'status_change'
    END,
    'system',
    v_previous_status,
    p_status,
    p_idempotency_key,
    jsonb_build_object(
      'build_path', CASE WHEN p_tier = 'enterprise' THEN 'enterprise' ELSE 'custom' END,
      'tier', p_tier,
      'project_type', p_project_type
    )
  );

  RETURN jsonb_build_object(
    'intake_id', v_intake_id,
    'build_reference', p_build_ref,
    'status', p_status,
    'action', 'persisted'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- Migration log (documentation only)
-- ═══════════════════════════════════════════════════════════
-- ========================= END 008_submit_intake_lifecycle.sql ===========================
-- ============================================================
-- MIGRATION: 009_client_id_backfill.sql
-- ============================================================

-- Migration: 009_client_id_backfill
-- Phase 5 (REV-07): Backfill intakes.client_id for all rows where it is NULL
-- then add a NOT NULL constraint.
--
-- Rationale: REV-07 mandates that client_id is populated at the first
-- persistence event. Some legacy rows may have NULL due to earlier
-- intake flow versions. BUILD IT depends on stable client IDs across intakes.

-- ═══════════════════════════════════════════════════════════
-- 1. Backfill intakes where client_id IS NULL using the
--    matching intake_clients row. If no matching client row
--    exists, create a synthetic one from stored intake data.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
  v_new_client_id uuid;
BEGIN
  FOR r IN
    SELECT i.id        AS intake_id,
           i.full_name,
           i.company,
           i.email,
           i.phone
      FROM public.intakes i
     WHERE i.client_id IS NULL
  LOOP
    -- Try to find a matching intake_clients row
    SELECT ic.id
      INTO v_new_client_id
      FROM public.intake_clients ic
     WHERE ic.intake_id = r.intake_id
     LIMIT 1;

    -- If no matching client row, create one from stored intake data
    IF v_new_client_id IS NULL THEN
      INSERT INTO public.intake_clients (intake_id, full_name, company, email, phone)
      VALUES (r.intake_id, r.full_name, r.company, r.email, r.phone)
      ON CONFLICT (intake_id) DO NOTHING
      RETURNING id INTO v_new_client_id;

      -- Re-read in case ON CONFLICT DO NOTHING fired
      IF v_new_client_id IS NULL THEN
        SELECT ic.id
          INTO v_new_client_id
          FROM public.intake_clients ic
         WHERE ic.intake_id = r.intake_id
         LIMIT 1;
      END IF;
    END IF;

    -- Backfill and audit
    IF v_new_client_id IS NOT NULL THEN
      UPDATE public.intakes
         SET client_id = v_new_client_id
       WHERE id = r.intake_id;

      INSERT INTO public.audit_events (intake_id, event_type, actor_type, event_payload)
      VALUES (
        r.intake_id,
        'client_id_backfilled',
        'system',
        jsonb_build_object('new_client_id', v_new_client_id)
      );
    END IF;
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Add NOT NULL constraint on intakes.client_id
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.intakes
  ALTER COLUMN client_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- 3. RLS worry about client_id — no existing policies touch
--    client_id, but ensure any future policy knows it's safe.
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS intakes_select ON public.intakes;

CREATE POLICY intakes_select ON public.intakes
  FOR SELECT TO authenticated
  USING (public.is_internal_user());
-- ========================= END 009_client_id_backfill.sql ===========================
-- ============================================================
-- MIGRATION: 010_audit_actor_type_extension.sql
-- ============================================================

-- Migration: 010_audit_actor_type_extension
-- Phase 8 (WS-4): Extend audit_events.actor_type CHECK to include 'mcp' and 'service'.
--
-- The original CHECK (from 002_asset_pipeline) allows: system, user, scanner.
-- This migration adds: mcp, service, operator, owner — aligning with
-- intake_lifecycle_events actor_type values and new MCP analysis events.

ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_type_check;

ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_actor_type_check CHECK (
  actor_type IN ('system', 'user', 'scanner', 'mcp', 'service', 'operator', 'owner')
);

-- ========================= END 010_audit_actor_type_extension.sql ===========================
-- ============================================================
-- MIGRATION: 011_notification_outbox.sql
-- ============================================================

-- Migration: 011_notification_outbox
-- Phase 8 (WS-6): Notification outbox table for transactional notifications.
--
-- Adds:
--   notification_outbox — append-only queue of notifications to be delivered.
--   All PII in the payload MUST be redacted before insertion
--   (enforced by application code, not a DB constraint).

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'webhook')),
  event_type text NOT NULL,
  recipient_ref text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'cancelled'
  )),
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  failed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_outbox_intake
  ON public.notification_outbox(intake_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_outbox_pending
  ON public.notification_outbox(status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_outbox_select ON public.notification_outbox;
CREATE POLICY notif_outbox_select ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- ========================= END 011_notification_outbox.sql ===========================
-- ============================================================
-- MIGRATION: 012_outbox_automation.sql
-- ============================================================

-- Migration: 012_outbox_automation
-- Phase 11 (WS-1): Extends notification_outbox for n8n automation layer.
--
-- Adds:
--   - 'dead_letter' and 'delivered' statuses
--   - 'slack' channel type
--   - last_error column for failure diagnostics
--   - max_attempts default (5)
--   - notification_delivery_log view joining outbox to audit_events
--   - Sweeper index for pending rows older than a threshold
--   - RLS policy for internal service reads

-- 1. Extend status enum to include 'delivered' and 'dead_letter'
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_status_check;

ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'dead_letter', 'cancelled'));

-- 2. Add 'slack' to channel types
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_channel_check;

ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_channel_check
  CHECK (channel IN ('email', 'sms', 'in_app', 'webhook', 'slack'));

-- 3. Add last_error column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_outbox'
      AND column_name = 'last_error'
  ) THEN
    ALTER TABLE public.notification_outbox
      ADD COLUMN last_error text;
  END IF;
END $$;

-- 4. Add max_attempts column with default cap of 5
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_outbox'
      AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE public.notification_outbox
      ADD COLUMN max_attempts integer NOT NULL DEFAULT 5;
  END IF;
END $$;

-- 5. Add delivered_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_outbox'
      AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.notification_outbox
      ADD COLUMN delivered_at timestamptz;
  END IF;
END $$;

-- 6. Index for sweeper: pending rows ordered by age
CREATE INDEX IF NOT EXISTS idx_notif_outbox_sweeper
  ON public.notification_outbox(created_at)
  WHERE status = 'pending';

-- 7. Index for dead-letter monitoring
CREATE INDEX IF NOT EXISTS idx_notif_outbox_dead_letter
  ON public.notification_outbox(created_at DESC)
  WHERE status = 'dead_letter';

-- 8. Notification delivery log view (joins outbox to audit_events)
CREATE OR REPLACE VIEW public.notification_delivery_log AS
SELECT
  o.id AS outbox_id,
  o.intake_id,
  o.channel,
  o.event_type,
  o.recipient_ref,
  o.status,
  o.attempt_count,
  o.max_attempts,
  o.last_error,
  o.created_at AS queued_at,
  o.delivered_at,
  o.last_attempt_at,
  a.id AS audit_event_id,
  a.action AS audit_action,
  a.created_at AS audit_timestamp
FROM public.notification_outbox o
LEFT JOIN public.audit_events a
  ON a.intake_id = o.intake_id
  AND a.action = 'notification_' || o.event_type
  AND a.created_at >= o.created_at
ORDER BY o.created_at DESC;

-- 9. Allow internal service to read/update outbox via RLS
DROP POLICY IF EXISTS notif_outbox_service_update ON public.notification_outbox;
CREATE POLICY notif_outbox_service_update ON public.notification_outbox
  FOR UPDATE TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS notif_outbox_service_select ON public.notification_outbox;
CREATE POLICY notif_outbox_service_select ON public.notification_outbox
  FOR SELECT TO service_role
  USING (true);

-- ========================= END 012_outbox_automation.sql ===========================
-- ============================================================
-- MIGRATION: 013_client_identity.sql
-- ============================================================

-- Migration: 013_client_identity
-- Phase 9 WS-1/WS-2: stable client identity and portal user bindings.
--
-- Identity is resolved by normalised email at the first intakes INSERT. The
-- submitted email is retained on clients.email; normalised_email is matching
-- metadata only. The trigger covers draft, submit, and discard persistence
-- through submit_intake without requiring a second RPC signature migration.

CREATE OR REPLACE FUNCTION public.normalize_client_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN position('@' IN btrim(p_email)) > 1 THEN
      regexp_replace(lower(split_part(btrim(p_email), '@', 1)), '\+.*$', '')
      || '@' || lower(split_part(btrim(p_email), '@', 2))
    ELSE lower(btrim(p_email))
  END;
$$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS normalized_email text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS first_intake_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_intake_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
  ALTER TABLE public.clients ADD CONSTRAINT clients_status_check
    CHECK (status IN ('prospect', 'active', 'dormant', 'archived'));
END $$;

UPDATE public.clients
   SET normalized_email = public.normalize_client_email(email)
 WHERE normalized_email IS NULL
   AND email IS NOT NULL
   AND btrim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_normalized_email
  ON public.clients(normalized_email)
  WHERE normalized_email IS NOT NULL;

-- Backfill legacy rows before enforcing the identity invariant. Existing
-- installations may already have client_id NOT NULL from migration 009; the
-- UPDATE remains safe and documents the Phase 9 verification point.
DO $$
DECLARE
  r record;
  v_client_id uuid;
  v_email text;
BEGIN
  FOR r IN
    SELECT id, client_details
      FROM public.intakes
     WHERE client_id IS NULL
  LOOP
    v_email := r.client_details->>'email';
    IF v_email IS NULL OR btrim(v_email) = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.clients (full_name, company, email, normalized_email, phone, status)
    VALUES (
      r.client_details->>'full_name',
      r.client_details->>'company',
      v_email,
      public.normalize_client_email(v_email),
      r.client_details->>'phone',
      'prospect'
    )
    ON CONFLICT (normalized_email) DO NOTHING;

    SELECT id INTO v_client_id
      FROM public.clients
     WHERE normalized_email = public.normalize_client_email(v_email)
     LIMIT 1;

    UPDATE public.intakes SET client_id = v_client_id WHERE id = r.id;
  END LOOP;

  -- Older Phase 8 deployments may retain the intake_clients compatibility
  -- table. If present, use its submitted email for any rows whose JSON
  -- snapshot did not contain an email.
  IF to_regclass('public.intake_clients') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.clients (full_name, company, email, normalized_email, phone, status)
      SELECT ic.full_name, ic.company, ic.email,
             public.normalize_client_email(ic.email), ic.phone, 'prospect'
        FROM public.intake_clients ic
       WHERE ic.email IS NOT NULL
         AND btrim(ic.email) <> ''
      ON CONFLICT (normalized_email) DO NOTHING
    $sql$;

    EXECUTE $sql$
      UPDATE public.intakes i
         SET client_id = c.id
        FROM public.intake_clients ic
        JOIN public.clients c
          ON c.normalized_email = public.normalize_client_email(ic.email)
       WHERE ic.intake_id = i.id
    $sql$;
  END IF;
END $$;

UPDATE public.clients c
   SET first_intake_at = coalesce(c.first_intake_at, intake_dates.first_intake_at),
       last_intake_at = coalesce(intake_dates.last_intake_at, c.last_intake_at)
  FROM (
    SELECT client_id, min(created_at) AS first_intake_at, max(updated_at) AS last_intake_at
      FROM public.intakes
     WHERE client_id IS NOT NULL
     GROUP BY client_id
  ) AS intake_dates
 WHERE c.id = intake_dates.client_id;

ALTER TABLE public.intakes
  ALTER COLUMN client_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_intake_client_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_details jsonb := coalesce(NEW.client_details, '{}'::jsonb);
  v_email text := nullif(btrim(v_details->>'email'), '');
  v_normalized_email text;
  v_client_id uuid;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    UPDATE public.clients
       SET last_intake_at = coalesce(last_intake_at, now())
     WHERE id = NEW.client_id;
    RETURN NEW;
  END IF;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'client email is required at first intake persistence'
      USING ERRCODE = '23514';
  END IF;

  v_normalized_email := public.normalize_client_email(v_email);

  SELECT id INTO v_client_id
    FROM public.clients
   WHERE normalized_email = v_normalized_email
   FOR UPDATE;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (
      full_name, company, email, normalized_email, phone,
      status, first_intake_at, last_intake_at
    )
    VALUES (
      v_details->>'full_name',
      v_details->>'company',
      v_email,
      v_normalized_email,
      v_details->>'phone',
      'prospect',
      now(),
      now()
    )
    ON CONFLICT (normalized_email) DO NOTHING
    RETURNING id INTO v_client_id;

    IF v_client_id IS NULL THEN
      SELECT id INTO v_client_id
        FROM public.clients
       WHERE normalized_email = v_normalized_email
       FOR UPDATE;
    END IF;
  ELSE
    UPDATE public.clients
       SET full_name = coalesce(nullif(v_details->>'full_name', ''), full_name),
           phone = coalesce(nullif(v_details->>'phone', ''), phone),
           last_intake_at = now()
     WHERE id = v_client_id;
  END IF;

  NEW.client_id := v_client_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_client_identity_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submitted_company text := nullif(btrim(NEW.client_details->>'company'), '');
  v_existing_company text;
BEGIN
  IF v_submitted_company IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nullif(btrim(company), '') INTO v_existing_company
    FROM public.clients
   WHERE id = NEW.client_id;

  IF v_existing_company IS NOT NULL
     AND lower(v_existing_company) <> lower(v_submitted_company) THEN
    INSERT INTO public.audit_events (intake_id, event_type, actor_type, event_payload)
    VALUES (
      NEW.id,
      'client_identity_conflict',
      'system',
      jsonb_build_object(
        'client_id', NEW.client_id,
        'submitted_company', v_submitted_company,
        'existing_company', v_existing_company,
        'action', 'operator_review_required'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intakes_resolve_client_identity ON public.intakes;
CREATE TRIGGER intakes_resolve_client_identity
  BEFORE INSERT ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_intake_client_identity();

DROP TRIGGER IF EXISTS intakes_audit_client_identity_conflict ON public.intakes;
CREATE TRIGGER intakes_audit_client_identity_conflict
  AFTER INSERT ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_client_identity_conflict();

CREATE TABLE IF NOT EXISTS public.client_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_users_client_id
  ON public.client_users(client_id);

CREATE TABLE IF NOT EXISTS public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_client_invitations_client
  ON public.client_invitations(client_id, invited_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_invitations_pending
  ON public.client_invitations(client_id, lower(email))
  WHERE status = 'pending';

-- ========================= END 013_client_identity.sql ===========================
-- ============================================================
-- MIGRATION: 014_client_rls.sql
-- ============================================================

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

-- ========================= END 014_client_rls.sql ===========================
-- ============================================================
-- MIGRATION: 015_phase2_atomic_submit.sql
-- ============================================================

-- Phase 2: atomic submission persistence and authoritative idempotency.
--
-- The advisory lock serializes requests for the same key. The idempotency row,
-- intake, child records, Build Card, and audit records are then written in one
-- database transaction.

CREATE OR REPLACE FUNCTION public.submit_intake(
  p_idempotency_key text,
  p_payload_hash text,
  p_build_ref text,
  p_status text,
  p_client_full_name text,
  p_client_company text,
  p_client_email text,
  p_client_phone text,
  p_project_name text,
  p_industry text,
  p_project_type text,
  p_business_description text,
  p_tier text,
  p_asset_qualification text,
  p_asset_statuses text,
  p_asset_services text,
  p_template text,
  p_enterprise text,
  p_pages text,
  p_features text,
  p_design_styles text,
  p_inspiration_link text,
  p_payment_plan text,
  p_maintenance_after_free text,
  p_maintenance_end_acknowledged boolean,
  p_voucher_code text,
  p_confirmations text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intake_id uuid;
  v_existing_intake_id uuid;
  v_existing_hash text;
  v_existing_response jsonb;
  v_previous_status text;
  v_template jsonb;
  v_enterprise jsonb;
  v_response jsonb;
  v_page jsonb;
  v_feature jsonb;
  v_asset_key text;
  v_asset_status text;
  v_service text;
BEGIN
  IF p_status NOT IN ('draft', 'submitted', 'discarded') THEN
    RAISE EXCEPTION 'unsupported intake status' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  SELECT intake_id, payload_hash, response_body
    INTO v_existing_intake_id, v_existing_hash, v_existing_response
    FROM public.idempotency_keys
   WHERE idempotency_key = p_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_hash <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency key already used with a different payload'
        USING ERRCODE = '23505';
    END IF;

    RETURN jsonb_build_object(
      'intake_id', v_existing_intake_id,
      'status', p_status,
      'idempotent', true,
      'response_body', v_existing_response
    );
  END IF;

  SELECT id, status
    INTO v_intake_id, v_previous_status
    FROM public.intakes
   WHERE p_build_ref IS NOT NULL
     AND build_reference_number = p_build_ref
   LIMIT 1;

  IF v_intake_id IS NULL THEN
    INSERT INTO public.intakes (
      build_path,
      build_reference_number,
      status,
      tier,
      client_details,
      project_details,
      scope,
      submission_payload
    ) VALUES (
      CASE WHEN p_tier = 'enterprise' THEN 'enterprise' ELSE 'custom' END,
      CASE WHEN p_status = 'submitted' THEN p_build_ref ELSE NULL END,
      p_status,
      p_tier,
      jsonb_build_object(
        'full_name', p_client_full_name,
        'company', p_client_company,
        'email', p_client_email,
        'phone', p_client_phone
      ),
      jsonb_build_object(
        'project_name', p_project_name,
        'industry', p_industry,
        'project_type', p_project_type,
        'business_description', p_business_description
      ),
      jsonb_build_object(
        'pages', p_pages::jsonb,
        'features', p_features::jsonb,
        'design_styles', p_design_styles::jsonb,
        'inspiration_link', p_inspiration_link
      ),
      jsonb_build_object(
        'client', jsonb_build_object(
          'fullName', p_client_full_name,
          'company', p_client_company,
          'email', p_client_email,
          'phone', p_client_phone
        ),
        'project', jsonb_build_object(
          'projectName', p_project_name,
          'industry', p_industry,
          'projectType', p_project_type,
          'businessDescription', p_business_description
        ),
        'tier', p_tier,
        'assets', jsonb_build_object(
          'qualification', p_asset_qualification,
          'statuses', p_asset_statuses::jsonb,
          'requestedServices', p_asset_services::jsonb
        ),
        'template', NULLIF(p_template, '')::jsonb,
        'enterprise', NULLIF(p_enterprise, '')::jsonb,
        'content', jsonb_build_object(
          'pages', p_pages::jsonb,
          'features', p_features::jsonb
        ),
        'design', jsonb_build_object(
          'styles', p_design_styles::jsonb,
          'inspirationLink', p_inspiration_link
        ),
        'payment', jsonb_build_object(
          'plan', p_payment_plan,
          'maintenanceAfterFree', p_maintenance_after_free,
          'maintenanceEndAcknowledged', p_maintenance_end_acknowledged,
          'voucherCode', p_voucher_code
        ),
        'confirmations', p_confirmations::jsonb
      )
    ) RETURNING id INTO v_intake_id;
  ELSE
    UPDATE public.intakes
       SET status = p_status,
           build_reference_number = CASE WHEN p_status = 'submitted' THEN p_build_ref ELSE build_reference_number END,
           updated_at = now()
     WHERE id = v_intake_id;
  END IF;

  INSERT INTO public.intake_asset_qualifications (intake_id, qualification)
  VALUES (v_intake_id, p_asset_qualification)
  ON CONFLICT (intake_id) DO UPDATE SET qualification = EXCLUDED.qualification;

  FOR v_asset_key, v_asset_status IN
    SELECT key, value FROM jsonb_each_text(p_asset_statuses::jsonb)
  LOOP
    INSERT INTO public.intake_asset_statuses (intake_id, asset_key, status)
    VALUES (v_intake_id, v_asset_key, v_asset_status)
    ON CONFLICT (intake_id, asset_key) DO UPDATE SET status = EXCLUDED.status;
  END LOOP;

  FOR v_service IN SELECT value FROM jsonb_array_elements_text(p_asset_services::jsonb)
  LOOP
    INSERT INTO public.intake_asset_services (intake_id, service)
    VALUES (v_intake_id, v_service)
    ON CONFLICT (intake_id, service) DO NOTHING;
  END LOOP;

  IF NULLIF(p_template, '') IS NOT NULL THEN
    v_template := p_template::jsonb;
    INSERT INTO public.intake_template_selections (
      intake_id, template_id, project_version, color_preset
    ) VALUES (
      v_intake_id,
      v_template->>'templateId',
      v_template->>'projectVersion',
      coalesce(v_template->>'colorPreset', '')
    )
    ON CONFLICT (intake_id) DO UPDATE SET
      template_id = EXCLUDED.template_id,
      project_version = EXCLUDED.project_version,
      color_preset = EXCLUDED.color_preset;
  END IF;

  IF NULLIF(p_enterprise, '') IS NOT NULL THEN
    v_enterprise := p_enterprise::jsonb;
    INSERT INTO public.intake_enterprise_requirements (intake_id, requirements)
    VALUES (v_intake_id, v_enterprise)
    ON CONFLICT (intake_id) DO UPDATE SET requirements = EXCLUDED.requirements;
  END IF;

  FOR v_page IN SELECT value FROM jsonb_array_elements(p_pages::jsonb)
  LOOP
    INSERT INTO public.intake_page_contents (intake_id, page_name, fields)
    VALUES (v_intake_id, v_page->>'name', coalesce(v_page->'fields', '{}'::jsonb));
  END LOOP;

  FOR v_feature IN SELECT value FROM jsonb_array_elements(p_features::jsonb)
  LOOP
    INSERT INTO public.intake_features (
      intake_id, name, priority, source, preliminary_cost, note
    ) VALUES (
      v_intake_id,
      v_feature->>'name',
      coalesce(v_feature->>'priority', 'Need Help Deciding'),
      coalesce(v_feature->>'source', 'chip'),
      NULLIF(v_feature->>'preliminaryCost', '')::numeric,
      v_feature->>'note'
    );
  END LOOP;

  INSERT INTO public.intake_design_preferences (intake_id, styles, inspiration_link)
  VALUES (v_intake_id, p_design_styles::jsonb, coalesce(p_inspiration_link, ''))
  ON CONFLICT (intake_id) DO UPDATE SET
    styles = EXCLUDED.styles,
    inspiration_link = EXCLUDED.inspiration_link;

  INSERT INTO public.intake_payment_preferences (
    intake_id, plan, maintenance_after_free,
    maintenance_end_acknowledged, voucher_code
  ) VALUES (
    v_intake_id, p_payment_plan, coalesce(p_maintenance_after_free, ''),
    coalesce(p_maintenance_end_acknowledged, false), coalesce(p_voucher_code, '')
  )
  ON CONFLICT (intake_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    maintenance_after_free = EXCLUDED.maintenance_after_free,
    maintenance_end_acknowledged = EXCLUDED.maintenance_end_acknowledged,
    voucher_code = EXCLUDED.voucher_code;

  IF p_status = 'submitted' THEN
    INSERT INTO public.build_cards (intake_id, status, preliminary_card)
    VALUES (
      v_intake_id,
      'queued',
      jsonb_build_object('status', 'queued', 'owner_review_status', 'waiting_owner_review')
    )
    ON CONFLICT (intake_id) DO NOTHING;
  END IF;

  INSERT INTO public.intake_lifecycle_events (
    intake_id, event_type, actor_type, previous_status, new_status,
    idempotency_key, metadata
  ) VALUES (
    v_intake_id,
    CASE p_status
      WHEN 'draft' THEN 'saved_as_draft'
      WHEN 'submitted' THEN 'submitted_for_review'
      ELSE 'discarded'
    END,
    'system', v_previous_status, p_status, p_idempotency_key,
    jsonb_build_object('tier', p_tier, 'project_type', p_project_type)
  );

  INSERT INTO public.audit_events (intake_id, actor_type, event_type, event_payload)
  VALUES (
    v_intake_id,
    'system',
    CASE p_status
      WHEN 'draft' THEN 'intake_draft_saved'
      WHEN 'submitted' THEN 'intake_submitted'
      ELSE 'intake_discarded'
    END,
    jsonb_build_object('tier', p_tier, 'status', p_status)
  );

  v_response := jsonb_build_object(
    'success', true,
    'buildReferenceNumber', CASE WHEN p_status = 'submitted' THEN p_build_ref ELSE NULL END,
    'intakeId', v_intake_id,
    'status', p_status,
    'ownerReviewStatus', CASE WHEN p_status = 'submitted' THEN 'waiting_owner_review' ELSE NULL END,
    'preliminaryBuildCard', CASE WHEN p_status = 'submitted' THEN
      jsonb_build_object('status', 'queued', 'message', 'Your intake has been submitted and is waiting for owner review.')
      ELSE NULL END
  );

  INSERT INTO public.idempotency_keys (
    idempotency_key, intake_id, payload_hash, response_body
  ) VALUES (p_idempotency_key, v_intake_id, p_payload_hash, v_response);

  RETURN jsonb_build_object(
    'intake_id', v_intake_id,
    'status', p_status,
    'idempotent', false,
    'response_body', v_response
  );
END;
$$;

-- ========================= END 015_phase2_atomic_submit.sql ===========================
