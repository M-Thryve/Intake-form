import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import {
  validatePhase2Payload,
  validateDraftPayload,
  type ValidatedPayload,
  type DraftPayload,
} from "../lib/validation.js";
import { generateBuildReferenceNumber } from "../lib/reference.js";
import { hashPayload } from "../lib/hash.js";

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

  // Phase 1 sends the payload in an `intake` envelope. Accepting the payload
  // directly as well keeps POST /api/intakes faithful to the public Phase 2
  // contract and remains backwards-compatible with that client.
  const intake = req.body?.intake ?? req.body;
  if (!intake || typeof intake !== "object") {
    res.status(400).json({ success: false, error: "Missing intake payload" });
    return;
  }

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

  // Route on command BEFORE parsing: drafts use lenient schema,
  // submit uses strict schema. Discards use draft schema (minimal shape check).
  if (command === "submit") {
    const validation = validatePhase2Payload(intake);
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
    await handleSubmitOrDiscard(req, res, data, pHash, idempotencyKey, command);
    return;
  }

  // save_draft or discard — lenient validation
  const draftValidation = validateDraftPayload(intake);
  if (!draftValidation.success) {
    res.status(422).json({
      success: false,
      error: "Payload shape validation failed",
      details: draftValidation.errors,
    });
    return;
  }

  const draftData = draftValidation.data!;
  const pHash = hashPayload(intake);

  // Coerce draft data into the persistIntake shape with safe defaults
  const coercedData = coerceDraftForPersistence(draftData);

  await handleSubmitOrDiscard(
    req, res, coercedData, pHash, idempotencyKey, command,
    command === "save_draft" ? draftValidation.missingRequirements : undefined,
  );
});

function coerceDraftForPersistence(draft: DraftPayload): ValidatedPayload {
  return {
    client: {
      fullName: draft.client?.fullName || "",
      company: draft.client?.company || "",
      email: draft.client?.email || "",
      phone: draft.client?.phone || "",
    },
    project: {
      projectName: draft.project?.projectName || "",
      industry: draft.project?.industry || "",
      projectType: draft.project?.projectType || "",
      businessDescription: draft.project?.businessDescription || "",
    },
    assets: {
      qualification: draft.assets?.qualification || "incomplete",
      statuses: draft.assets?.statuses || {},
      requestedServices: draft.assets?.requestedServices || [],
    },
    tier: (draft.tier as "custom" | "enterprise") || "custom",
    template: draft.template ? {
      templateId: draft.template.templateId || "",
      projectVersion: draft.template.projectVersion || "desktop",
      colorPreset: draft.template.colorPreset || "",
    } : undefined,
    enterprise: draft.enterprise ? {
      projectVision: draft.enterprise.projectVision || "",
      targetUsers: draft.enterprise.targetUsers || "",
      userRoles: draft.enterprise.userRoles || "",
      businessWorkflows: draft.enterprise.businessWorkflows || "",
      integrations: draft.enterprise.integrations || "",
      existingSystems: draft.enterprise.existingSystems || "",
      dataSecurityRequirements: draft.enterprise.dataSecurityRequirements || "",
      scalabilityRequirements: draft.enterprise.scalabilityRequirements || "",
      designInspiration: draft.enterprise.designInspiration || "",
      competitors: draft.enterprise.competitors || "",
      successCriteria: draft.enterprise.successCriteria || "",
    } : undefined,
    content: {
      features: draft.content?.features?.map(f => ({
        name: f.name || "",
        priority: f.priority || "Need Help Deciding",
        source: f.source || "chip",
      })) || [],
      pages: draft.content?.pages?.map(p => ({
        name: p.name || "",
        fields: p.fields || {},
      })) || [],
    },
    design: {
      styles: draft.design?.styles || [],
      inspirationLink: draft.design?.inspirationLink || "",
    },
    payment: {
      plan: draft.payment?.plan || "",
      maintenanceAfterFree: draft.payment?.maintenanceAfterFree || "",
      maintenanceEndAcknowledged: draft.payment?.maintenanceEndAcknowledged || false,
      voucherCode: draft.payment?.voucherCode || "",
    },
    confirmations: {
      accurate: true,
      receipt: true,
      payment: true,
      maintenance: true,
      buildCard: true,
      submission: true,
    },
  } as ValidatedPayload;
}

async function handleSubmitOrDiscard(
  req: Request,
  res: Response,
  data: ValidatedPayload,
  pHash: string,
  idempotencyKey: string,
  command: string,
  missingRequirements?: Array<{ field: string; message: string }>,
) {
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
    const buildRef = command === "submit" ? await generateBuildReferenceNumber() : null;
    const result = await persistIntake(data, buildRef, idempotencyKey, pHash, command, missingRequirements);

    res.status(command === "submit" ? 201 : 200).json(result);

  } catch (err) {
    console.error("Intake operation failed:", err);
    if (err instanceof Error && err.message === "IDEMPOTENCY_CONFLICT") {
      res.status(409).json({
        success: false,
        error: "Idempotency key already used with a different payload",
      });
      return;
    }
    res.status(500).json({ success: false, error: "An internal error occurred. Please try again." });
  }
}

async function persistIntake(
  data: ValidatedPayload,
  buildRef: string | null,
  idempotencyKey: string,
  payloadHash: string,
  command: string,
  missingRequirements?: Array<{ field: string; message: string }>,
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
        .select("payload_hash, response_body")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existing?.payload_hash !== payloadHash) {
        throw new Error("IDEMPOTENCY_CONFLICT");
      }
      if (existing?.response_body) return existing.response_body;
    }
    throw rpcError;
  }

  const intakeId = rpcResult?.intake_id;

  if (rpcResult?.response_body) {
    return rpcResult.response_body;
  }

  let clientId: string | null = null;
  if (intakeId) {
    const { data: existing } = await supabase
      .from("intake_clients")
      .select("id")
      .eq("intake_id", intakeId)
      .maybeSingle();

    if (existing) {
      clientId = existing.id;
      await supabase
        .from("intake_clients")
        .update({
          full_name: data.client.fullName,
          company: data.client.company,
          email: data.client.email,
          phone: data.client.phone,
        })
        .eq("id", clientId);
    } else {
      const { data: inserted } = await supabase
        .from("intake_clients")
        .insert({
          intake_id: intakeId,
          full_name: data.client.fullName,
          company: data.client.company,
          email: data.client.email,
          phone: data.client.phone,
        })
        .select("id")
        .single();
      if (inserted) clientId = inserted.id;
    }
  }

  const isSubmitted = command === "submit";
  const isDraft = command === "save_draft";
  const responseBody = {
    success: true,
    buildReferenceNumber: buildRef,
    intakeId,
    clientId,
    status: isSubmitted ? "submitted" : status,
    command,
    ...(isSubmitted ? {
      ownerReviewStatus: "waiting_owner_review",
      preliminaryBuildCard: {
        status: "queued",
        message: "Your intake has been submitted. A preliminary Build Card will be generated and queued for owner review.",
      },
    } : {}),
    ...(isDraft && missingRequirements ? { missingRequirements } : {}),
  };

  // Store idempotency result
  await supabase.from("idempotency_keys").insert({
    idempotency_key: idempotencyKey,
    intake_id: intakeId,
    payload_hash: payloadHash,
    response_body: responseBody,
  });

  const gapCount = missingRequirements?.length ?? 0;
  const eventType = isDraft
    ? (gapCount > 0 ? "draft_saved_with_gaps" : "lifecycle_draft_saved")
    : command === "discard"
      ? "lifecycle_discarded"
      : "lifecycle_submitted";

  await supabase.from("audit_events").insert({
    intake_id: intakeId,
    actor_type: "system",
    event_type: eventType,
    event_payload: {
      command,
      build_reference_number: buildRef,
      tier: data.tier,
      idempotency_key: idempotencyKey,
      previous_status: "in_progress",
      new_status: status,
      ...(isDraft && gapCount > 0 ? { gap_count: gapCount } : {}),
    },
  });

  return responseBody;
}
