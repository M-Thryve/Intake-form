import { Router, type Request, type Response } from "express"
import { z } from "zod"
import { supabase } from "../lib/supabase.js"
import { getConfig } from "../lib/config.js"
import {
  uploadRequestSchema,
  validateAssetUpload,
} from "../lib/asset-validation.js"
import {
  projectClientStatus,
  type ClientFacingState,
} from "../lib/client-status-projection.js"

export const portalRouter = Router()

const parseUuid = (value: unknown): string | null =>
  typeof value === "string" && z.string().uuid().safeParse(value).success
    ? value
    : null

type IntakeRow = Record<string, unknown>

async function loadScopedIntake(
  req: Request,
  res: Response,
  value: unknown,
  select: string,
): Promise<IntakeRow | null> {
  const intakeId = parseUuid(value)
  if (!intakeId) {
    res.status(400).json({ success: false, error: "Invalid intake ID" })
    return null
  }

  const { data, error } = await supabase
    .from("intakes")
    .select(select)
    .eq("id", intakeId)
    .eq("client_id", req.client!.clientId)
    .maybeSingle()

  if (error) {
    res.status(500).json({ success: false, error: "Failed to load intake" })
    return null
  }
  if (!data) {
    // Deliberately return 404 for both missing and cross-client resources.
    res.status(404).json({ success: false, error: "Intake not found" })
    return null
  }
  return data as unknown as IntakeRow
}

function safeStatus(row: IntakeRow): ClientFacingState {
  return projectClientStatus(
    typeof row.status === "string" ? row.status : null,
    typeof row.commercial_stage === "string" ? row.commercial_stage : null,
  )
}

function safeIntakeSummary(row: IntakeRow) {
  return {
    id: row.id,
    reference: row.build_reference_number || null,
    projectName: row.project_name || null,
    status: safeStatus(row),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

portalRouter.get("/me", async (req: Request, res: Response) => {
  const { count, error } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .eq("client_id", req.client!.clientId)

  if (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to load client profile" })
    return
  }

  res.json({
    success: true,
    client: {
      id: req.client!.clientId,
      fullName: req.client!.fullName,
      company: req.client!.company,
      email: req.client!.email,
      status: req.client!.status,
    },
    linkedIntakeCount: count || 0,
  })
})

portalRouter.get("/intakes", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("intakes")
    .select(
      "id, build_reference_number, project_name, status, commercial_stage, created_at, updated_at",
    )
    .eq("client_id", req.client!.clientId)
    .order("created_at", { ascending: false })

  if (error) {
    res.status(500).json({ success: false, error: "Failed to load intakes" })
    return
  }

  res.json({
    success: true,
    intakes: (data || []).map((row) => safeIntakeSummary(row as IntakeRow)),
  })
})

portalRouter.get("/intakes/:intakeId", async (req: Request, res: Response) => {
  const intake = await loadScopedIntake(
    req,
    res,
    req.params.intakeId,
    "id, build_reference_number, project_name, industry, project_type, business_description, tier, status, commercial_stage, created_at, submitted_at, updated_at",
  )
  if (!intake) return

  const intakeId = intake.id as string
  const [
    { data: template },
    { data: pages },
    { data: features },
    { data: assets },
  ] = await Promise.all([
    supabase
      .from("intake_template_selections")
      .select("*")
      .eq("intake_id", intakeId)
      .maybeSingle(),
    supabase
      .from("intake_page_contents")
      .select("page_name, field_key, field_value")
      .eq("intake_id", intakeId),
    supabase
      .from("intake_features")
      .select("feature_name, priority, source")
      .eq("intake_id", intakeId),
    supabase
      .from("uploaded_assets")
      .select(
        "id, original_filename, mime_type, file_size_bytes, asset_status, uploaded_at",
      )
      .eq("intake_id", intakeId)
      .order("uploaded_at", { ascending: true }),
  ])

  res.json({
    success: true,
    intake: {
      ...safeIntakeSummary(intake),
      project: {
        name: intake.project_name || null,
        industry: intake.industry || null,
        type: intake.project_type || null,
        description: intake.business_description || null,
      },
      tier: intake.tier || null,
      submittedAt: intake.submitted_at || null,
      selectedTemplate: template || null,
      pages: pages || [],
      features: features || [],
      assets: (assets || []).map((asset: Record<string, unknown>) => ({
        id: asset.id,
        filename: asset.original_filename,
        mimeType: asset.mime_type,
        fileSizeBytes: asset.file_size_bytes,
        status: asset.asset_status,
        uploadedAt: asset.uploaded_at,
      })),
    },
  })
})

portalRouter.get(
  "/intakes/:intakeId/build-card",
  async (req: Request, res: Response) => {
    const intake = await loadScopedIntake(req, res, req.params.intakeId, "id")
    if (!intake) return

    const { data: buildCard, error } = await supabase
      .from("build_cards")
      .select(
        "id, version, status, summary, complexity_label, preliminary_price_php, preliminary_timeline_days, build_reference_number, created_at, updated_at",
      )
      .eq("intake_id", intake.id)
      .eq("status", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to load build card" })
      return
    }
    if (!buildCard) {
      res
        .status(404)
        .json({ success: false, error: "Approved build card not found" })
      return
    }

    res.json({ success: true, buildCard })
  },
)

portalRouter.get(
  "/intakes/:intakeId/agreement",
  async (req: Request, res: Response) => {
    const intake = await loadScopedIntake(req, res, req.params.intakeId, "id")
    if (!intake) return

    const { data: draft, error } = await supabase
      .from("agreement_drafts")
      .select(
        "id, version, status, build_reference_number, draft_package, preliminary_price_php, final_price_php, discount_amount_php, created_at, updated_at",
      )
      .eq("intake_id", intake.id)
      .in("status", ["finance_approved", "ready_for_build_handoff"])
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to load agreement" })
      return
    }
    if (!draft) {
      res
        .status(404)
        .json({ success: false, error: "Approved agreement not found" })
      return
    }

    res.json({ success: true, agreement: draft })
  },
)

portalRouter.get(
  "/intakes/:intakeId/assets",
  async (req: Request, res: Response) => {
    const intake = await loadScopedIntake(req, res, req.params.intakeId, "id")
    if (!intake) return

    const { data, error } = await supabase
      .from("uploaded_assets")
      .select(
        "id, original_filename, mime_type, file_size_bytes, asset_status, uploaded_at",
      )
      .eq("intake_id", intake.id)
      .order("uploaded_at", { ascending: true })

    if (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to load asset checklist" })
      return
    }

    res.json({
      success: true,
      assets: (data || []).map((asset: Record<string, unknown>) => ({
        id: asset.id,
        filename: asset.original_filename,
        mimeType: asset.mime_type,
        fileSizeBytes: asset.file_size_bytes,
        status: asset.asset_status,
        uploadedAt: asset.uploaded_at,
      })),
    })
  },
)

portalRouter.post(
  "/intakes/:intakeId/assets",
  async (req: Request, res: Response) => {
    const intake = await loadScopedIntake(
      req,
      res,
      req.params.intakeId,
      "id, status",
    )
    if (!intake) return

    const parsed = uploadRequestSchema.safeParse({
      ...req.body,
      intakeId: intake.id,
    })
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues,
      })
      return
    }
    if (intake.status !== "draft" && intake.status !== "submitted") {
      res.status(409).json({
        success: false,
        error: "Assets can only be uploaded for draft or submitted intakes",
      })
      return
    }

    const validation = validateAssetUpload(parsed.data)
    if (!validation.valid) {
      res.status(422).json({
        success: false,
        error: "Asset validation failed",
        details: validation.errors,
      })
      return
    }

    const config = getConfig()
    const { data: signedUrl, error: storageError } = await supabase.storage
      .from(config.SUPABASE_STORAGE_BUCKET)
      .createSignedUploadUrl(validation.storageKey!)
    if (storageError || !signedUrl) {
      res
        .status(500)
        .json({ success: false, error: "Failed to create upload URL" })
      return
    }

    const { data: asset, error: insertError } = await supabase
      .from("uploaded_assets")
      .insert({
        intake_id: intake.id,
        storage_key: validation.storageKey,
        original_filename: validation.sanitizedFilename,
        mime_type: parsed.data.mimeType,
        file_size_bytes: parsed.data.fileSizeBytes,
        scan_status: "pending",
        asset_status: "pending",
        storage_bucket: config.SUPABASE_STORAGE_BUCKET,
      })
      .select("id")
      .single()
    if (insertError || !asset) {
      res
        .status(500)
        .json({ success: false, error: "Failed to register asset" })
      return
    }

    await supabase.from("asset_state_log").insert({
      asset_id: asset.id,
      previous_status: null,
      new_status: "pending",
      reason: "Portal upload requested",
      actor_type: "client",
    })

    res.status(201).json({
      success: true,
      assetId: asset.id,
      uploadUrl: signedUrl.signedUrl,
      token: signedUrl.token,
      storageKey: validation.storageKey,
      expiresIn: 3600,
    })
  },
)

const TIMELINE_ORDER: ClientFacingState[] = [
  "Submitted",
  "Under review",
  "Information needed",
  "Proposal ready",
  "In build",
  "Delivered",
  "Closed",
]

portalRouter.get(
  "/intakes/:intakeId/timeline",
  async (req: Request, res: Response) => {
    const intake = await loadScopedIntake(
      req,
      res,
      req.params.intakeId,
      "id, status, commercial_stage, created_at, submitted_at, updated_at",
    )
    if (!intake) return

    const current = safeStatus(intake)
    const currentIndex = TIMELINE_ORDER.indexOf(current)
    const milestones = TIMELINE_ORDER.filter(
      (_, index) => index <= currentIndex,
    ).map((state) => ({
      state,
      reached: true,
      reachedAt:
        state === "Submitted"
          ? intake.submitted_at || intake.created_at
          : state === current
            ? intake.updated_at
            : null,
    }))

    res.json({ success: true, currentState: current, milestones })
  },
)
