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