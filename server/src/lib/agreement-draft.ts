import { supabase } from "./supabase.js";
import type { EligibilitySnapshot } from "./agreement-eligibility.js";

export type AgreementStatus =
  | "draft"
  | "pending_finance_review"
  | "finance_changes_required"
  | "finance_approved"
  | "ready_for_build_handoff"
  | "superseded";

export interface AgreementPackage {
  buildReferenceNumber: string;
  status: AgreementStatus;
  scope: {
    tier: string | null;
    projectName: string | null;
    industry: string | null;
    projectType: string | null;
    description: string | null;
    templateKey: string | null;
    projectVersion: string | null;
    enterprise: Record<string, unknown> | null;
    features: Array<{ name: string; priority: string | null }>;
    designStyles: string[];
    approvedPages: string[];
  };
  commercial: {
    preliminaryPricePhp: number | null;
    finalPricePhp: number | null;
    discountAmountPhp: number | null;
    paymentPlan: string | null;
    maintenanceRatePhp: number | null;
    maintenanceEndAcknowledged: boolean;
    isPreliminary: boolean;
    voucher: {
      code: string | null;
      status: string | null;
      discountAmountPhp: number | null;
    } | null;
  };
  delivery: {
    preliminaryTimelineDays: number | null;
    finalTimelineDays: number | null;
    isPreliminary: boolean;
  };
  assumptionsAndExclusions: {
    assetsBlocked: number;
    assetsReady: number;
    assetsTotal: number;
    analysisIssues: string[];
    ownerReasoning: string | null;
  };
  approval: {
    ownerDecisionId: string;
    decidedBy: string | null;
    decidedAt: string;
    reviewedBuildCardVersion: string | null;
    reviewedAnalysisVersion: string | null;
  };
  disclaimers: string[];
}

interface DraftContext {
  intakeId: string;
  snapshot: EligibilitySnapshot;
}

export async function buildAgreementPackage(ctx: DraftContext): Promise<AgreementPackage> {
  const intakeId = ctx.intakeId;

  const [
    { data: intake },
    { data: templateSel },
    { data: enterprise },
    { data: features },
    { data: design },
    { data: payment },
    { data: buildCardRow },
    { data: voucherRedemption },
    { data: assets },
    { data: mcpRuns },
    { data: pages },
  ] = await Promise.all([
    supabase.from("intakes").select("project_name, industry, project_type, business_description, tier").eq("id", intakeId).maybeSingle(),
    supabase.from("intake_template_selections").select("template_id, project_version, color_preset").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("intake_enterprise_requirements").select("*").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("intake_features").select("feature_name, priority, source").eq("intake_id", intakeId),
    supabase.from("intake_design_preferences").select("style_key").eq("intake_id", intakeId),
    supabase.from("intake_payment_preferences").select("*").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("build_cards").select("preliminary_price_php, preliminary_timeline_days, complexity_label, summary").eq("id", ctx.snapshot.buildCard.id).maybeSingle(),
    supabase.from("intake_voucher_redemptions").select("submitted_code, verification_status, discount_amount_php, voucher_id").eq("intake_id", intakeId).maybeSingle(),
    supabase.from("uploaded_assets").select("scan_status").eq("intake_id", intakeId),
    supabase.from("mcp_runs").select("server_role, status, error_message").eq("intake_id", intakeId),
    supabase.from("intake_page_contents").select("page_name").eq("intake_id", intakeId),
  ]);

  const intakeRow = intake as Record<string, unknown> | null;
  const template = templateSel as Record<string, unknown> | null;
  const enterpriseRow = enterprise as Record<string, unknown> | null;
  const paymentRow = payment as Record<string, unknown> | null;
  const buildCardData = buildCardRow as Record<string, unknown> | null;
  const voucherRow = voucherRedemption as Record<string, unknown> | null;
  const assetRows = (assets ?? []) as Array<Record<string, unknown>>;
  const mcpRows = (mcpRuns ?? []) as Array<Record<string, unknown>>;
  const pageRows = (pages ?? []) as Array<Record<string, unknown>>;

  const assetsBlocked = assetRows.filter((r) => r.scan_status === "blocked" || r.scan_status === "failed").length;
  const assetsReady = assetRows.filter((r) => r.scan_status === "clean").length;

  const analysisIssues = mcpRows
    .filter((r) => r.status === "failed" || r.status === "timed_out")
    .map((r) => `${r.server_role as string}: ${(r.error_message as string) || (r.status as string)}`);

  const uniquePages = Array.from(new Set(pageRows.map((r) => (r.page_name as string) ?? "").filter(Boolean)));

  const voucherPortion = voucherRow
    ? {
        code: (voucherRow.submitted_code as string) ?? null,
        status: (voucherRow.verification_status as string) ?? null,
        discountAmountPhp: (voucherRow.discount_amount_php as number) ?? null,
      }
    : null;

  return {
    buildReferenceNumber: ctx.snapshot.buildReferenceNumber,
    status: "draft",
    scope: {
      tier: (intakeRow?.tier as string) ?? null,
      projectName: (intakeRow?.project_name as string) ?? null,
      industry: (intakeRow?.industry as string) ?? null,
      projectType: (intakeRow?.project_type as string) ?? null,
      description: (intakeRow?.business_description as string) ?? null,
      templateKey: (template?.template_id as string) ?? null,
      projectVersion: (template?.project_version as string) ?? null,
      enterprise: enterpriseRow ?? null,
      features: (features ?? []).map((f) => ({
        name: (f as Record<string, unknown>).feature_name as string,
        priority: ((f as Record<string, unknown>).priority as string) ?? null,
      })),
      designStyles: (design ?? []).map((d) => (d as Record<string, unknown>).style_key as string),
      approvedPages: uniquePages,
    },
    commercial: {
      preliminaryPricePhp: (buildCardData?.preliminary_price_php as number) ?? ctx.snapshot.buildCard.preliminaryPricePhp,
      finalPricePhp: null,
      discountAmountPhp: voucherPortion?.discountAmountPhp ?? null,
      paymentPlan: (paymentRow?.payment_plan as string) ?? null,
      maintenanceRatePhp: (paymentRow?.maintenance_rate_php as number) ?? null,
      maintenanceEndAcknowledged: Boolean(paymentRow?.maintenance_end_acknowledged),
      isPreliminary: true,
      voucher: voucherPortion,
    },
    delivery: {
      preliminaryTimelineDays: (buildCardData?.preliminary_timeline_days as number) ?? null,
      finalTimelineDays: null,
      isPreliminary: true,
    },
    assumptionsAndExclusions: {
      assetsBlocked,
      assetsReady,
      assetsTotal: assetRows.length,
      analysisIssues,
      ownerReasoning: ctx.snapshot.approvalDecision.reason,
    },
    approval: {
      ownerDecisionId: ctx.snapshot.approvalDecision.id,
      decidedBy: ctx.snapshot.approvalDecision.decidedBy,
      decidedAt: ctx.snapshot.approvalDecision.decidedAt,
      reviewedBuildCardVersion: ctx.snapshot.approvalDecision.reviewedBuildCardVersion,
      reviewedAnalysisVersion: ctx.snapshot.approvalDecision.reviewedAnalysisVersion,
    },
    disclaimers: [
      "This document is a draft prepared for internal review. It is not a legally executed agreement.",
      "All prices, timelines, and inclusions marked preliminary are subject to finance confirmation.",
      "No payment has been captured. No build has been started.",
      "Advancement to build execution requires the separate build-delivery handoff and is not implied by this document.",
    ],
  };
}

export async function nextVersionFor(intakeId: string): Promise<number> {
  const { data } = await supabase
    .from("agreement_drafts")
    .select("version")
    .eq("intake_id", intakeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { version: number } | null;
  return row ? row.version + 1 : 1;
}
