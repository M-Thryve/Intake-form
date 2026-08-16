import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { getConfig } from "../lib/config.js";
import {
  uploadRequestSchema,
  validateAssetUpload,
  isValidTransition,
  type AssetStatus,
} from "../lib/asset-validation.js";

export const assetRouter = Router();

const bindingSchema = z.object({
  intakeId: z.string().uuid("intakeId must be a valid UUID"),
  clientId: z.string().uuid("clientId must be a valid UUID"),
  referenceNumber: z.string().min(1, "Reference Number is required").max(100),
});
const statusUpdateSchema = bindingSchema.extend({
  status: z.enum(["scanning", "ready", "rejected", "failed"]),
  reason: z.string().max(1000).optional(),
});

type IntakeBinding = z.infer<typeof bindingSchema>;
type IntakeRow = { id: string; status: string; client_id: string; build_reference_number: string };
type AssetRow = Record<string, unknown> & { id: string; intake_id: string; asset_status: AssetStatus };

function validationError(res: Response, issues: z.ZodIssue[]) {
  res.status(422).json({
    success: false,
    error: "Validation failed",
    details: issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
  });
}

function assetResponse(asset: Record<string, unknown>) {
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

async function loadBoundIntake(res: Response, binding: IntakeBinding): Promise<IntakeRow | null> {
  const { data, error } = await supabase
    .from("intakes")
    .select("id, status, client_id, build_reference_number")
    .eq("id", binding.intakeId)
    .eq("client_id", binding.clientId)
    .eq("build_reference_number", binding.referenceNumber)
    .maybeSingle();
  if (error) {
    res.status(500).json({ success: false, error: "Failed to authorize intake asset access" });
    return null;
  }
  if (!data) {
    res.status(404).json({ success: false, error: "Intake not found" });
    return null;
  }
  return data as IntakeRow;
}

async function loadBoundAsset(res: Response, assetId: string, binding: IntakeBinding): Promise<AssetRow | null> {
  const intake = await loadBoundIntake(res, binding);
  if (!intake) return null;
  const { data, error } = await supabase
    .from("uploaded_assets")
    .select("id, intake_id, client_id, build_reference_number, storage_key, storage_bucket, original_filename, mime_type, file_size_bytes, size_bytes, asset_status, scan_status, rejection_reason, requirement_key, uploaded_at, created_at, upload_attempt_count")
    .eq("id", assetId)
    .eq("intake_id", binding.intakeId)
    .maybeSingle();
  if (error || !data) {
    res.status(404).json({ success: false, error: "Asset not found" });
    return null;
  }
  return data as AssetRow;
}

async function logTransition(
  assetId: string,
  previousStatus: string | null,
  newStatus: string,
  reason: string,
  actorType: "system" | "user" | "scanner" = "system",
) {
  await supabase.from("asset_state_log").insert({
    asset_id: assetId,
    previous_status: previousStatus,
    new_status: newStatus,
    reason,
    actor_type: actorType,
  });
}

assetRouter.post("/upload-request", async (req: Request, res: Response) => {
  const parsed = uploadRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }
  const input = parsed.data;
  const intake = await loadBoundIntake(res, input);
  if (!intake) return;
  if (intake.status !== "draft" && intake.status !== "submitted") {
    res.status(409).json({ success: false, error: "Assets can only be uploaded for draft or submitted intakes" });
    return;
  }

  const validation = validateAssetUpload(input);
  if (!validation.valid) {
    res.status(422).json({
      success: false,
      error: "Asset validation failed",
      details: validation.errors.map(message => ({ field: "file", message })),
    });
    return;
  }

  let retryAsset: AssetRow | null = null;
  if (input.retryAssetId) {
    retryAsset = await loadBoundAsset(res, input.retryAssetId, input);
    if (!retryAsset) return;
    const isRetryableFailure = isValidTransition(retryAsset.asset_status, "pending", false);
    const isDraftReplacement = intake.status === "draft" && retryAsset.asset_status !== "pending";
    if (!isRetryableFailure && !isDraftReplacement) {
      res.status(409).json({ success: false, error: `Asset in '${retryAsset.asset_status}' state cannot be retried` });
      return;
    }
  }

  const config = getConfig();
  const { data: signedUrl, error: storageError } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .createSignedUploadUrl(validation.storageKey!);
  if (storageError || !signedUrl) {
    res.status(500).json({ success: false, error: "Failed to create upload URL. Please try again." });
    return;
  }

  let assetId: string;
  if (retryAsset) {
    assetId = retryAsset.id;
    const oldStorageKey = String(retryAsset.storage_key || "");
    const oldStorageBucket = String(retryAsset.storage_bucket || config.SUPABASE_STORAGE_BUCKET);
    if (oldStorageKey && oldStorageKey !== validation.storageKey) {
      const { error: removeError } = await supabase.storage
        .from(oldStorageBucket)
        .remove([oldStorageKey]);
      if (removeError) {
        res.status(502).json({ success: false, error: "Failed to remove the previous stored asset" });
        return;
      }
    }
    const { error } = await supabase
      .from("uploaded_assets")
      .update({
        storage_key: validation.storageKey,
        storage_path: validation.storageKey,
        original_filename: input.filename,
        mime_type: input.mimeType,
        file_size_bytes: input.fileSizeBytes,
        size_bytes: input.fileSizeBytes,
        requirement_key: input.requirementKey ?? null,
        asset_status: "pending",
        scan_status: "pending",
        rejection_reason: null,
        uploaded_at: new Date().toISOString(),
        upload_attempt_count: Number(retryAsset.upload_attempt_count ?? 1) + 1,
      })
      .eq("id", assetId)
      .eq("intake_id", input.intakeId);
    if (error) {
      res.status(500).json({ success: false, error: "Failed to retry asset upload" });
      return;
    }
    await logTransition(assetId, retryAsset.asset_status, "pending", "Upload retry requested", "user");
  } else {
    const { data: asset, error } = await supabase
      .from("uploaded_assets")
      .insert({
        intake_id: input.intakeId,
        client_id: input.clientId,
        build_reference_number: input.referenceNumber,
        storage_key: validation.storageKey,
        storage_path: validation.storageKey,
        original_filename: input.filename,
        mime_type: input.mimeType,
        file_size_bytes: input.fileSizeBytes,
        size_bytes: input.fileSizeBytes,
        requirement_key: input.requirementKey ?? null,
        scan_status: "pending",
        asset_status: "pending",
        storage_bucket: config.SUPABASE_STORAGE_BUCKET,
      })
      .select("id")
      .single();
    if (error || !asset) {
      res.status(500).json({ success: false, error: "Failed to register asset. Please try again." });
      return;
    }
    assetId = asset.id;
    await logTransition(assetId, null, "pending", "Upload requested");
  }

  res.status(retryAsset ? 200 : 201).json({
    success: true,
    assetId,
    uploadUrl: signedUrl.signedUrl,
    token: signedUrl.token,
    storageKey: validation.storageKey,
    expiresIn: 3600,
  });
});

assetRouter.post("/:assetId/confirm-upload", async (req: Request, res: Response) => {
  const parsedAssetId = z.string().uuid().safeParse(req.params.assetId);
  const binding = bindingSchema.safeParse(req.body);
  if (!parsedAssetId.success || !binding.success) {
    if (!binding.success) validationError(res, binding.error.issues);
    else res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }
  const asset = await loadBoundAsset(res, parsedAssetId.data, binding.data);
  if (!asset) return;
  if (asset.asset_status !== "pending") {
    res.status(409).json({ success: false, error: `Cannot confirm upload: asset is in '${asset.asset_status}' state` });
    return;
  }

  const config = getConfig();
  const storageKey = String(asset.storage_key || "");
  const { data: fileList, error: listError } = await supabase.storage
    .from(String(asset.storage_bucket || config.SUPABASE_STORAGE_BUCKET))
    .list(storageKey.split("/").slice(0, -1).join("/"), { search: storageKey.split("/").pop() });
  const fileExists = !listError && Boolean(fileList?.length);
  const nextStatus: AssetStatus = fileExists ? "uploaded" : "failed";
  const reason = fileExists
    ? "Upload confirmed â€” file verified in storage"
    : "Upload confirmation failed â€” file not found in storage";
  const { data: updated, error } = await supabase
    .from("uploaded_assets")
    .update({
      asset_status: nextStatus,
      scan_status: fileExists ? "pending" : "failed",
      rejection_reason: fileExists ? null : reason,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", asset.id)
    .eq("intake_id", binding.data.intakeId)
    .select("id, original_filename, mime_type, file_size_bytes, asset_status, scan_status, rejection_reason, requirement_key, uploaded_at")
    .single();
  if (error || !updated) {
    res.status(500).json({ success: false, error: "Failed to update asset status" });
    return;
  }
  await logTransition(asset.id, "pending", nextStatus, reason);
  res.json({ success: true, ...assetResponse(updated as Record<string, unknown>) });
});

assetRouter.delete("/:assetId", async (req: Request, res: Response) => {
  const parsedAssetId = z.string().uuid().safeParse(req.params.assetId);
  const binding = bindingSchema.safeParse(req.body);
  if (!parsedAssetId.success || !binding.success) {
    if (!binding.success) validationError(res, binding.error.issues);
    else res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }

  const intake = await loadBoundIntake(res, binding.data);
  if (!intake) return;
  if (intake.status !== "draft") {
    res.status(409).json({ success: false, error: "Assets can only be removed before submission" });
    return;
  }

  const asset = await loadBoundAsset(res, parsedAssetId.data, binding.data);
  if (!asset) return;
  const config = getConfig();
  const storageKey = String(asset.storage_key || "");
  if (storageKey) {
    const { error: storageError } = await supabase.storage
      .from(String(asset.storage_bucket || config.SUPABASE_STORAGE_BUCKET))
      .remove([storageKey]);
    if (storageError) {
      res.status(502).json({ success: false, error: "Failed to remove the stored asset" });
      return;
    }
  }

  const { error } = await supabase
    .from("uploaded_assets")
    .delete()
    .eq("id", asset.id)
    .eq("intake_id", binding.data.intakeId);
  if (error) {
    res.status(500).json({ success: false, error: "Failed to remove asset metadata" });
    return;
  }
  res.json({ success: true, assetId: asset.id });
});

assetRouter.patch("/:assetId/status", async (req: Request, res: Response) => {
  const parsedAssetId = z.string().uuid().safeParse(req.params.assetId);
  if (!parsedAssetId.success) {
    res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }
  const isTrustedCaller = req.isInternalService === true || req.user?.role === "owner" || req.user?.role === "admin";
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }
  const asset = await loadBoundAsset(res, parsedAssetId.data, parsed.data);
  if (!asset) return;
  if (parsed.data.status === "ready" && !isTrustedCaller) {
    res.status(403).json({ success: false, error: "Only a trusted scanner or owner/admin can mark assets as ready" });
    return;
  }
  if (!isValidTransition(asset.asset_status, parsed.data.status, isTrustedCaller)) {
    res.status(409).json({ success: false, error: `Invalid state transition: '${asset.asset_status}' â†’ '${parsed.data.status}'` });
    return;
  }

  const reason = parsed.data.reason || `Status changed to ${parsed.data.status}`;
  const update: Record<string, unknown> = { asset_status: parsed.data.status };
  if (parsed.data.status === "rejected") {
    update.rejection_reason = reason;
    update.scan_status = "blocked";
  } else if (parsed.data.status === "ready") {
    update.rejection_reason = null;
    update.scan_status = "clean";
  } else if (parsed.data.status === "failed") {
    update.rejection_reason = reason;
    update.scan_status = "failed";
  } else {
    update.scan_status = "pending";
  }
  const { data: updated, error } = await supabase
    .from("uploaded_assets")
    .update(update)
    .eq("id", asset.id)
    .eq("intake_id", parsed.data.intakeId)
    .select("id, original_filename, mime_type, file_size_bytes, asset_status, scan_status, rejection_reason, requirement_key, uploaded_at")
    .single();
  if (error || !updated) {
    res.status(500).json({ success: false, error: "Failed to update asset status" });
    return;
  }
  await logTransition(asset.id, asset.asset_status, parsed.data.status, reason, req.isInternalService ? "scanner" : "user");
  res.json({ success: true, ...assetResponse(updated as Record<string, unknown>) });
});

assetRouter.get("/intake/:intakeId", async (req: Request, res: Response) => {
  const parsed = bindingSchema.safeParse({
    intakeId: req.params.intakeId,
    clientId: req.query.clientId,
    referenceNumber: req.query.referenceNumber,
  });
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }
  const intake = await loadBoundIntake(res, parsed.data);
  if (!intake) return;
  const { data, error } = await supabase
    .from("uploaded_assets")
    .select("id, original_filename, mime_type, file_size_bytes, size_bytes, asset_status, scan_status, rejection_reason, requirement_key, uploaded_at, created_at")
    .eq("intake_id", parsed.data.intakeId)
    .order("uploaded_at", { ascending: true });
  if (error) {
    res.status(500).json({ success: false, error: "Failed to retrieve assets" });
    return;
  }
  const assets = (data ?? []).map(asset => assetResponse(asset as Record<string, unknown>));
  res.json({
    success: true,
    intakeId: parsed.data.intakeId,
    assets,
    summary: {
      total: assets.length,
      ready: assets.filter(asset => asset.assetStatus === "ready").length,
      pending: assets.filter(asset => ["pending", "uploaded", "scanning"].includes(String(asset.assetStatus))).length,
      rejected: assets.filter(asset => asset.assetStatus === "rejected").length,
      failed: assets.filter(asset => asset.assetStatus === "failed").length,
    },
  });
});

assetRouter.get("/:assetId/download", async (req: Request, res: Response) => {
  const parsedAssetId = z.string().uuid().safeParse(req.params.assetId);
  const binding = bindingSchema.safeParse({
    intakeId: req.query.intakeId,
    clientId: req.query.clientId,
    referenceNumber: req.query.referenceNumber,
  });
  if (!parsedAssetId.success || !binding.success) {
    if (!binding.success) validationError(res, binding.error.issues);
    else res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }
  const asset = await loadBoundAsset(res, parsedAssetId.data, binding.data);
  if (!asset) return;
  if (asset.asset_status === "pending") {
    res.status(409).json({ success: false, error: "Asset upload not yet confirmed" });
    return;
  }
  const config = getConfig();
  const { data: signedUrl, error } = await supabase.storage
    .from(String(asset.storage_bucket || config.SUPABASE_STORAGE_BUCKET))
    .createSignedUrl(String(asset.storage_key), 300);
  if (error || !signedUrl) {
    res.status(500).json({ success: false, error: "Failed to generate download URL" });
    return;
  }
  res.json({
    success: true,
    assetId: asset.id,
    downloadUrl: signedUrl.signedUrl,
    filename: asset.original_filename,
    expiresIn: 300,
  });
});
