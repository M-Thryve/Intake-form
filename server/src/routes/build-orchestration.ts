import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireRole } from "../middleware/auth.js";
import { checkBuildEligibility } from "../lib/build-eligibility.js";
import {
  applyOrchestrationTransition,
  commercialStageFor,
  loadLatestOrchestration,
  loadOrchestrationById,
  newCorrelationId,
  notifyWorkerOfQueuedJob,
  type OrchestrationState,
} from "../lib/build-orchestration.js";

export const buildOrchestrationRouter = Router();

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

// ═══════════════════════════════════════════════════════════
// POST /api/build-orchestration/intakes/:intakeId/eligibility
//   Dry-run of the queue gate. No side effects.
// ═══════════════════════════════════════════════════════════

buildOrchestrationRouter.post(
  "/intakes/:intakeId/eligibility",
  requireRole("owner", "admin", "builder", "finance"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }
    const eligibility = await checkBuildEligibility(intakeId, {
      requirePackage: true,
      requirePackageFresh: true,
    });
    audit(
      intakeId,
      "build_eligibility_checked",
      { eligible: eligibility.eligible, reason: eligibility.reason ?? null },
      req.user?.id,
    );
    res.json({ success: true, eligibility });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/build-orchestration/intakes/:intakeId/queue
//   Owner/admin. Transactional gate that creates the orchestration row.
//   Idempotent via Idempotency-Key. Concurrent duplicate calls collapse.
// ═══════════════════════════════════════════════════════════

const queueSchema = z.object({
  reason: z.string().min(5).max(2000),
  acceptedRationale: z
    .array(z.object({ topic: z.string().min(1), reason: z.string().min(1) }))
    .max(50)
    .optional(),
});

buildOrchestrationRouter.post(
  "/intakes/:intakeId/queue",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }
    const parsed = queueSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const idempotencyKey = (req.headers["idempotency-key"] as string | undefined)?.trim() || null;

    // Fetch the current package first — the idempotency key is scoped to (package, key).
    const { data: latestPkg } = await supabase
      .from("build_delivery_packages")
      .select("id, status, version, package_checksum, build_reference_number")
      .eq("intake_id", intakeId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (idempotencyKey && latestPkg) {
      const { data: existing } = await supabase
        .from("build_orchestrations")
        .select("*")
        .eq("package_id", (latestPkg as Record<string, unknown>).id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        res.status(200).json({ success: true, orchestration: existing, idempotent: true });
        return;
      }
    }

    // Immediate transactional gate — recheck eligibility with fresh package guarantee.
    const eligibility = await checkBuildEligibility(intakeId, {
      requirePackage: true,
      requirePackageFresh: true,
    });
    if (!eligibility.eligible || !eligibility.snapshot?.deliveryPackage) {
      res.status(409).json({
        success: false,
        error: "Intake is not eligible for build orchestration.",
        reason: eligibility.reason,
        detail: eligibility.detail,
      });
      return;
    }
    if (eligibility.snapshot.activeOrchestration) {
      res.status(409).json({
        success: false,
        error: "An active build orchestration already exists for this intake.",
        activeOrchestrationId: eligibility.snapshot.activeOrchestration.id,
        state: eligibility.snapshot.activeOrchestration.state,
      });
      return;
    }

    const pkg = eligibility.snapshot.deliveryPackage;
    const correlationId = newCorrelationId();

    const insertRow = {
      intake_id: intakeId,
      package_id: pkg.id,
      package_version: pkg.version,
      package_checksum: pkg.checksum,
      build_reference_number: eligibility.snapshot.buildReferenceNumber,
      state: "queued" as OrchestrationState,
      correlation_id: correlationId,
      requested_by: req.user?.id ?? null,
      reason: parsed.data.reason,
      idempotency_key: idempotencyKey,
      attempt: 1,
    };

    const { data: created, error: insertErr } = await supabase
      .from("build_orchestrations")
      .insert(insertRow)
      .select("*")
      .maybeSingle();

    if (insertErr || !created) {
      // Concurrent request may have taken the (package_id, idempotency_key)
      // slot or the (intake_id, non-terminal) uniqueness slot. Recover both.
      if (idempotencyKey) {
        const { data: retryIdem } = await supabase
          .from("build_orchestrations")
          .select("*")
          .eq("package_id", pkg.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (retryIdem) {
          res.status(200).json({ success: true, orchestration: retryIdem, idempotent: true });
          return;
        }
      }
      const { data: retryActive } = await supabase
        .from("build_orchestrations")
        .select("*")
        .eq("intake_id", intakeId)
        .in("state", ["queued", "in_progress", "blocked"])
        .maybeSingle();
      if (retryActive) {
        res.status(409).json({
          success: false,
          error: "An active build orchestration was created concurrently.",
          activeOrchestrationId: (retryActive as Record<string, unknown>).id,
        });
        return;
      }
      res.status(500).json({ success: false, error: "Failed to create orchestration record" });
      return;
    }

    // Advance intake commercial stage — best-effort, does not roll back the row.
    await supabase
      .from("intakes")
      .update({ commercial_stage: "build_queued", updated_at: new Date().toISOString() })
      .eq("id", intakeId);

    // Notify the worker seam AFTER the row is persisted.
    await notifyWorkerOfQueuedJob({
      orchestrationId: (created as Record<string, unknown>).id as string,
      correlationId,
      packageChecksum: pkg.checksum,
    });

    audit(
      intakeId,
      "build_queue_requested",
      {
        orchestrationId: (created as Record<string, unknown>).id,
        packageId: pkg.id,
        packageVersion: pkg.version,
        packageChecksum: pkg.checksum,
        correlationId,
        reason: parsed.data.reason,
      },
      req.user?.id ?? null,
    );

    res.status(201).json({
      success: true,
      orchestration: created,
      message:
        "Build queued. The build worker will consume this record. No payment has been captured by this action.",
    });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/build-orchestration/intakes/:intakeId
//   Retrieve current + historical orchestration state.
// ═══════════════════════════════════════════════════════════

buildOrchestrationRouter.get(
  "/intakes/:intakeId",
  requireRole("owner", "admin", "builder", "finance"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }
    const { data: rows } = await supabase
      .from("build_orchestrations")
      .select("*")
      .eq("intake_id", intakeId)
      .order("requested_at", { ascending: false });

    res.json({ success: true, orchestrations: rows ?? [] });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/build-orchestration/:orchestrationId
//   Retrieve one orchestration by id.
// ═══════════════════════════════════════════════════════════

buildOrchestrationRouter.get(
  "/:orchestrationId",
  requireRole("owner", "admin", "builder", "finance"),
  async (req: Request, res: Response) => {
    const orchId = parseUuid(req.params.orchestrationId);
    if (!orchId) {
      res.status(400).json({ success: false, error: "Invalid orchestration ID" });
      return;
    }
    const row = await loadOrchestrationById(orchId);
    if (!row) {
      res.status(404).json({ success: false, error: "Orchestration not found" });
      return;
    }
    res.json({ success: true, orchestration: row });
  },
);

// ═══════════════════════════════════════════════════════════
// PATCH /api/build-orchestration/:orchestrationId/status
//   Worker (internal service key) or admin. Advances state.
//   Rejects invalid transitions and lost races.
// ═══════════════════════════════════════════════════════════

const statusSchema = z.object({
  toState: z.enum(["in_progress", "blocked", "failed", "completed"]),
  correlationId: z.string().min(1).max(200).optional(),
  workerJobId: z.string().max(200).optional(),
  failureCode: z.string().max(200).optional(),
  failureDetail: z.string().max(4000).optional(),
  reason: z.string().max(2000).optional(),
});

buildOrchestrationRouter.patch(
  "/:orchestrationId/status",
  // Workers use the internal service key; admin retained for manual repair.
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const orchId = parseUuid(req.params.orchestrationId);
    if (!orchId) {
      res.status(400).json({ success: false, error: "Invalid orchestration ID" });
      return;
    }
    const parsed = statusSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const row = await loadOrchestrationById(orchId);
    if (!row) {
      res.status(404).json({ success: false, error: "Orchestration not found" });
      return;
    }
    if (parsed.data.correlationId && row.correlation_id !== parsed.data.correlationId) {
      res.status(409).json({ success: false, error: "Correlation id does not match orchestration record" });
      return;
    }

    const fromState = row.state as OrchestrationState;
    const toState = parsed.data.toState as OrchestrationState;

    const patch: Record<string, unknown> = {};
    if (parsed.data.workerJobId) patch.worker_job_id = parsed.data.workerJobId;
    if (parsed.data.failureCode) patch.failure_code = parsed.data.failureCode;
    if (parsed.data.failureDetail) patch.failure_detail = parsed.data.failureDetail;
    if (parsed.data.reason) patch.reason = parsed.data.reason;

    const result = await applyOrchestrationTransition({ id: orchId, fromState, toState, patch });
    if (!result.ok) {
      res
        .status(409)
        .json({ success: false, error: result.code === "invalid_transition" ? "Invalid state transition" : "Lost race — the orchestration was modified concurrently." });
      return;
    }

    await supabase
      .from("intakes")
      .update({ commercial_stage: commercialStageFor(toState), updated_at: new Date().toISOString() })
      .eq("id", row.intake_id as string);

    const eventMap: Record<string, string> = {
      in_progress: "build_started",
      blocked: "build_blocked",
      failed: "build_failed",
      completed: "build_completed",
    };
    audit(
      row.intake_id as string,
      eventMap[toState],
      {
        orchestrationId: orchId,
        priorState: fromState,
        resultingState: toState,
        correlationId: row.correlation_id,
        failureCode: parsed.data.failureCode ?? null,
      },
      req.user?.id,
    );

    res.status(200).json({ success: true, orchestration: result.row });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/build-orchestration/:orchestrationId/retry
//   Owner/admin. Creates a NEW orchestration row that references the failed
//   parent. Does not mutate the failed row. Requires the parent to be in
//   a terminal failed/blocked state.
// ═══════════════════════════════════════════════════════════

const retrySchema = z.object({
  reason: z.string().min(5).max(2000),
});

buildOrchestrationRouter.post(
  "/:orchestrationId/retry",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const orchId = parseUuid(req.params.orchestrationId);
    if (!orchId) {
      res.status(400).json({ success: false, error: "Invalid orchestration ID" });
      return;
    }
    const parsed = retrySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const parent = await loadOrchestrationById(orchId);
    if (!parent) {
      res.status(404).json({ success: false, error: "Parent orchestration not found" });
      return;
    }
    const parentState = parent.state as OrchestrationState;
    if (parentState !== "failed" && parentState !== "blocked") {
      res.status(409).json({
        success: false,
        error: `Cannot retry an orchestration in state '${parentState}'. Only failed or blocked orchestrations may be retried.`,
      });
      return;
    }

    // If parent is 'blocked' (non-terminal) we must cancel it first to free
    // the (intake_id, non-terminal) uniqueness slot.
    if (parentState === "blocked") {
      const cancel = await applyOrchestrationTransition({
        id: orchId,
        fromState: "blocked",
        toState: "cancelled",
        patch: { reason: "Cancelled by retry-request; superseded by new attempt." },
      });
      if (!cancel.ok) {
        res.status(409).json({ success: false, error: "Failed to free the blocked orchestration slot; refresh and try again." });
        return;
      }
    }

    // Recheck eligibility — the package must still be current.
    const eligibility = await checkBuildEligibility(parent.intake_id as string, {
      requirePackage: true,
      requirePackageFresh: true,
    });
    if (!eligibility.eligible || !eligibility.snapshot?.deliveryPackage) {
      res.status(409).json({
        success: false,
        error: "Retry rejected: intake is no longer eligible.",
        reason: eligibility.reason,
        detail: eligibility.detail,
      });
      return;
    }

    const pkg = eligibility.snapshot.deliveryPackage;
    const correlationId = newCorrelationId();

    const insertRow = {
      intake_id: parent.intake_id,
      package_id: pkg.id,
      package_version: pkg.version,
      package_checksum: pkg.checksum,
      build_reference_number: eligibility.snapshot.buildReferenceNumber,
      state: "queued" as OrchestrationState,
      correlation_id: correlationId,
      requested_by: req.user?.id ?? null,
      reason: parsed.data.reason,
      attempt: ((parent.attempt as number) ?? 1) + 1,
      parent_orchestration_id: orchId,
    };

    const { data: created, error: insertErr } = await supabase
      .from("build_orchestrations")
      .insert(insertRow)
      .select("*")
      .maybeSingle();

    if (insertErr || !created) {
      res.status(409).json({
        success: false,
        error: "Failed to create retry orchestration — another active orchestration may exist.",
      });
      return;
    }

    await supabase
      .from("intakes")
      .update({ commercial_stage: "build_queued", updated_at: new Date().toISOString() })
      .eq("id", parent.intake_id as string);

    await notifyWorkerOfQueuedJob({
      orchestrationId: (created as Record<string, unknown>).id as string,
      correlationId,
      packageChecksum: pkg.checksum,
    });

    audit(
      parent.intake_id as string,
      "build_retry_requested",
      {
        parentOrchestrationId: orchId,
        newOrchestrationId: (created as Record<string, unknown>).id,
        correlationId,
        attempt: insertRow.attempt,
        reason: parsed.data.reason,
      },
      req.user?.id ?? null,
    );

    res.status(201).json({ success: true, orchestration: created });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/build-orchestration/:orchestrationId/cancel
//   Owner/admin. Cancels a non-terminal orchestration.
// ═══════════════════════════════════════════════════════════

const cancelSchema = z.object({
  reason: z.string().min(5).max(2000),
});

buildOrchestrationRouter.post(
  "/:orchestrationId/cancel",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const orchId = parseUuid(req.params.orchestrationId);
    if (!orchId) {
      res.status(400).json({ success: false, error: "Invalid orchestration ID" });
      return;
    }
    const parsed = cancelSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const row = await loadOrchestrationById(orchId);
    if (!row) {
      res.status(404).json({ success: false, error: "Orchestration not found" });
      return;
    }
    const fromState = row.state as OrchestrationState;
    const result = await applyOrchestrationTransition({
      id: orchId,
      fromState,
      toState: "cancelled",
      patch: { reason: parsed.data.reason },
    });
    if (!result.ok) {
      res.status(409).json({
        success: false,
        error:
          result.code === "invalid_transition"
            ? `Cannot cancel an orchestration in state '${fromState}'.`
            : "Concurrent update — refresh and try again.",
      });
      return;
    }

    await supabase
      .from("intakes")
      .update({ commercial_stage: "build_cancelled", updated_at: new Date().toISOString() })
      .eq("id", row.intake_id as string);

    audit(
      row.intake_id as string,
      "build_cancelled",
      { orchestrationId: orchId, priorState: fromState, reason: parsed.data.reason },
      req.user?.id,
    );

    res.status(200).json({ success: true, orchestration: result.row });
  },
);

// Export for latest-only convenience read used by the console.
export async function getLatestOrchestration(intakeId: string) {
  return loadLatestOrchestration(intakeId);
}
