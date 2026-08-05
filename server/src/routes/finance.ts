import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireRole } from "../middleware/auth.js";
import { checkEligibility } from "../lib/agreement-eligibility.js";

export const financeRouter = Router();

const AGREEMENT_STATUSES = [
  "draft",
  "pending_finance_review",
  "finance_changes_required",
  "finance_approved",
  "ready_for_build_handoff",
  "superseded",
] as const;

type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

// Allowed state transitions for finance actions.
const TRANSITION_MATRIX: Record<
  string,
  { from: AgreementStatus[]; to: AgreementStatus; stage: string }
> = {
  submit_for_review: {
    from: ["draft", "finance_changes_required"],
    to: "pending_finance_review",
    stage: "finance_review_pending",
  },
  approve: {
    from: ["pending_finance_review"],
    to: "finance_approved",
    stage: "finance_approved",
  },
  reject: {
    from: ["pending_finance_review", "finance_changes_required"],
    to: "finance_changes_required",
    stage: "finance_changes_required",
  },
  request_changes: {
    from: ["pending_finance_review"],
    to: "finance_changes_required",
    stage: "finance_changes_required",
  },
  mark_ready_for_build_handoff: {
    from: ["finance_approved"],
    to: "ready_for_build_handoff",
    stage: "ready_for_build_handoff",
  },
};

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

async function loadCurrentDraft(intakeId: string) {
  const { data } = await supabase
    .from("agreement_drafts")
    .select("*")
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

// ═══════════════════════════════════════════════════════════
// GET /api/finance/intakes/:intakeId  – finance handoff package
// ═══════════════════════════════════════════════════════════

financeRouter.get(
  "/intakes/:intakeId",
  requireRole("finance", "owner", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const draft = await loadCurrentDraft(intakeId);
    if (!draft) {
      res.status(404).json({
        success: false,
        error: "No agreement draft found. The owner must create the draft before finance review.",
      });
      return;
    }

    const [{ data: reviews }, { data: intakeRow }, { data: payment }] = await Promise.all([
      supabase
        .from("finance_reviews")
        .select("id, action, reason, adjustments, reviewed_by, reviewed_at, prior_status, resulting_status")
        .eq("intake_id", intakeId)
        .order("reviewed_at", { ascending: false }),
      supabase
        .from("intakes")
        .select("commercial_stage, build_reference_number, status")
        .eq("id", intakeId)
        .maybeSingle(),
      supabase
        .from("intake_payment_preferences")
        .select("payment_plan, maintenance_rate_php, maintenance_end_acknowledged, billing_schedule_note")
        .eq("intake_id", intakeId)
        .maybeSingle(),
    ]);

    audit(intakeId, "finance_package_viewed", { agreementDraftId: draft.id }, req.user?.id);

    res.json({
      success: true,
      handoff: {
        buildReferenceNumber: (intakeRow as Record<string, unknown> | null)?.build_reference_number ?? draft.build_reference_number,
        intakeStatus: (intakeRow as Record<string, unknown> | null)?.status ?? null,
        commercialStage: (intakeRow as Record<string, unknown> | null)?.commercial_stage ?? null,
        agreementDraft: draft,
        paymentPreferences: payment ?? null,
        reviewHistory: reviews ?? [],
        disclaimers: [
          "Approving this package does not capture payment.",
          "Approving this package does not start a build.",
          "Advancement to build execution requires the separate build-delivery handoff.",
        ],
      },
    });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/finance/intakes/:intakeId/submit  – finance submission gate
// Draft author (owner/admin) submits the draft for finance review.
// ═══════════════════════════════════════════════════════════

const submitSchema = z.object({
  reason: z.string().min(5).max(2000),
});

financeRouter.post(
  "/intakes/:intakeId/submit",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    await handleTransition(req, res, "submit_for_review", submitSchema);
  },
);

// ═══════════════════════════════════════════════════════════
// PATCH /api/finance/intakes/:intakeId/review  – finance decision
// Finance-only. Approve / reject / request-changes.
// ═══════════════════════════════════════════════════════════

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  reason: z.string().min(5).max(2000),
  adjustments: z
    .object({
      finalPricePhp: z.number().int().min(0).optional(),
      discountAmountPhp: z.number().int().min(0).optional(),
      finalTimelineDays: z.number().int().min(0).optional(),
    })
    .optional(),
});

financeRouter.patch(
  "/intakes/:intakeId/review",
  requireRole("finance", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }
    const parsed = reviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues,
      });
      return;
    }
    await applyTransition(req, res, {
      intakeId,
      transition: parsed.data.action,
      reason: parsed.data.reason,
      adjustments: parsed.data.adjustments ?? {},
    });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/finance/intakes/:intakeId/ready-for-build-handoff
// Owner/admin final gate – marks package ready for the LATER build-delivery handoff.
// This DOES NOT start a build.
// ═══════════════════════════════════════════════════════════

const readySchema = z.object({
  reason: z.string().min(5).max(2000),
});

financeRouter.post(
  "/intakes/:intakeId/ready-for-build-handoff",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    await handleTransition(req, res, "mark_ready_for_build_handoff", readySchema);
  },
);

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

async function handleTransition(
  req: Request,
  res: Response,
  transition: keyof typeof TRANSITION_MATRIX,
  schema: z.ZodTypeAny,
) {
  const intakeId = parseUuid(req.params.intakeId);
  if (!intakeId) {
    res.status(400).json({ success: false, error: "Invalid intake ID" });
    return;
  }
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      details: parsed.error.issues,
    });
    return;
  }
  await applyTransition(req, res, {
    intakeId,
    transition,
    reason: (parsed.data as { reason: string }).reason,
    adjustments: {},
  });
}

async function applyTransition(
  req: Request,
  res: Response,
  args: {
    intakeId: string;
    transition: keyof typeof TRANSITION_MATRIX;
    reason: string;
    adjustments: Record<string, unknown>;
  },
) {
  const eligibility = await checkEligibility(args.intakeId);
  if (!eligibility.eligible) {
    res.status(409).json({
      success: false,
      error: "Intake is no longer eligible. Owner approval may have been superseded.",
      reason: eligibility.reason,
      detail: eligibility.detail,
    });
    return;
  }

  const draft = await loadCurrentDraft(args.intakeId);
  if (!draft) {
    res.status(404).json({
      success: false,
      error: "No agreement draft exists. Owner must create the draft first.",
    });
    return;
  }

  const currentStatus = (draft.status as string) as AgreementStatus;
  const rule = TRANSITION_MATRIX[args.transition];
  if (!rule.from.includes(currentStatus)) {
    res.status(409).json({
      success: false,
      error: `Cannot ${args.transition} an agreement in '${currentStatus}' status. Allowed prior states: ${rule.from.join(", ")}.`,
    });
    return;
  }

  // Concurrency guard: update status only if it hasn't changed since we read it.
  const updates: Record<string, unknown> = {
    status: rule.to,
    updated_at: new Date().toISOString(),
  };

  const adjustments = args.adjustments as Record<string, unknown>;
  if (typeof adjustments.finalPricePhp === "number") {
    updates.final_price_php = adjustments.finalPricePhp;
  }
  if (typeof adjustments.discountAmountPhp === "number") {
    updates.discount_amount_php = adjustments.discountAmountPhp;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("agreement_drafts")
    .update(updates)
    .eq("id", draft.id)
    .eq("status", currentStatus)
    .select("id, status")
    .maybeSingle();

  if (updateErr || !updated) {
    res.status(409).json({
      success: false,
      error: "The agreement was modified concurrently. Refresh and try again.",
    });
    return;
  }

  const { error: reviewErr } = await supabase.from("finance_reviews").insert({
    intake_id: args.intakeId,
    agreement_draft_id: draft.id,
    action: args.transition,
    reason: args.reason,
    adjustments,
    reviewed_by: req.user?.id ?? null,
    prior_status: currentStatus,
    resulting_status: rule.to,
  });

  if (reviewErr) {
    // Roll back the status change to preserve auditability.
    await supabase
      .from("agreement_drafts")
      .update({ status: currentStatus })
      .eq("id", draft.id);
    res.status(500).json({ success: false, error: "Failed to record finance review" });
    return;
  }

  // Advance commercial_stage only if it lags. This is best-effort.
  await supabase
    .from("intakes")
    .update({ commercial_stage: rule.stage, updated_at: new Date().toISOString() })
    .eq("id", args.intakeId);

  const eventMap: Record<keyof typeof TRANSITION_MATRIX, string> = {
    submit_for_review: "finance_submitted_for_review",
    approve: "finance_approved",
    reject: "finance_rejected",
    request_changes: "finance_changes_requested",
    mark_ready_for_build_handoff: "ready_for_build_handoff",
  };

  audit(
    args.intakeId,
    eventMap[args.transition],
    {
      agreementDraftId: draft.id,
      priorStatus: currentStatus,
      resultingStatus: rule.to,
      adjustments,
    },
    req.user?.id,
  );

  const buildProtection =
    args.transition === "mark_ready_for_build_handoff"
      ? "Package marked ready for the separate build-delivery handoff. No build has been started. No payment has been captured."
      : "No payment captured. No build started.";

  res.status(200).json({
    success: true,
    agreementDraftId: draft.id,
    priorStatus: currentStatus,
    resultingStatus: rule.to,
    commercialStage: rule.stage,
    message: buildProtection,
  });
}
