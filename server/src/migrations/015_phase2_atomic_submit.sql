-- Phase 2: atomic submission persistence and authoritative idempotency.
--
-- The advisory lock serializes requests for the same key. The idempotency row,
-- intake, child records, Build Card, and audit records are then written in one
-- database transaction.

-- Make lifecycle outbox writes safe before the later v3 migration is applied
-- (the statement is repeated idempotently in migration 016).
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_intake_lifecycle_event
  ON public.notification_outbox (intake_id, event_type)
  WHERE event_type IN ('draft_saved', 'intake_submitted');

-- Migrations 005/006 replace the commercial-stage check with post-approval
-- states. Clear the Phase 2 table default so draft/submit inserts do not
-- receive the obsolete `not_started` value before the commercial workflow.
ALTER TABLE public.intakes
  ALTER COLUMN commercial_stage DROP DEFAULT,
  ALTER COLUMN commercial_stage DROP NOT NULL;

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
  v_previous_reference text;
  v_template jsonb;
  v_enterprise jsonb;
  v_response jsonb;
  v_client_id uuid;
  v_reference_number text;
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

  SELECT id, status, build_reference_number
    INTO v_intake_id, v_previous_status, v_previous_reference
    FROM public.intakes
   WHERE p_build_ref IS NOT NULL
     AND build_reference_number = p_build_ref
   LIMIT 1;

  IF v_intake_id IS NULL THEN
    INSERT INTO public.intakes (
      build_path,
      build_reference_number,
      status,
      reference_issued_at,
      tier,
      client_details,
      project_details,
      scope,
      submission_payload,
      commercial_stage
    ) VALUES (
      CASE WHEN p_tier = 'enterprise' THEN 'enterprise' ELSE 'custom' END,
      CASE WHEN p_status <> 'discarded' THEN p_build_ref ELSE NULL END,
      p_status,
      CASE WHEN p_status <> 'discarded' AND p_build_ref IS NOT NULL THEN now() ELSE NULL END,
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
      ),
      NULL
    ) RETURNING id INTO v_intake_id;
  ELSE
    UPDATE public.intakes
       SET status = p_status,
           build_reference_number = CASE
             WHEN p_status <> 'discarded' AND p_build_ref IS NOT NULL THEN p_build_ref
             ELSE build_reference_number
           END,
           reference_issued_at = CASE
             WHEN reference_issued_at IS NULL AND p_build_ref IS NOT NULL THEN now()
             ELSE reference_issued_at
           END,
           updated_at = now()
     WHERE id = v_intake_id;
  END IF;

  SELECT client_id, build_reference_number
    INTO v_client_id, v_reference_number
    FROM public.intakes
   WHERE id = v_intake_id;

  IF v_reference_number IS NOT NULL AND p_build_ref IS NOT NULL
     AND v_previous_reference IS NULL THEN
    INSERT INTO public.intake_lifecycle_events (
      intake_id, event_type, actor_type, new_status, idempotency_key, metadata
    ) VALUES (
      v_intake_id, 'build_reference_assigned', 'system', p_status,
      p_idempotency_key, jsonb_build_object('reference_number', v_reference_number)
    );
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
    'buildReferenceNumber', v_reference_number,
    'referenceNumber', v_reference_number,
    'intakeId', v_intake_id,
    'clientId', v_client_id,
    'status', p_status,
    'command', CASE p_status
      WHEN 'draft' THEN 'save_draft'
      WHEN 'submitted' THEN 'submit'
      ELSE 'discard'
    END,
    'ownerReviewStatus', CASE WHEN p_status = 'submitted' THEN 'waiting_owner_review' ELSE NULL END,
    'preliminaryBuildCard', CASE WHEN p_status = 'submitted' THEN
      jsonb_build_object('status', 'queued', 'message', 'Your intake has been submitted and is waiting for owner review.')
      ELSE NULL END
  );

  IF p_status = 'draft' THEN
    INSERT INTO public.notification_outbox (
      intake_id, event_type, channel, recipient_ref, payload
    ) VALUES (
      v_intake_id, 'draft_saved', 'email', v_client_id::text,
      jsonb_build_object(
        'intakeId', v_intake_id,
        'clientId', v_client_id,
        'referenceNumber', v_reference_number,
        'status', 'draft',
        'missingRequirements', '[]'::jsonb
      )
    )
    ON CONFLICT (intake_id, event_type)
      WHERE event_type IN ('draft_saved', 'intake_submitted')
    DO UPDATE SET
      payload = EXCLUDED.payload,
      recipient_ref = EXCLUDED.recipient_ref,
      updated_at = now();
  ELSIF p_status = 'submitted' THEN
    INSERT INTO public.notification_outbox (
      intake_id, event_type, channel, recipient_ref, payload
    ) VALUES (
      v_intake_id, 'intake_submitted', 'email', v_client_id::text,
      jsonb_build_object(
        'intakeId', v_intake_id,
        'clientId', v_client_id,
        'referenceNumber', v_reference_number,
        'status', 'submitted',
        'ownerReviewStatus', 'waiting_owner_review'
      )
    )
    ON CONFLICT (intake_id, event_type)
      WHERE event_type IN ('draft_saved', 'intake_submitted')
    DO UPDATE SET
      payload = EXCLUDED.payload,
      recipient_ref = EXCLUDED.recipient_ref,
      updated_at = now();
  END IF;

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
