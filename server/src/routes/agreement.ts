import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js"
import { PAYMENT_DUE_NOTE } from "../lib/payments.js";
import { requireRole } from "../middleware/auth.js";
import { checkEligibility } from "../lib/agreement-eligibility.js";
import { buildAgreementPackage, nextVersionFor } from "../lib/agreement-draft.js";
import { validateVoucher, recordVoucherRedemption } from "../lib/voucher-service.js";

export const agreementRouter = Router();

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

async function loadLatestDraft(intakeId: string) {
  const { data } = await supabase
    .from("agreement_drafts")
    .select("*")
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

async function setCommercialStage(intakeId: string, stage: string, expectedPrior: string | null) {
  const now = new Date().toISOString();
  const query = supabase
    .from("intakes")
    .update({ commercial_stage: stage, updated_at: now })
    .eq("id", intakeId);
  if (expectedPrior === null) {
    const { error } = await query.is("commercial_stage", null);
    return !error;
  }
  const { error } = await query.eq("commercial_stage", expectedPrior);
  return !error;
}

// ═══════════════════════════════════════════════════════════
// GET /api/agreement/intakes/:intakeId  – latest draft + eligibility
// ═══════════════════════════════════════════════════════════

agreementRouter.get(
  "/intakes/:intakeId",
  requireRole("owner", "admin", "finance"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const eligibility = await checkEligibility(intakeId);
    const latest = await loadLatestDraft(intakeId);

    res.json({
      success: true,
      eligibility,
      draft: latest,
    });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/agreement/intakes/:intakeId  – create/get draft
// Idempotent via Idempotency-Key header.
// ═══════════════════════════════════════════════════════════

const createDraftSchema = z.object({
  notes: z.string().max(2000).optional(),
});

agreementRouter.post(
  "/intakes/:intakeId",
  requireRole("owner", "admin"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const parsed = createDraftSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const idempotencyKey = (req.headers["idempotency-key"] as string | undefined)?.trim() || null;

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("agreement_drafts")
        .select("*")
        .eq("intake_id", intakeId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        res.status(200).json({ success: true, draft: existing, idempotent: true });
        return;
      }
    }

    const eligibility = await checkEligibility(intakeId);
    if (!eligibility.eligible || !eligibility.snapshot) {
      res.status(409).json({
        success: false,
        error: "Intake is not eligible for agreement preparation.",
        reason: eligibility.reason,
        detail: eligibility.detail,
      });
      return;
    }

    const snapshot = eligibility.snapshot;
    const pkg = await buildAgreementPackage({ intakeId, snapshot });
    const version = await nextVersionFor(intakeId);

    // Mark any prior draft as superseded (best-effort; not a hard failure)
    await supabase
      .from("agreement_drafts")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("intake_id", intakeId)
      .neq("status", "superseded");

    const insertRow = {
      intake_id: intakeId,
      build_reference_number: snapshot.buildReferenceNumber,
      version,
      status: "draft",
      draft_package: pkg,
      preliminary_price_php: pkg.commercial.preliminaryPricePhp,
      final_price_php: null,
      discount_amount_php: pkg.commercial.discountAmountPhp,
      owner_decision_id: snapshot.approvalDecision.id,
      build_card_id: snapshot.buildCard.id,
      reviewed_build_card_version: snapshot.approvalDecision.reviewedBuildCardVersion,
      reviewed_analysis_version: snapshot.approvalDecision.reviewedAnalysisVersion,
      idempotency_key: idempotencyKey,
      created_by: req.user?.id ?? null,
    };

    const { data: created, error: insertErr } = await supabase
      .from("agreement_drafts")
      .insert(insertRow)
      .select("*")
      .maybeSingle();

    if (insertErr || !created) {
      // Retry-safe idempotency on unique index conflict
      if (idempotencyKey) {
        const { data: retry } = await supabase
          .from("agreement_drafts")
          .select("*")
          .eq("intake_id", intakeId)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (retry) {
          res.status(200).json({ success: true, draft: retry, idempotent: true });
          return;
        }
      }
      res.status(500).json({ success: false, error: "Failed to create agreement draft" });
      return;
    }

    await setCommercialStage(intakeId, "agreement_draft_pending", snapshot.commercialStage);

    audit(
      intakeId,
      version === 1 ? "agreement_draft_created" : "agreement_draft_versioned",
      {
        agreementDraftId: (created as Record<string, unknown>).id,
        version,
        buildReferenceNumber: snapshot.buildReferenceNumber,
        ownerDecisionId: snapshot.approvalDecision.id,
      },
      req.user?.id,
    );

    res.status(201).json({
      success: true,
      draft: created,
      message: `Agreement draft prepared. Not legally executed. No payment captured. No build started. ${PAYMENT_DUE_NOTE}`,
    });
  },
);

// ═══════════════════════════════════════════════════════════
// POST /api/agreement/intakes/:intakeId/voucher – validate + redeem
// ═══════════════════════════════════════════════════════════

const voucherSchema = z.object({
  voucherCode: z.string().min(1).max(64),
});

agreementRouter.post(
  "/intakes/:intakeId/voucher",
  requireRole("owner", "admin", "finance"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }

    const parsed = voucherSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const eligibility = await checkEligibility(intakeId);
    if (!eligibility.eligible || !eligibility.snapshot) {
      res.status(409).json({
        success: false,
        error: "Intake is not eligible for voucher redemption.",
        reason: eligibility.reason,
      });
      return;
    }

    const baseAmountPhp = eligibility.snapshot.buildCard.preliminaryPricePhp ?? 0;
    const validation = await validateVoucher({
      intakeId,
      submittedCode: parsed.data.voucherCode,
      baseAmountPhp,
    });

    const recorded = await recordVoucherRedemption({
      intakeId,
      submittedCode: parsed.data.voucherCode,
      validation,
      verifiedBy: req.user?.id ?? null,
    });

    audit(
      intakeId,
      validation.ok ? "voucher_redemption_recorded" : "voucher_rejected",
      {
        code: parsed.data.voucherCode,
        result: validation.code,
        discountAmountPhp: validation.discountAmountPhp ?? null,
        redemptionId: recorded.redemptionId ?? null,
      },
      req.user?.id,
    );

    if (!validation.ok) {
      res.status(422).json({
        success: false,
        error: validation.message,
        code: validation.code,
      });
      return;
    }

    res.status(200).json({
      success: true,
      validation,
      redemptionId: recorded.redemptionId,
      message: "Voucher recorded. Final commercial terms remain subject to finance approval.",
    });
  },
);

// ═══════════════════════════════════════════════════════════
// GET /api/agreement/intakes/:intakeId/versions – history
// ═══════════════════════════════════════════════════════════

agreementRouter.get(
  "/intakes/:intakeId/versions",
  requireRole("owner", "admin", "finance"),
  async (req: Request, res: Response) => {
    const intakeId = parseUuid(req.params.intakeId);
    if (!intakeId) {
      res.status(400).json({ success: false, error: "Invalid intake ID" });
      return;
    }
    const { data, error } = await supabase
      .from("agreement_drafts")
      .select("id, version, status, created_at, updated_at, created_by, preliminary_price_php, final_price_php, discount_amount_php")
      .eq("intake_id", intakeId)
      .order("version", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: "Failed to load draft history" });
      return;
    }
    res.json({ success: true, versions: data ?? [] });
  },
);
