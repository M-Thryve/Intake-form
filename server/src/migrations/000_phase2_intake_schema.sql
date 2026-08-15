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
  -- Commercial workflow starts only after owner approval; NULL is the
  -- pre-commercial state accepted by the later Phase 6/7 constraints.
  commercial_stage text DEFAULT NULL,
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
