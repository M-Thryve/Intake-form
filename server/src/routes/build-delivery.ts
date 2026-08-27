import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js"
import { PAYMENT_DUE_NOTE } from "../lib/payments.js";
import { requireRole } from "../middleware/auth.js";
import { checkBuildEligibility } from "../lib/build-eligibility.js";
import { buildDeliveryPackagePayload, computePackageChecksum } from "../lib/build-package.js";

export const buildDeliveryRouter = Router();

function parseUuid(param: unknown): string | null {
  if (typeof param !== "string") return null;
  return z.string().uuid().safeParse(param).success ? param : null;
}

function audit(
  intakeId: string,
  eventType: string,
  payload: Record<string, unknown>,
  actorId?: string | null,
) {
  void supabase
    .from("audit_events")
    .insert({
      intake_id: intakeId,
      actor_type: "user",
      actor_user_id: actorId ?? null,
      event_type: eventType,
      event_payload: payload,
    })
    .then(() => {}, () => {});
}

async function loadLatestPackage(intakeId: string) {
  const { data } = await supabase
    .from("build_delivery_packages")
    .select("*")
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

async function nextPackageVersion(intakeId: string): Promise<number> {
  const { data } = await supabase
    .from("build_delivery_packages")
    .select("version")
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { version: number } | null;
  return row ? row.version + 1 : 1;
}

// ═══════════════════════════════════════════════════════════
// GET /api/build-delivery/intakes/:intakeId
//   Returns latest package + freshness assessment. Available to internal roles
//   (owner|admin|builder|finance). Never returns credentials or storage tokens.
// ═══════════════════════════════════════════════════════════

buildDeliveryRouter.get(
  "/intakes/:intakeId",
  requireRole("owner", "admin", "builder", "finance"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const eligibility = await checkBuildEligibility(intakeId, {
      requirePackage: false,
      requirePackageFresh: false,
    });
    const pkg = await loadLatestPackage(intakeId);

    if (pkg) {
      audit(intakeId, "build_package_accessed", { packageId: pkg.id, packageVersion: pkg.version }, req.user?.id);
    }

    res.json({
      success: true,
      eligibility,
      package: pkg,
    });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/build-delivery/intakes/:intakeId/package
//   Owner/admin-only. Creates a new frozen delivery package version.
//   Supersedes prior active packages. Supports Idempotency-Key.
// ═══════════════════════════════════════════════════════════

const createPackageSchema = z.object({
  notes: z.string().max(2000).optional(),
});

buildDeliveryRouter.post(
  "/intakes/:intakeId/package",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const parsed = createPackageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const idempotencyKey = (req.headers["idempotency-key"] as string | undefined)?.trim() || null;

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("build_delivery_packages")
        .select("*")
        .eq("intake_id", intakeId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        res.status(200).json({ success: true, package: existing, idempotent: true });
        return;
      }
    }

    const eligibility = await checkBuildEligibility(intakeId, {
      requirePackage: false,
      requirePackageFresh: false,
    });
    if (!eligibility.eligible || !eligibility.snapshot) {
      res.status(409).json({
        success: false,
        error: "Intake is not eligible for build delivery.",
        reason: eligibility.reason,
        detail: eligibility.detail,
      });
      return;
    }

    // Guard against creating a new package while an orchestration is active —
    // that would confuse worker acknowledgements against the new checksum.
    if (eligibility.snapshot.activeOrchestration) {
      res.status(409).json({
        success: false,
        error: "A build orchestration is already active. Cancel or complete it before creating a new package.",
        activeOrchestrationId: eligibility.snapshot.activeOrchestration.id,
      });
      return;
    }

    const version = await nextPackageVersion(intakeId);
    const payload = await buildDeliveryPackagePayload({
      intakeId,
      version,
      snapshot: eligibility.snapshot,
    });
    const checksum = computePackageChecksum(payload);

    // Supersede any earlier active package for this intake before insert.
    await supabase
      .from("build_delivery_packages")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("intake_id", intakeId)
      .eq("status", "active");

    const insertRow = {
      intake_id: intakeId,
      build_reference_number: eligibility.snapshot.buildReferenceNumber,
      version,
      status: "active",
      agreement_draft_id: eligibility.snapshot.agreementDraft.id,
      agreement_draft_version: eligibility.snapshot.agreementDraft.version,
      build_card_id: eligibility.snapshot.buildCard.id,
      build_card_version: eligibility.snapshot.buildCard.version,
      owner_decision_id: eligibility.snapshot.ownerDecision.id,
      reviewed_analysis_version: payload.approvals.reviewedAnalysisVersion,
      package_payload: payload,
      package_checksum: checksum,
      idempotency_key: idempotencyKey,
      created_by: req.user?.id ?? null,
    };

    const { data: created, error: insertErr } = await supabase
      .from("build_delivery_packages")
      .insert(insertRow)
      .select("*")
      .maybeSingle();

    if (insertErr || !created) {
      // Retry-safe idempotency
      if (idempotencyKey) {
        const { data: retry } = await supabase
          .from("build_delivery_packages")
          .select("*")
          .eq("intake_id", intakeId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (retry) {
          res.status(200).json({ success: true, package: retry, idempotent: true });
          return;
        }
      }
      res.status(500).json({ success: false, error: "Failed to create delivery package" });
      return;
    }

    // Advance commercial_stage — best-effort, will not roll back the package.
    await supabase
      .from("intakes")
      .update({ commercial_stage: "build_delivery_package_created", updated_at: new Date().toISOString() })
      .eq("id", intakeId);

    audit(
      intakeId,
      version === 1 ? "build_delivery_package_created" : "build_delivery_package_versioned",
      {
        packageId: (created as Record<string, unknown>).id,
        packageVersion: version,
        checksum,
        agreementDraftVersion: eligibility.snapshot.agreementDraft.version,
        buildCardVersion: eligibility.snapshot.buildCard.version,
      },
      req.user?.id,
    );

    res.status(201).json({
      success: true,
      package: created,
      message: `Build delivery package created. No build has been started. No payment has been captured. ${PAYMENT_DUE_NOTE}`,
    });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/build-delivery/packages/:packageId
//   Retrieve a specific package version. Available to internal roles.
// ═══════════════════════════════════════════════════════════

buildDeliveryRouter.get(
  "/packages/:packageId",
  requireRole("owner", "admin", "builder", "finance"),
  async (req: Request, res: Response) => {
    const packageId = parseUuid(req.params.packageId);
    if (!packageId) {
      res.status(400).json({ success: false, error: "Invalid package ID" });
      return;
    }
    const { data } = await supabase
      .from("build_delivery_packages")
      .select("*")
      .eq("id", packageId)
      .maybeSingle();
    if (!data) {
      res.status(404).json({ success: false, error: "Package not found" });
      return;
    }
    audit(
      (data as Record<string, unknown>).intake_id as string,
      "build_package_accessed",
      { packageId, packageVersion: (data as Record<string, unknown>).version },
      req.user?.id,
    );
    res.json({ success: true, package: data });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/build-delivery/packages/:packageId/acknowledge
//   Builder acknowledges receipt. Idempotent per (package, builder).
// ═══════════════════════════════════════════════════════════

const acknowledgeSchema = z.object({
  note: z.string().max(2000).optional(),
});

buildDeliveryRouter.post(
  "/packages/:packageId/acknowledge",
  requireRole("builder", "admin"),
  async (req: Request, res: Response) => {
    const packageId = parseUuid(req.params.packageId);
    if (!packageId) {
      res.status(400).json({ success: false, error: "Invalid package ID" });
      return;
    }
    const parsed = acknowledgeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const { data: pkg } = await supabase
      .from("build_delivery_packages")
      .select("id, intake_id, version, status")
      .eq("id", packageId)
      .maybeSingle();
    if (!pkg) {
      res.status(404).json({ success: false, error: "Package not found" });
      return;
    }
    const p = pkg as Record<string, unknown>;
    if (p.status !== "active") {
      res.status(409).json({
        success: false,
        error: `Cannot acknowledge a '${p.status}' package. Only active packages may be acknowledged.`,
      });
      return;
    }

    const actorId = req.user?.id ?? null;

    // Duplicate ack is idempotent — return the existing row instead of erroring.
    const { data: existing } = await supabase
      .from("build_package_acknowledgements")
      .select("*")
      .eq("package_id", packageId)
      .eq("acknowledged_by", actorId)
      .maybeSingle();
    if (existing) {
      res.status(200).json({ success: true, acknowledgement: existing, idempotent: true });
      return;
    }

    const { data: ack, error } = await supabase
      .from("build_package_acknowledgements")
      .insert({
        intake_id: p.intake_id,
        package_id: packageId,
        package_version: p.version,
        acknowledged_by: actorId,
        note: parsed.data.note ?? null,
      })
      .select("*")
      .maybeSingle();

    if (error || !ack) {
      // Concurrent duplicate insert races — recover the row.
      const { data: retry } = await supabase
        .from("build_package_acknowledgements")
        .select("*")
        .eq("package_id", packageId)
        .eq("acknowledged_by", actorId)
        .maybeSingle();
      if (retry) {
        res.status(200).json({ success: true, acknowledgement: retry, idempotent: true });
        return;
      }
      res.status(500).json({ success: false, error: "Failed to record acknowledgement" });
      return;
    }

    await supabase
      .from("intakes")
      .update({ commercial_stage: "build_awaiting_acknowledgement", updated_at: new Date().toISOString() })
      .eq("id", p.intake_id)
      .eq("commercial_stage", "build_delivery_package_created");

    audit(
      p.intake_id as string,
      "build_package_acknowledged",
      { packageId, packageVersion: p.version, acknowledgedBy: actorId },
      actorId,
    );

    res.status(201).json({
      success: true,
      acknowledgement: ack,
      message: "Package acknowledged. Any scope or price change requires a new owner and finance review.",
    });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/build-delivery/packages/:packageId/note
//   Builder-authored clarification / blocker / change request.
//   Does NOT change the delivery baseline.
// ═══════════════════════════════════════════════════════════

const noteSchema = z.object({
  kind: z.enum(["clarification", "blocker", "change_request"]),
  message: z.string().min(5).max(4000),
});

buildDeliveryRouter.post(
  "/packages/:packageId/note",
  requireRole("builder", "owner", "admin"),
  async (req: Request, res: Response) => {
    const packageId = parseUuid(req.params.packageId);
    if (!packageId) {
      res.status(400).json({ success: false, error: "Invalid package ID" });
      return;
    }
    const parsed = noteSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const { data: pkg } = await supabase
      .from("build_delivery_packages")
      .select("id, intake_id, version")
      .eq("id", packageId)
      .maybeSingle();
    if (!pkg) {
      res.status(404).json({ success: false, error: "Package not found" });
      return;
    }
    const p = pkg as Record<string, unknown>;

    const { data: note, error } = await supabase
      .from("build_delivery_notes")
      .insert({
        intake_id: p.intake_id,
        package_id: packageId,
        package_version: p.version,
        kind: parsed.data.kind,
        message: parsed.data.message,
        authored_by: req.user?.id ?? null,
      })
      .select("*")
      .maybeSingle();

    if (error || !note) {
      res.status(500).json({ success: false, error: "Failed to record note" });
      return;
    }

    const eventType = parsed.data.kind === "change_request" ? "scope_change_requested" : "build_delivery_note_added";
    audit(
      p.intake_id as string,
      eventType,
      { packageId, kind: parsed.data.kind, noteId: (note as Record<string, unknown>).id },
      req.user?.id ?? null,
    );

    res.status(201).json({
      success: true,
      note,
      message:
        parsed.data.kind === "change_request"
          ? "Change request logged. Approved scope, price, and timeline remain unchanged until a new owner/finance review."
          : "Note recorded.",
    });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/build-delivery/intakes/:intakeId/versions
//   Package history for auditors and owners.
// ═══════════════════════════════════════════════════════════

buildDeliveryRouter.get(
  "/intakes/:intakeId/versions",
  requireRole("owner", "admin", "finance", "builder"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }
    const { data, error } = await supabase
      .from("build_delivery_packages")
      .select(
        "id, version, status, package_checksum, agreement_draft_version, build_card_version, created_at, created_by, invalidated_reason",
      )
      .eq("intake_id", intakeId)
      .order("version", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: "Failed to load package history" });
      return;
    }
    res.json({ success: true, versions: data ?? [] });
  },
);
