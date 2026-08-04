import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireRole } from "../middleware/auth.js";

export const consoleRouter = Router();

function parseUuid(param: unknown): string | null {
  if (typeof param !== "string") return null;
  return z.string().uuid().safeParse(param).success ? param : null;
}

function audit(intakeId: string, eventType: string, payload: Record<string, unknown>, actorId?: string) {
  void supabase.from("audit_events").insert({
    intake_id: intakeId,
    actor_type: "user",
    actor_user_id: actorId || null,
    event_type: eventType,
    event_payload: payload,
  }).then(() => {}, () => {});
}

async function getBuildCardVersion(intakeId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("mcp_runs")
      .select("output_version")
      .eq("intake_id", intakeId)
      .eq("server_role", "build_card")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Record<string, unknown> | null)?.output_version as string || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

// ═══════════════════════════════════════════════════════════
// GET /api/console/queue — Review queue listing
// ═══════════════════════════════════════════════════════════

const queueQuerySchema = z.object({
  status: z.string().optional(),
  tier: z.enum(["template", "custom", "enterprise"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

consoleRouter.get("/queue", async (req: Request, res: Response) => {
  const params = queueQuerySchema.safeParse(req.query);
  if (!params.success) {
    res.status(422).json({ success: false, error: "Invalid query parameters", details: params.error.issues });
    return;
  }

  const { status, tier, limit, offset } = params.data;

  let query = supabase
    .from("intakes")
    .select(`id, build_reference_number, client_id, project_name, project_type, tier, status, submitted_at, created_at, updated_at, clients!inner(company)`, { count: "exact" });

  if (status) query = query.eq("status", status);
  if (tier) query = query.eq("tier", tier);

  const { data, error, count } = await query
    .neq("status", "draft")
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ success: false, error: "Failed to load queue" });
    return;
  }

  const enriched = await Promise.all((data || []).map(async (item: Record<string, unknown>) => {
    const intakeId = item.id as string;

    const { data: runs } = await supabase
      .from("mcp_runs")
      .select("server_role, status")
      .eq("intake_id", intakeId);

    const runCount = (runs || []).length;
    const completedCount = (runs || []).filter((r: Record<string, unknown>) => r.status === "completed").length;
    const failedCount = (runs || []).filter((r: Record<string, unknown>) => r.status === "failed" || r.status === "timed_out").length;

    let analysisStatus = "waiting";
    if (runCount === 0) analysisStatus = "waiting";
    else if (failedCount > 0 && completedCount === 0) analysisStatus = "failed";
    else if (completedCount === runCount) analysisStatus = "complete";
    else if (completedCount > 0) analysisStatus = "partial";
    else analysisStatus = "running";

    const { count: assetsTotal } = await supabase
      .from("uploaded_assets")
      .select("id", { count: "exact", head: true })
      .eq("intake_id", intakeId);

    const { count: assetsReady } = await supabase
      .from("uploaded_assets")
      .select("id", { count: "exact", head: true })
      .eq("intake_id", intakeId)
      .eq("asset_status", "ready");

    const { data: decisions } = await supabase
      .from("owner_gate_decisions")
      .select("decision, decided_at")
      .eq("intake_id", intakeId)
      .order("decided_at", { ascending: false })
      .limit(1);

    const lastDecision = decisions && decisions.length > 0 ? decisions[0] as Record<string, unknown> : null;
    const clientRecord = item.clients as Record<string, unknown> | null;

    return {
      id: intakeId,
      buildReferenceNumber: item.build_reference_number,
      clientCompany: clientRecord?.company || "",
      projectName: item.project_name,
      projectType: item.project_type,
      tier: item.tier,
      submittedAt: item.submitted_at,
      status: item.status,
      analysisStatus,
      assetStatus: { ready: assetsReady || 0, total: assetsTotal || 0 },
      lastDecisionType: lastDecision?.decision || null,
      lastDecisionAt: lastDecision?.decided_at || null,
      lastActivityAt: item.updated_at || item.created_at,
    };
  }));

  res.json({
    success: true,
    items: enriched,
    pagination: { total: count || 0, limit, offset },
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/console/intakes/:intakeId — Intake review detail
// ═══════════════════════════════════════════════════════════

consoleRouter.get("/intakes/:intakeId", async (req: Request, res: Response) => {
  const intakeId = parseUuid(req.params.intakeId as string);
  if (!intakeId) {
    res.status(400).json({ success: false, error: "Invalid intake ID" });
    return;
  }

  const { data: intakeRow } = await supabase
    .from("intakes")
    .select(`
      id, build_reference_number, client_id, project_name, industry,
      project_type, business_description, tier, status,
      submitted_by, submitted_at, created_at, updated_at,
      clients(id, full_name, company, email, phone)
    `)
    .eq("id", intakeId)
    .maybeSingle();

  if (!intakeRow) {
    res.status(404).json({ success: false, error: "Intake not found" });
    return;
  }

  const intake = intakeRow as Record<string, unknown>;
  const client = intake.clients as Record<string, unknown> | null;

  const [{ data: features }, { data: pages }, { data: template }, { data: enterprise },
    { data: payment }, { data: designData }, { data: assets },
    { data: runs }, { data: decisions }, { data: auditLogs },
    { data: releasePkg }] = await Promise.all([
    supabase.from("intake_features").select("*").eq("intake_id", intakeId),
    supabase.from("intake_page_contents").select("page_name, field_key, field_value").eq("intake_id", intakeId),
    supabase.from("intake_template_selections").select("*").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("intake_enterprise_requirements").select("*").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("intake_payment_preferences").select("*").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("intake_design_preferences").select("style_key").eq("intake_id", intakeId),
    supabase.from("uploaded_assets").select("id, original_filename, asset_status, scan_status, mime_type, file_size_bytes, uploaded_at").eq("intake_id", intakeId).order("uploaded_at", { ascending: true }),
    supabase.from("mcp_runs").select("id, server_role, status, started_at, completed_at, output_payload, output_version, error_message, retry_count").eq("intake_id", intakeId).order("created_at", { ascending: true }),
    supabase.from("owner_gate_decisions").select("*").eq("intake_id", intakeId).order("decided_at", { ascending: false }),
    supabase.from("audit_events").select("event_type, actor_type, created_at").eq("intake_id", intakeId).order("created_at", { ascending: false }).limit(50),
    supabase.from("owner_release_packages").select("release_package, updated_at").eq("intake_id", intakeId).maybeSingle(),
  ]);

  const releasePkgPayload = releasePkg ? (releasePkg as Record<string, unknown>).release_package as Record<string, unknown> | null : null;

  const detail = {
    intake: {
      id: intake.id,
      buildReferenceNumber: intake.build_reference_number,
      tier: intake.tier,
      status: intake.status,
      project: {
        name: intake.project_name,
        industry: intake.industry,
        type: intake.project_type,
        description: intake.business_description,
      },
      submittedAt: intake.submitted_at,
      createdAt: intake.created_at,
    },
    client: client ? {
      name: client.full_name,
      company: client.company,
      email: client.email,
      phone: client.phone,
    } : null,
    tierDetails: {
      template: template || null,
      enterprise: enterprise || null,
    },
    pages: (pages || []).map((p: Record<string, unknown>) => ({ name: p.page_name, fields: {} })),
    features: (features || []).map((f: Record<string, unknown>) => ({
      name: f.feature_name,
      priority: f.priority,
      source: f.source,
    })),
    design: {
      styles: (designData || []).map((d: Record<string, unknown>) => d.style_key),
    },
    payment: payment || null,
    assets: (assets || []).map((a: Record<string, unknown>) => ({
      id: a.id,
      filename: a.original_filename,
      assetStatus: a.asset_status,
      mimeType: a.mime_type,
    })),
    analysis: {
      runs: runs || [],
      buildCard: releasePkgPayload?.build_card || null,
    },
    decisions: decisions || [],
    auditHistory: auditLogs || [],
  };

  audit(intakeId, "console_intake_viewed", {}, req.user?.id);

  res.json({ success: true, detail });
});

// ═══════════════════════════════════════════════════════════
// POST /api/console/intakes/:intakeId/decide — Owner decision
// ═══════════════════════════════════════════════════════════

function uuid(): string { return crypto.randomUUID(); }

const decideSchema = z.object({
  decision: z.enum(["approve", "reject", "request_changes"]),
  reason: z.string().min(5, "Reason is required (min 5 chars)").max(2000),
});

consoleRouter.post("/intakes/:intakeId/decide",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId as string);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const parsed = decideSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const { decision, reason } = parsed.data;

    // Atomic read of current intake status
    const { data: current, error: getError } = await supabase
      .from("intakes")
      .select("id, status, build_reference_number")
      .eq("id", intakeId)
      .maybeSingle();

    if (getError || !current) {
      res.status(404).json({ success: false, error: "Intake not found" });
      return;
    }

    const currentStatus = (current as Record<string, unknown>).status as string;
    const buildRef = (current as Record<string, unknown>).build_reference_number as string;

    if (currentStatus !== "submitted" && currentStatus !== "waiting_owner_review") {
      res.status(409).json({
        success: false,
        error: `Cannot decide on intake in '${currentStatus}' status`,
      });
      return;
    }

    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      request_changes: "needs_clarification",
    };
    const newStatus = statusMap[decision];

    const decisionId = uuid();
    const bcVersion = await getBuildCardVersion(intakeId);

    // Insert decision
    const { error: insertErr } = await supabase
      .from("owner_gate_decisions")
      .insert({
        id: decisionId,
        intake_id: intakeId,
        decision,
        decision_reason: reason,
        decided_by: req.user?.id,
        decided_at: new Date().toISOString(),
        build_reference_number: buildRef,
        resulting_status: newStatus,
        reviewed_build_card_version: bcVersion,
        reviewed_analysis_version: "1.0.0",
      });

    if (insertErr) {
      console.error("Decision insert error:", insertErr);
      res.status(500).json({ success: false, error: "Failed to record decision" });
      return;
    }

    // Update intake status with concurrency guard
    const { error: updateErr } = await supabase
      .from("intakes")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", intakeId)
      .eq("status", currentStatus);

    if (updateErr) {
      console.error("Intake update error:", updateErr);
      res.status(409).json({
        success: false,
        error: "Failed to update intake. It may have been modified concurrently. Please refresh.",
      });
      return;
    }

    // Audit
    audit(intakeId, `owner_${decision}`, {
      reason,
      newStatus,
      decisionId,
      reviewedBuildCardVersion: bcVersion,
    }, req.user?.id);

    // For approval: mark Build Cards as trashed (superseded in schema)
    if (decision === "approve") {
      await supabase
        .from("build_cards")
        .update({ status: "approved" })
        .eq("intake_id", intakeId)
        .eq("status", "waiting_owner_review");
    }

    res.json({
      success: true,
      decision: {
        id: decisionId,
        type: decision,
        reason,
        newStatus,
        decidedAt: new Date().toISOString(),
        decidedBy: req.user?.id,
        intakeId,
        buildReferenceNumber: buildRef,
        reviewedVersion: bcVersion,
      },
      message: decision === "approve"
        ? "Intake approved for next phase. No payment or build has been triggered."
        : decision === "reject"
          ? "Intake rejected and archived."
          : "Changes requested from intake operator.",
    });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/console/intakes/:intakeId/audit — Audit trail
// ═══════════════════════════════════════════════════════════

consoleRouter.get("/intakes/:intakeId/audit", async (req: Request, res: Response) => {
  const intakeId = parseUuid(req.params.intakeId as string);
  if (!intakeId) {
    res.status(400).json({ success: false, error: "Invalid intake ID" });
    return;
  }

  const { data, error } = await supabase
    .from("audit_events")
    .select("event_type, actor_type, created_at")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ success: false, error: "Failed to retrieve audit log" });
    return;
  }

  res.json({ success: true, intakeId, events: data || [], total: (data || []).length });
});