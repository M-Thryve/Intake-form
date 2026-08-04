import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { getConfig } from "../lib/config.js";
import {
  uploadRequestSchema,
  validateAssetUpload,
  isValidTransition,
  type AssetStatus,
} from "../lib/asset-validation.js";
import { z } from "zod";

export const assetRouter = Router();

// POST /api/assets/upload-request
// Returns a signed upload URL for the client to PUT a file directly to storage.
assetRouter.post("/upload-request", async (req: Request, res: Response) => {
  const parseResult = uploadRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      details: parseResult.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const data = parseResult.data;

  // Verify intake exists
  const { data: intake, error: intakeErr } = await supabase
    .from("intakes")
    .select("id, status")
    .eq("id", data.intakeId)
    .maybeSingle();

  if (intakeErr || !intake) {
    res.status(404).json({ success: false, error: "Intake not found" });
    return;
  }

  if (intake.status !== "draft" && intake.status !== "submitted") {
    res.status(409).json({
      success: false,
      error: "Assets can only be uploaded for draft or submitted intakes",
    });
    return;
  }

  const validation = validateAssetUpload(data);
  if (!validation.valid) {
    res.status(422).json({
      success: false,
      error: "Asset validation failed",
      details: validation.errors.map((msg) => ({ field: "file", message: msg })),
    });
    return;
  }

  const config = getConfig();

  // Create signed upload URL
  const { data: signedUrl, error: storageErr } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .createSignedUploadUrl(validation.storageKey!);

  if (storageErr || !signedUrl) {
    console.error("Storage signed URL error:", storageErr);
    res.status(500).json({
      success: false,
      error: "Failed to create upload URL. Please try again.",
    });
    return;
  }

  // Create asset record in pending state
  const { data: asset, error: insertErr } = await supabase
    .from("uploaded_assets")
    .insert({
      intake_id: data.intakeId,
      storage_key: validation.storageKey!,
      original_filename: validation.sanitizedFilename!,
      mime_type: data.mimeType,
      file_size_bytes: data.fileSizeBytes,
      scan_status: "pending",
      asset_status: "pending",
      storage_bucket: config.SUPABASE_STORAGE_BUCKET,
    })
    .select("id")
    .single();

  if (insertErr || !asset) {
    console.error("Asset record insert error:", insertErr);
    res.status(500).json({
      success: false,
      error: "Failed to register asset. Please try again.",
    });
    return;
  }

  // Log state transition
  await supabase.from("asset_state_log").insert({
    asset_id: asset.id,
    previous_status: null,
    new_status: "pending",
    reason: "Upload requested",
    actor_type: "system",
  });

  res.status(201).json({
    success: true,
    assetId: asset.id,
    uploadUrl: signedUrl.signedUrl,
    token: signedUrl.token,
    storageKey: validation.storageKey,
    expiresIn: 3600,
  });
});

// POST /api/assets/:assetId/confirm-upload
// Called after the client completes the upload to storage.
assetRouter.post("/:assetId/confirm-upload", async (req: Request, res: Response) => {
  const { assetId } = req.params;

  if (!z.string().uuid().safeParse(assetId).success) {
    res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }

  const { data: asset, error: fetchErr } = await supabase
    .from("uploaded_assets")
    .select("id, asset_status, storage_key, intake_id, storage_bucket")
    .eq("id", assetId)
    .maybeSingle();

  if (fetchErr || !asset) {
    res.status(404).json({ success: false, error: "Asset not found" });
    return;
  }

  if (asset.asset_status !== "pending") {
    res.status(409).json({
      success: false,
      error: `Cannot confirm upload: asset is in '${asset.asset_status}' state`,
    });
    return;
  }

  // Verify file exists in storage
  const config = getConfig();
  const { data: fileList, error: listErr } = await supabase.storage
    .from(asset.storage_bucket || config.SUPABASE_STORAGE_BUCKET)
    .list(asset.storage_key.split("/").slice(0, -1).join("/"), {
      search: asset.storage_key.split("/").pop(),
    });

  const fileExists = !listErr && fileList && fileList.length > 0;

  const newStatus: AssetStatus = fileExists ? "uploaded" : "failed";
  const reason = fileExists
    ? "Upload confirmed — file verified in storage"
    : "Upload confirmation failed — file not found in storage";

  const { error: updateErr } = await supabase
    .from("uploaded_assets")
    .update({
      asset_status: newStatus,
      scan_status: fileExists ? "pending" : "failed",
    })
    .eq("id", assetId);

  if (updateErr) {
    console.error("Asset status update error:", updateErr);
    res.status(500).json({ success: false, error: "Failed to update asset status" });
    return;
  }

  await supabase.from("asset_state_log").insert({
    asset_id: assetId,
    previous_status: "pending",
    new_status: newStatus,
    reason,
    actor_type: "system",
  });

  res.json({
    success: true,
    assetId,
    status: newStatus,
    message: reason,
  });
});

// PATCH /api/assets/:assetId/status
// Transition asset to a new state (scanning → ready/rejected, etc.)
const statusUpdateSchema = z.object({
  status: z.enum(["scanning", "ready", "rejected", "failed"]),
  reason: z.string().max(1000).optional(),
});

assetRouter.patch("/:assetId/status", async (req: Request, res: Response) => {
  const { assetId } = req.params;

  if (!z.string().uuid().safeParse(assetId).success) {
    res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }

  const parseResult = statusUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      details: parseResult.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const { status: newStatus, reason } = parseResult.data;

  const { data: asset, error: fetchErr } = await supabase
    .from("uploaded_assets")
    .select("id, asset_status")
    .eq("id", assetId)
    .maybeSingle();

  if (fetchErr || !asset) {
    res.status(404).json({ success: false, error: "Asset not found" });
    return;
  }

  const currentStatus = asset.asset_status as AssetStatus;
  if (!isValidTransition(currentStatus, newStatus)) {
    res.status(409).json({
      success: false,
      error: `Invalid state transition: '${currentStatus}' → '${newStatus}'`,
    });
    return;
  }

  const updateFields: Record<string, unknown> = { asset_status: newStatus };
  if (newStatus === "rejected") {
    updateFields.rejection_reason = reason || "Rejected during review";
    updateFields.scan_status = "blocked";
  } else if (newStatus === "ready") {
    updateFields.scan_status = "clean";
  } else if (newStatus === "failed") {
    updateFields.scan_status = "failed";
  } else if (newStatus === "scanning") {
    updateFields.scan_status = "pending";
  }

  const { error: updateErr } = await supabase
    .from("uploaded_assets")
    .update(updateFields)
    .eq("id", assetId);

  if (updateErr) {
    console.error("Asset status update error:", updateErr);
    res.status(500).json({ success: false, error: "Failed to update asset status" });
    return;
  }

  await supabase.from("asset_state_log").insert({
    asset_id: assetId,
    previous_status: currentStatus,
    new_status: newStatus,
    reason: reason || `Status changed to ${newStatus}`,
    actor_type: "system",
  });

  res.json({
    success: true,
    assetId,
    previousStatus: currentStatus,
    status: newStatus,
  });
});

// GET /api/assets/intake/:intakeId
// List all assets for an intake.
assetRouter.get("/intake/:intakeId", async (req: Request, res: Response) => {
  const { intakeId } = req.params;

  if (!z.string().uuid().safeParse(intakeId).success) {
    res.status(400).json({ success: false, error: "Invalid intake ID" });
    return;
  }

  const { data: intake } = await supabase
    .from("intakes")
    .select("id")
    .eq("id", intakeId)
    .maybeSingle();

  if (!intake) {
    res.status(404).json({ success: false, error: "Intake not found" });
    return;
  }

  const { data: assets, error } = await supabase
    .from("uploaded_assets")
    .select("id, original_filename, mime_type, file_size_bytes, asset_status, scan_status, rejection_reason, uploaded_at")
    .eq("intake_id", intakeId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    console.error("Asset list error:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve assets" });
    return;
  }

  res.json({
    success: true,
    intakeId,
    assets: assets || [],
    summary: {
      total: assets?.length || 0,
      ready: assets?.filter((a) => a.asset_status === "ready").length || 0,
      pending: assets?.filter((a) => a.asset_status === "pending" || a.asset_status === "uploaded" || a.asset_status === "scanning").length || 0,
      rejected: assets?.filter((a) => a.asset_status === "rejected").length || 0,
      failed: assets?.filter((a) => a.asset_status === "failed").length || 0,
    },
  });
});

// GET /api/assets/:assetId/download
// Generate a time-limited signed URL for downloading/previewing an asset.
assetRouter.get("/:assetId/download", async (req: Request, res: Response) => {
  const { assetId } = req.params;

  if (!z.string().uuid().safeParse(assetId).success) {
    res.status(400).json({ success: false, error: "Invalid asset ID" });
    return;
  }

  const { data: asset, error: fetchErr } = await supabase
    .from("uploaded_assets")
    .select("id, storage_key, storage_bucket, asset_status, original_filename")
    .eq("id", assetId)
    .maybeSingle();

  if (fetchErr || !asset) {
    res.status(404).json({ success: false, error: "Asset not found" });
    return;
  }

  if (asset.asset_status === "pending") {
    res.status(409).json({
      success: false,
      error: "Asset upload not yet confirmed",
    });
    return;
  }

  const config = getConfig();
  const { data: signedUrl, error: signErr } = await supabase.storage
    .from(asset.storage_bucket || config.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(asset.storage_key, 300); // 5 minutes

  if (signErr || !signedUrl) {
    console.error("Download signed URL error:", signErr);
    res.status(500).json({ success: false, error: "Failed to generate download URL" });
    return;
  }

  res.json({
    success: true,
    assetId,
    downloadUrl: signedUrl.signedUrl,
    filename: asset.original_filename,
    expiresIn: 300,
  });
});
