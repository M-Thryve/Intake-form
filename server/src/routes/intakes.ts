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
import { redactForNotification } from "../lib/outbox.js";
import {
  CORE_FEATURE_CODE_LIST,
  CORE_FEATURE_NAMES,
  EXTENSION_CODES,
  EXTENSION_NAMES,
  V3_CUSTOM_PROJECT_TYPES,
} from "../lib/features.js";

const COMMAND_SCHEMA = z.enum(["save_draft", "submit", "discard"]);

export const intakeRouter = Router();

const INTAKE_ID_SCHEMA = z.string().uuid();

function normalizeMissingRequirement(value: unknown, index: number) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (typeof row.key === "string" && typeof row.label === "string") return row;
  const field = typeof row.field === "string" ? row.field : `requirement-${index + 1}`;
  const section = field.split(".")[0] || "other";
  return {
    key: field,
    label: typeof row.message === "string" ? row.message : "Follow-up required",
    category: ["client", "project", "scope", "design"].includes(section) ? section : "other",
    section,
    severity: "required",
    status: "missing",
    nextAction: "Complete this item before submission",
  };
}

function mapUploadedAsset(asset: Record<string, unknown>) {
  return {
    assetId: asset.id,
    filename: asset.original_filename,
    mimeType: asset.mime_type,
    sizeBytes: Number(asset.file_size_bytes ?? asset.size_bytes ?? 0),
    assetStatus: asset.asset_status ?? "pending",
    scanStatus: asset.scan_status ?? "pending",
    ...(asset.rejection_reason ? { rejectionReason: asset.rejection_reason } : {}),
    ...(asset.requirement_key ? { requirementKey: asset.requirement_key } : {}),
    ...(asset.uploaded_at || asset.created_at
      ? { uploadedAt: asset.uploaded_at ?? asset.created_at }
      : {}),
  };
}

// Authenticated/internal read path for safe draft resume. The route is keyed by
// an existing UUID only; there is intentionally no unauthenticated list or
// enumeration endpoint.
intakeRouter.get("/:intakeId", async (req: Request, res: Response) => {
  const parsedId = INTAKE_ID_SCHEMA.safeParse(req.params.intakeId);
  if (!parsedId.success) {
    res.status(400).json({ success: false, error: "Invalid intake ID" });
    return;
  }

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select("id, client_id, build_reference_number, status, tier, client_details, project_details, scope, submission_payload, created_at, updated_at")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (intakeError) {
    res.status(500).json({ success: false, error: "Failed to reopen intake" });
    return;
  }
  if (!intake) {
    res.status(404).json({ success: false, error: "Intake not found" });
    return;
  }

  const row = intake as Record<string, unknown>;
  const intakeId = row.id as string;
  const [assetResult, questionnaireResult, scopeResult, buildCardResult] = await Promise.all([
    supabase
      .from("uploaded_assets")
      .select("id, original_filename, mime_type, file_size_bytes, size_bytes, asset_status, scan_status, rejection_reason, requirement_key, uploaded_at, created_at")
      .eq("intake_id", intakeId)
      .order("uploaded_at", { ascending: true }),
    supabase
      .from("intake_website_questionnaire")
      .select("answers")
      .eq("intake_id", intakeId)
      .maybeSingle(),
    supabase
      .from("intake_scope_items")
      .select("item_kind, item_code, item_name")
      .eq("intake_id", intakeId),
    supabase
      .from("build_cards")
      .select("id")
      .eq("intake_id", intakeId)
      .maybeSingle(),
  ]);

  const snapshot = row.submission_payload && typeof row.submission_payload === "object"
    ? structuredClone(row.submission_payload as Record<string, unknown>)
    : {};
  const payload = snapshot as Record<string, any>;
  payload.client = payload.client ?? row.client_details ?? {};
  payload.project = payload.project ?? row.project_details ?? {};
  payload.tier = payload.tier ?? row.tier ?? "";
  payload.buildPath = payload.buildPath ?? (payload.tier === "enterprise" ? "enterprise" : "custom");
  payload.assets = payload.assets ?? { qualification: "", statuses: {}, requestedServices: [] };
  const uploadedAssets = (assetResult.data ?? []).map(asset => mapUploadedAsset(asset as Record<string, unknown>));
  payload.assets.uploads = uploadedAssets;
  payload.scope = payload.scope ?? row.scope ?? {};
  payload.design = payload.design ?? { styles: [], inspirationLink: "" };

  const scopeRows = (scopeResult.data ?? []) as Array<Record<string, unknown>>;
  if (scopeRows.length > 0) {
    payload.scope.coreFeatures = scopeRows.filter(item => item.item_kind === "core_feature").map(item => item.item_code);
    payload.scope.extensions = scopeRows.filter(item => item.item_kind === "extension").map(item => item.item_code);
    payload.scope.customFeatures = scopeRows.filter(item => item.item_kind === "custom_request").map(item => item.item_name);
  }
  const questionnaire = questionnaireResult.data as Record<string, unknown> | null;
  if (questionnaire?.answers && payload.project?.projectType === "ai-assisted-website") {
    payload.websiteQuestionnaire = questionnaire.answers;
  } else if (payload.project?.projectType !== "ai-assisted-website") {
    delete payload.websiteQuestionnaire;
  }
  if (payload.project?.projectType !== "templated-website") delete payload.template;
  if (payload.buildPath !== "enterprise") delete payload.enterprise;

  const status = typeof row.status === "string" ? row.status : "draft";
  const outcome = status === "discarded" ? "discarded" : status === "draft" || status === "in_progress" ? "draft" : "submitted";
  const missingRequirements = (Array.isArray(payload.missingRequirements) ? payload.missingRequirements : [])
    .map(normalizeMissingRequirement);
  const operatorNotes = Array.isArray(payload.operatorNotes) ? payload.operatorNotes : [];

  res.json({
    success: true,
    intake: {
      intakeId,
      clientId: row.client_id ?? "",
      referenceNumber: row.build_reference_number ?? "",
      status,
      lifecycleStatus: status,
      outcome,
      payload,
      missingRequirements,
      uploadedAssets,
      operatorNotes,
      hasBuildCard: outcome === "submitted" && Boolean(buildCardResult.data),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

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

  // Present on re-saves: lets the server update the existing row instead of creating a new one.
  const existingIntakeId: string | undefined =
    typeof req.body?.intakeId === "string" && req.body.intakeId.length > 0
      ? req.body.intakeId
      : undefined;

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
    await handleSubmitOrDiscard(req, res, data, pHash, idempotencyKey, command, undefined, existingIntakeId);
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
    existingIntakeId,
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
      uploads: draft.assets?.uploads || [],
      deckExists: draft.assets?.deckExists,
      deckSectionNotes: draft.assets?.deckSectionNotes || {},
      resourceNotes: draft.assets?.resourceNotes || {},
      resourceAddOnCosts: draft.assets?.resourceAddOnCosts || {},
    },
    tier: (draft.tier as "custom" | "enterprise") || "custom",
    template: draft.template ? {
      templateId: draft.template.templateId || "",
      // v3.1 removed platform versions. Preserve a value sent by a legacy
      // client; never fabricate one for new selections.
      ...(draft.template.projectVersion ? { projectVersion: draft.template.projectVersion } : {}),
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
    scope: {
      coreFeatures: draft.scope?.coreFeatures || [],
      extensions: draft.scope?.extensions || [],
      customFeatures: draft.scope?.customFeatures || [],
      pages: draft.scope?.pages?.map(p => ({ name: p.name || "", fields: p.fields || {} })) || [],
      features: draft.scope?.features?.map(f => ({
        name: f.name || "",
        priority: f.priority || "Need Help Deciding",
        source: f.source || "chip",
      })) || [],
    },
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
    discardReason: draft.discardReason ?? undefined,
    outcome: draft.outcome,
    missingRequirements: draft.missingRequirements || [],
    operatorNotes: draft.operatorNotes || [],
    sourceMetadata: draft.sourceMetadata || {},
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
  existingIntakeId?: string,
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
    // Generate a reference number on first persistence only (draft AND submit).
    // Re-saves that supply existingIntakeId already have a reference — skip generation.
    const buildRef = command === "discard"
      ? null
      : (existingIntakeId ? null : await generateBuildReferenceNumber());
    const result = await persistIntake(data, buildRef, idempotencyKey, pHash, command, missingRequirements, existingIntakeId);

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
    if (err instanceof Error && err.message === "INTAKE_NOT_FOUND") {
      res.status(404).json({ success: false, error: "The referenced intake was not found" });
      return;
    }
    if (err instanceof Error && err.message === "ASSET_SCOPE_MISMATCH") {
      res.status(403).json({ success: false, error: "One or more uploaded assets do not belong to this intake" });
      return;
    }
    res.status(500).json({ success: false, error: "An internal error occurred. Please try again." });
  }
}

function buildSubmissionSnapshot(
  data: ValidatedPayload,
  missingRequirements?: Array<{ field: string; message: string }>,
) {
  const normalizedMissingRequirements = (missingRequirements ?? []).map(normalizeMissingRequirement);
  return {
    client: data.client,
    project: data.project,
    tier: data.tier,
    buildPath: data.tier === "enterprise" ? "enterprise" : "custom",
    assets: data.assets,
    template: data.template ?? null,
    enterprise: data.enterprise ?? null,
    scope: data.scope ?? data.content ?? {},
    content: data.content ?? null,
    design: data.design,
    payment: data.payment,
    confirmations: data.confirmations,
    websiteQuestionnaire: data.websiteQuestionnaire ?? null,
    discardReason: data.discardReason ?? null,
    outcome: data.outcome ?? (missingRequirements ? "draft" : undefined),
    missingRequirements: normalizedMissingRequirements,
    operatorNotes: data.operatorNotes ?? [],
    sourceMetadata: data.sourceMetadata ?? {},
  };
}

function getScopeSummary(data: ValidatedPayload) {
  const isCustomBuild = V3_CUSTOM_PROJECT_TYPES.has(data.project?.projectType ?? "");
  if (!isCustomBuild) return undefined;
  return {
    coreFeatures: CORE_FEATURE_CODE_LIST.map(code => ({
      code,
      name: CORE_FEATURE_NAMES.get(code) ?? code,
    })),
    extensions: (data.scope?.extensions ?? [])
      .filter((code: string) => EXTENSION_CODES.has(code))
      .map((code: string) => ({ code, name: EXTENSION_NAMES.get(code) ?? code })),
    customRequests: (data.scope?.customFeatures ?? []).map((text: string) => ({
      text,
      status: "unconfirmed",
    })),
  };
}

async function persistV3Projections(intakeId: string, data: ValidatedPayload) {
  const isCustomBuild = V3_CUSTOM_PROJECT_TYPES.has(data.project?.projectType ?? "");

  if (isCustomBuild) {
    const coreItems = CORE_FEATURE_CODE_LIST.map(code => ({
      intake_id: intakeId,
      item_kind: "core_feature",
      item_code: code,
      item_name: CORE_FEATURE_NAMES.get(code) ?? code,
    }));
    const extensionItems = (data.scope?.extensions ?? [])
      .filter((code: string) => EXTENSION_CODES.has(code))
      .map((code: string) => ({
        intake_id: intakeId,
        item_kind: "extension",
        item_code: code,
        item_name: EXTENSION_NAMES.get(code) ?? code,
      }));
    const customItems = (data.scope?.customFeatures ?? []).map((text: string, i: number) => ({
      intake_id: intakeId,
      item_kind: "custom_request",
      item_code: `custom-${i + 1}`,
      item_name: text,
    }));
    const allItems = [...coreItems, ...extensionItems, ...customItems];
    await supabase.from("intake_scope_items").delete().eq("intake_id", intakeId);
    if (allItems.length > 0) {
      await supabase.from("intake_scope_items").upsert(allItems, {
        onConflict: "intake_id,item_kind,item_code",
      });
    }
  } else {
    await supabase.from("intake_scope_items").delete().eq("intake_id", intakeId);
  }

  if (data.project?.projectType === "ai-assisted-website" && data.websiteQuestionnaire) {
    await supabase.from("intake_website_questionnaire").upsert(
      { intake_id: intakeId, answers: data.websiteQuestionnaire },
      { onConflict: "intake_id" },
    );
  } else {
    await supabase.from("intake_website_questionnaire").delete().eq("intake_id", intakeId);
  }
}

async function assertAssetReferencesBelongToIntake(intakeId: string, data: ValidatedPayload) {
  const ids = (data.assets.uploads ?? []).map(asset => asset.assetId);
  if (ids.length === 0) return;
  const { data: rows, error } = await supabase
    .from("uploaded_assets")
    .select("id")
    .eq("intake_id", intakeId)
    .in("id", ids);
  if (error || (rows ?? []).length !== new Set(ids).size) {
    throw new Error("ASSET_SCOPE_MISMATCH");
  }
}

async function writeLifecycleOutbox(
  intakeId: string,
  clientId: string | null,
  referenceNumber: string | null,
  data: ValidatedPayload,
  command: string,
  missingRequirements: Array<{ field: string; message: string }> = [],
) {
  if (command !== "save_draft" && command !== "submit") return;
  const isDraft = command === "save_draft";
  const eventType = isDraft ? "draft_saved" : "intake_submitted";
  const payload = {
    intakeId,
    clientId,
    referenceNumber,
    email: data.client.email,
    status: isDraft ? "draft" : "submitted",
    ...(isDraft
      ? { missingRequirements }
      : { ownerReviewStatus: "waiting_owner_review" }),
  };
  const redactedPayload = redactForNotification(payload);
  const entry = {
    intake_id: intakeId,
    event_type: eventType,
    channel: "email",
    // The delivery worker resolves the recipient email from the client ID;
    // raw email addresses never enter the durable notification payload.
    recipient_ref: clientId ?? "",
    payload: redactedPayload,
  };
  const { error: insertError } = await supabase.from("notification_outbox").insert(entry);
  if (insertError) {
    if (insertError.code !== "23505") throw insertError;
    const { error: updateError } = await supabase
      .from("notification_outbox")
      .update({ recipient_ref: clientId ?? "", payload: redactedPayload, updated_at: new Date().toISOString() })
      .eq("intake_id", intakeId)
      .eq("event_type", eventType);
    if (updateError) throw updateError;
  }
}

async function persistIntake(
  data: ValidatedPayload,
  buildRef: string | null,
  idempotencyKey: string,
  payloadHash: string,
  command: string,
  missingRequirements?: Array<{ field: string; message: string }>,
  existingIntakeId?: string,
) {
  const lifecycleStatuses: Record<string, string> = {
    save_draft: "draft",
    submit: "submitted",
    discard: "discarded",
  };
  const status = lifecycleStatuses[command] || "submitted";
  const isDraft = command === "save_draft";

  // ── Update path: intake already exists, re-save without creating a new row ──
  if (existingIntakeId) {
    const { data: intakeRow } = await supabase
      .from("intakes")
      .select("id, client_id, build_reference_number, status")
      .eq("id", existingIntakeId)
      .maybeSingle();

    if (!intakeRow) throw new Error("INTAKE_NOT_FOUND");
    const row = intakeRow as Record<string, unknown>;
    const clientId: string | null = (row.client_id as string | null) ?? null;
    const previousStatus = (row.status as string | null) ?? "in_progress";
    let referenceNumber: string | null = (row.build_reference_number as string | null) ?? null;
    if (!referenceNumber && command !== "discard") {
      referenceNumber = await generateBuildReferenceNumber();
    }

    await assertAssetReferencesBelongToIntake(existingIntakeId, data);
    const snapshot = buildSubmissionSnapshot(data, missingRequirements);
    const updateValues: Record<string, unknown> = {
      status,
      tier: data.tier,
      client_details: data.client,
      project_details: data.project,
      scope: data.scope ?? data.content ?? {},
      submission_payload: snapshot,
      updated_at: new Date().toISOString(),
    };
    if (referenceNumber && !row.build_reference_number) {
      updateValues.build_reference_number = referenceNumber;
      updateValues.reference_issued_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase
      .from("intakes")
      .update(updateValues)
      .eq("id", existingIntakeId);
    if (updateError) throw updateError;

    await persistV3Projections(existingIntakeId, data);

    const scopeSummary = getScopeSummary(data);
    const preliminaryBuildCard = command === "submit"
      ? {
          status: "queued",
          message: "Your intake has been submitted and is waiting for owner review.",
          ...(scopeSummary ? { scope: scopeSummary } : {}),
        }
      : undefined;
    if (preliminaryBuildCard) {
      await supabase.from("build_cards").upsert(
        {
          intake_id: existingIntakeId,
          status: "queued",
          preliminary_card: preliminaryBuildCard,
        },
        { onConflict: "intake_id" },
      );
    }

    await writeLifecycleOutbox(
      existingIntakeId,
      clientId,
      referenceNumber,
      data,
      command,
      missingRequirements,
    );

    const gapCount = missingRequirements?.length ?? 0;
    const responseBody = {
      success: true,
      buildReferenceNumber: referenceNumber,
      referenceNumber,
      intakeId: existingIntakeId,
      clientId,
      status,
      command,
      ...(preliminaryBuildCard ? {
        ownerReviewStatus: "waiting_owner_review",
        preliminaryBuildCard,
      } : {}),
      ...(isDraft ? { missingRequirements: snapshot.missingRequirements } : {}),
    };

    await supabase.from("idempotency_keys").insert({
      idempotency_key: idempotencyKey,
      intake_id: existingIntakeId,
      payload_hash: payloadHash,
      response_body: responseBody,
    });

    await supabase.from("audit_events").insert({
      intake_id: existingIntakeId,
      actor_type: "system",
      event_type: isDraft
        ? (gapCount > 0 ? "draft_saved_with_gaps" : "lifecycle_draft_saved")
        : command === "discard" ? "lifecycle_discarded" : "lifecycle_submitted",
      event_payload: {
        command,
        build_reference_number: referenceNumber,
        tier: data.tier,
        idempotency_key: idempotencyKey,
        previous_status: previousStatus,
        new_status: status,
        ...(command === "discard" && data.discardReason ? { discardReason: data.discardReason } : {}),
        ...(isDraft && gapCount > 0 ? { gap_count: gapCount } : {}),
      },
    });

    if (referenceNumber && !row.build_reference_number) {
      await supabase.from("intake_lifecycle_events").insert({
        intake_id: existingIntakeId,
        event_type: "build_reference_assigned",
        actor_type: "system",
        new_status: status,
        idempotency_key: idempotencyKey,
        metadata: { referenceNumber },
      });
    }

    return responseBody;
  }

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
    p_pages: JSON.stringify(data.scope?.pages ?? data.content?.pages ?? []),
    p_features: JSON.stringify(data.scope?.features ?? data.content?.features ?? []),
    p_design_styles: JSON.stringify(data.design.styles),
    p_inspiration_link: data.design.inspirationLink,
    p_payment_plan: data.payment.plan,
    p_maintenance_after_free: data.payment.maintenanceAfterFree,
    p_maintenance_end_acknowledged: data.payment.maintenanceEndAcknowledged,
    p_voucher_code: data.payment.voucherCode,
    p_confirmations: JSON.stringify({
      ...data.confirmations,
      ...(command === "discard" && data.discardReason ? { discardReason: data.discardReason } : {}),
    }),
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
  const rpcResponseBody = rpcResult?.response_body;
  const isSubmitted = command === "submit";
  const isCustomBuild = V3_CUSTOM_PROJECT_TYPES.has(data.project?.projectType ?? "");

  // D-2 fix: clientId lives on intakes.client_id, not intake_clients.id
  let clientId: string | null = rpcResponseBody?.clientId ?? null;
  if (intakeId) {
    const { data: intakeRow } = await supabase
      .from("intakes")
      .select("client_id")
      .eq("id", intakeId)
      .maybeSingle();
    if (intakeRow) clientId = (intakeRow as Record<string, string>).client_id ?? clientId;
  }

  if (intakeId) {
    await assertAssetReferencesBelongToIntake(intakeId, data);
    const snapshot = buildSubmissionSnapshot(data, missingRequirements);
    const { error: snapshotError } = await supabase
      .from("intakes")
      .update({
        tier: data.tier,
        client_details: data.client,
        project_details: data.project,
        scope: data.scope ?? data.content ?? {},
        submission_payload: snapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId);
    if (snapshotError) throw snapshotError;
  }

  // ── Server-side core feature injection and scope persistence ────────────────
  if (intakeId && isCustomBuild) {
    const coreItems = CORE_FEATURE_CODE_LIST.map(code => ({
      intake_id: intakeId,
      item_kind: "core_feature",
      item_code: code,
      item_name: CORE_FEATURE_NAMES.get(code) ?? code,
    }));

    const clientExtensions: string[] = (data.scope?.extensions ?? []).filter(
      (code: string) => EXTENSION_CODES.has(code),
    );
    const extensionItems = clientExtensions.map((code: string) => ({
      intake_id: intakeId,
      item_kind: "extension",
      item_code: code,
      item_name: EXTENSION_NAMES.get(code) ?? code,
    }));

    const customItems = (data.scope?.customFeatures ?? []).map((text: string, i: number) => ({
      intake_id: intakeId,
      item_kind: "custom_request",
      item_code: `custom-${i + 1}`,
      item_name: text,
    }));

    const allItems = [...coreItems, ...extensionItems, ...customItems];
    // Replace the per-intake projection so a later draft update cannot leave
    // removed extensions or custom requests behind. The operation remains
    // idempotent because the same canonical rows are immediately upserted.
    await supabase.from("intake_scope_items").delete().eq("intake_id", intakeId);
    if (allItems.length > 0) {
      await supabase
        .from("intake_scope_items")
        .upsert(allItems, { onConflict: "intake_id,item_kind,item_code" });
    }
  }

  // ── Questionnaire persistence (ai-assisted-website only) ────────────────────
  if (intakeId && data.project?.projectType === "ai-assisted-website" && data.websiteQuestionnaire) {
    await supabase
      .from("intake_website_questionnaire")
      .upsert(
        { intake_id: intakeId, answers: data.websiteQuestionnaire },
        { onConflict: "intake_id" },
      );
  }

  const scopeSummary = isCustomBuild ? {
    coreFeatures: CORE_FEATURE_CODE_LIST.map(code => ({
      code,
      name: CORE_FEATURE_NAMES.get(code) ?? code,
    })),
    extensions: (data.scope?.extensions ?? [])
      .filter((code: string) => EXTENSION_CODES.has(code))
      .map((code: string) => ({ code, name: EXTENSION_NAMES.get(code) ?? code })),
    customRequests: (data.scope?.customFeatures ?? []).map((text: string) => ({
      text,
      status: "unconfirmed",
    })),
  } : undefined;

  // The atomic RPC has already written lifecycle/idempotency records and
  // returns its response body. Supplemental v3 projections still need to run
  // before returning, and the preliminary Build Card must include that scope.
  if (rpcResponseBody) {
    const preliminaryBuildCard = rpcResponseBody.preliminaryBuildCard;
    const responseBody = {
      ...rpcResponseBody,
      buildReferenceNumber: rpcResponseBody.buildReferenceNumber ?? buildRef,
      referenceNumber: rpcResponseBody.referenceNumber ?? rpcResponseBody.buildReferenceNumber ?? buildRef,
      intakeId: rpcResponseBody.intakeId ?? intakeId,
      clientId,
      command,
      ...(isDraft ? { missingRequirements: buildSubmissionSnapshot(data, missingRequirements).missingRequirements } : {}),
      ...(scopeSummary && preliminaryBuildCard
        ? { preliminaryBuildCard: { ...preliminaryBuildCard, scope: scopeSummary } }
        : {}),
    };
    await writeLifecycleOutbox(
      intakeId,
      clientId,
      responseBody.referenceNumber ?? null,
      data,
      command,
      missingRequirements,
    );
    if (command === "discard" && data.discardReason) {
      await supabase.from("audit_events").insert({
        intake_id: intakeId,
        actor_type: "system",
        event_type: "discard_reason_recorded",
        event_payload: { reasonCode: data.discardReason.code, note: data.discardReason.note ?? null },
      });
    }
    return responseBody;
  }

  const responseBody = {
    success: true,
    buildReferenceNumber: buildRef,
    referenceNumber: buildRef,
    intakeId,
    clientId,
    status: isSubmitted ? "submitted" : status,
    command,
    ...(isSubmitted ? {
      ownerReviewStatus: "waiting_owner_review",
      preliminaryBuildCard: {
        status: "queued",
        message: "Your intake has been submitted. A preliminary Build Card will be generated and queued for owner review.",
        ...(scopeSummary ? { scope: scopeSummary } : {}),
      },
    } : {}),
    ...(isDraft ? { missingRequirements: buildSubmissionSnapshot(data, missingRequirements).missingRequirements } : {}),
  };

  if (intakeId) {
    await writeLifecycleOutbox(
      intakeId,
      clientId,
      buildRef,
      data,
      command,
      missingRequirements,
    );
  }

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
      ...(command === "discard" && data.discardReason ? { discardReason: data.discardReason } : {}),
      ...(isDraft && gapCount > 0 ? { gap_count: gapCount } : {}),
    },
  });

  return responseBody;
}
