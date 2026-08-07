import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { validateIntakePayload, type ValidatedPayload } from "../lib/validation.js";
import { generateBuildReferenceNumber } from "../lib/reference.js";
import { hashPayload } from "../lib/hash.js";
import { orchestrateAnalysis } from "../lib/mcp-orchestration.js";

const COMMAND_SCHEMA = z.enum(["save_draft", "submit", "discard"]);

export const intakeRouter = Router();

intakeRouter.post("/", async (req: Request, res: Response) => {
  const idempotencyKey =
    req.body?.idempotencyKey ||
    req.headers["idempotency-key"] ||
    "";

  if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.length < 5) {
    res.status(400).json({ success: false, error: "A valid idempotency key is required" });
    return;
  }

  const intake = req.body?.intake;
  if (!intake || typeof intake !== "object") {
    res.status(400).json({ success: false, error: "Missing intake payload" });
    return;
  }

  // Phase 4: Explicit lifecycle command with Zod validation.
  const rawCommand =
    (req.body?.command as string) ||
    (req.headers["x-intake-command"] as string) ||
    "submit";

  const commandResult = COMMAND_SCHEMA.safeParse(rawCommand);
  if (!commandResult.success) {
    res.status(400).json({
      success: false,
      error: `Invalid command: "${rawCommand}". Must be one of: save_draft, submit, discard`,
    });
    return;
  }
  const command = commandResult.data;

  const validation = validateIntakePayload(intake);
  if (!validation.success) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      details: validation.errors,
    });
    return;
  }

  const data = validation.data!;
  const pHash = hashPayload(intake);

  // Check idempotency
  const { data: existingKey, error: lookupError } = await supabase
    .from("idempotency_keys")
    .select("payload_hash, response_body")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (lookupError) {
    console.error("Idempotency lookup error:", lookupError);
    res.status(500).json({ success: false, error: "An internal error occurred. Please try again." });
    return;
  }

  if (existingKey) {
    if (existingKey.payload_hash !== pHash) {
      res.status(409).json({
        success: false,
        error: "Idempotency key already used with a different payload",
      });
      return;
    }
    res.status(200).json(existingKey.response_body);
    return;
  }

  try {
    // Phase 4: Reference numbers are generated ONLY on submission.
    // Drafts and discards do not get a reference number.
    const buildRef = command === "submit" ? await generateBuildReferenceNumber() : null;
    const result = await persistIntake(data, buildRef, idempotencyKey, pHash, command);
    const intakeId = result.intakeId;

    res.status(command === "submit" ? 201 : 200).json(result);

    // Only orchestrate analysis on submission.
    if (intakeId && command === "submit") {
      orchestrateAnalysis(intakeId).catch((err) => {
        console.error(`Background analysis failed for intake ${intakeId}:`, err);
      });
    }
  } catch (err) {
    console.error("Intake operation failed:", err);
    res.status(500).json({ success: false, error: "An internal error occurred. Please try again." });
  }
});

async function persistIntake(
  data: ValidatedPayload,
  buildRef: string | null,
  idempotencyKey: string,
  payloadHash: string,
  command: string,
) {
  const lifecycleStatuses: Record<string, string> = {
    save_draft: "draft",
    submit: "submitted",
    discard: "discarded",
  };
  const status = lifecycleStatuses[command] || "submitted";

  const { data: rpcResult, error: rpcError } = await supabase.rpc("submit_intake", {
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_build_ref: buildRef,
    p_status: status,
    p_client_full_name: data.client.fullName,
    p_client_company: data.client.company,
    p_client_email: data.client.email,
    p_client_phone: data.client.phone,
    p_project_name: data.project.projectName,
    p_industry: data.project.industry,
    p_project_type: data.project.projectType,
    p_business_description: data.project.businessDescription,
    p_tier: data.tier,
    p_asset_qualification: data.assets.qualification,
    p_asset_statuses: JSON.stringify(data.assets.statuses),
    p_asset_services: JSON.stringify(data.assets.requestedServices),
    p_template: data.template ? JSON.stringify(data.template) : null,
    p_enterprise: data.enterprise ? JSON.stringify(data.enterprise) : null,
    p_pages: JSON.stringify(data.content.pages),
    p_features: JSON.stringify(data.content.features),
    p_design_styles: JSON.stringify(data.design.styles),
    p_inspiration_link: data.design.inspirationLink,
    p_payment_plan: data.payment.plan,
    p_maintenance_after_free: data.payment.maintenanceAfterFree,
    p_maintenance_end_acknowledged: data.payment.maintenanceEndAcknowledged,
    p_voucher_code: data.payment.voucherCode,
    p_confirmations: JSON.stringify(data.confirmations),
  });

  if (rpcError) {
    if (rpcError.code === "23505" && rpcError.message?.includes("idempotency")) {
      const { data: existing } = await supabase
        .from("idempotency_keys")
        .select("response_body")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existing) return existing.response_body;
    }
    throw rpcError;
  }

  const intakeId = rpcResult?.intake_id;

  const isSubmitted = command === "submit";
  const responseBody = {
    success: true,
    buildReferenceNumber: buildRef,
    intakeId,
    status: isSubmitted ? "submitted" : status,
    command,
    ...(isSubmitted ? {
      ownerReviewStatus: "waiting_owner_review",
      preliminaryBuildCard: {
        status: "queued",
        message: "Your intake has been submitted. A preliminary Build Card will be generated and queued for owner review.",
      },
    } : {}),
  };

  // Store idempotency result
  await supabase.from("idempotency_keys").insert({
    idempotency_key: idempotencyKey,
    intake_id: intakeId,
    payload_hash: payloadHash,
    response_body: responseBody,
  });

  // Phase 4: Audit event with lifecycle transition tracking
  await supabase.from("audit_events").insert({
    intake_id: intakeId,
    actor_type: "system",
    event_type: command === "save_draft"
      ? "lifecycle_draft_saved"
      : command === "discard"
        ? "lifecycle_discarded"
        : "lifecycle_submitted",
    event_payload: {
      command,
      build_reference_number: buildRef,
      tier: data.tier,
      idempotency_key: idempotencyKey,
      previous_status: "in_progress",
      new_status: status,
    },
  });

  return responseBody;
}
