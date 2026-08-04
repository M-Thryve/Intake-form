import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface IntakeResult {
  success: boolean;
  buildReferenceNumber: string;
  intakeId: string;
  status: string;
  ownerReviewStatus: string;
  preliminaryBuildCard: {
    status: string;
    message: string;
  };
}

export async function persistIntake(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  buildRef: string,
  idempotencyKey: string,
  payloadHash: string
): Promise<IntakeResult> {
  const client = payload.client as Record<string, unknown>;
  const project = payload.project as Record<string, unknown>;
  const assets = payload.assets as Record<string, unknown>;
  const tier = payload.tier as string;
  const template = payload.template as Record<string, unknown> | undefined;
  const enterprise = payload.enterprise as Record<string, unknown> | undefined;
  const content = payload.content as Record<string, unknown>;
  const design = payload.design as Record<string, unknown>;
  const payment = payload.payment as Record<string, unknown>;
  const confirmations = payload.confirmations as Record<string, unknown>;

  // Use a Postgres function for transactional insert
  const { data, error } = await supabase.rpc("submit_intake", {
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_build_ref: buildRef,
    p_client_full_name: client.fullName as string,
    p_client_company: (client.company as string) || "",
    p_client_email: client.email as string,
    p_client_phone: (client.phone as string) || "",
    p_project_name: project.projectName as string,
    p_industry: (project.industry as string) || "",
    p_project_type: (project.projectType as string) || "",
    p_business_description: (project.businessDescription as string) || "",
    p_tier: tier,
    p_asset_qualification: assets.qualification as string,
    p_asset_statuses: JSON.stringify(assets.statuses || {}),
    p_asset_services: JSON.stringify(assets.requestedServices || []),
    p_template: template ? JSON.stringify(template) : null,
    p_enterprise: enterprise ? JSON.stringify(enterprise) : null,
    p_pages: JSON.stringify((content.pages as unknown[]) || []),
    p_features: JSON.stringify((content.features as unknown[]) || []),
    p_design_styles: JSON.stringify((design.styles as unknown[]) || []),
    p_inspiration_link: (design.inspirationLink as string) || "",
    p_payment_plan: payment.plan as string,
    p_maintenance_after_free: (payment.maintenanceAfterFree as string) || "",
    p_maintenance_end_acknowledged: payment.maintenanceEndAcknowledged as boolean,
    p_voucher_code: (payment.voucherCode as string) || "",
    p_confirmations: JSON.stringify(confirmations),
  });

  if (error) {
    // Check for idempotency race condition (unique constraint)
    if (error.code === "23505" && error.message?.includes("idempotency")) {
      const { data: existing } = await supabase
        .from("idempotency_keys")
        .select("response_body")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existing) return existing.response_body as IntakeResult;
    }
    throw error;
  }

  const result: IntakeResult = {
    success: true,
    buildReferenceNumber: buildRef,
    intakeId: data.intake_id,
    status: "submitted",
    ownerReviewStatus: "waiting_owner_review",
    preliminaryBuildCard: {
      status: "queued",
      message: "Your intake has been submitted. A preliminary Build Card will be generated and queued for owner review.",
    },
  };

  // Store idempotency result
  await supabase.from("idempotency_keys").insert({
    idempotency_key: idempotencyKey,
    intake_id: data.intake_id,
    payload_hash: payloadHash,
    response_body: result,
  });

  // Record audit event
  await supabase.from("audit_events").insert({
    intake_id: data.intake_id,
    actor_type: "system",
    event_type: "intake_submitted",
    event_payload: {
      build_reference_number: buildRef,
      tier,
      idempotency_key: idempotencyKey,
    },
  });

  return result;
}
