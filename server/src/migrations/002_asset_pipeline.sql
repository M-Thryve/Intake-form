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
