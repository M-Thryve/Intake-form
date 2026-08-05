import { createHash } from "crypto";
import { supabase } from "./supabase.js";
import type { BuildEligibilitySnapshot } from "./build-eligibility.js";

export interface DeliveryPackagePayload {
  buildReferenceNumber: string;
  intakeId: string;
  packageVersion: number;
  createdAt: string;
  client: {
    id: string | null;
    name: string | null;
    contactEmail: string | null;
    industry: string | null;
  };
  project: {
    name: string | null;
    tier: string | null;
    projectType: string | null;
    templateKey: string | null;
    projectVersion: string | null;
    description: string | null;
  };
  scope: {
    features: Array<{ name: string; priority: string | null }>;
    approvedPages: string[];
    designStyles: string[];
    enterprise: Record<string, unknown> | null;
  };
  contentAndDesign: {
    pageContentSummaries: Array<{ page: string; hasContent: boolean }>;
    contentReadiness: "ready" | "partial" | "not_provided";
  };
  assets: {
    total: number;
    ready: number;
    blocked: number;
    excluded: number;
    manifest: Array<{
      id: string;
      fileName: string;
      storagePath: string;
      mimeType: string | null;
      scanStatus: string;
      sizeBytes: number | null;
    }>;
    unresolvedBlockers: string[];
  };
  buildCard: {
    id: string;
    version: number;
    preliminaryPricePhp: number | null;
    preliminaryTimelineDays: number | null;
    complexityLabel: string | null;
    summary: string | null;
    status: string;
  };
  commercial: {
    agreementDraftId: string;
    agreementDraftVersion: number;
    agreementStatus: string;
    finalPricePhp: number | null;
    discountAmountPhp: number | null;
    paymentPlan: string | null;
    maintenanceRatePhp: number | null;
    maintenanceEndAcknowledged: boolean;
    voucher: {
      code: string | null;
      status: string | null;
      discountAmountPhp: number | null;
    } | null;
  };
  assumptionsAndExclusions: {
    assumptions: string[];
    exclusions: string[];
    risks: string[];
    dependencies: string[];
    openIssues: string[];
  };
  approvals: {
    ownerDecisionId: string;
    ownerDecisionAt: string;
    reviewedBuildCardVersion: string | null;
    reviewedAnalysisVersion: string | null;
  };
  analysisReferences: Array<{
    role: string;
    status: string;
    version: string | null;
    completedAt: string | null;
  }>;
  disclaimers: string[];
  // Excluded per contract:
  //   no service-role keys, no bucket credentials, no signed URL tokens,
  //   no unrelated client records, no unrestricted storage paths.
}

/**
 * Deterministic canonical JSON serializer so the same payload always hashes
 * to the same value. JSON.stringify with sort applied recursively.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
  return `{${parts.join(",")}}`;
}

export function computePackageChecksum(payload: DeliveryPackagePayload): string {
  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}

interface DraftRow {
  id: string;
  version: number;
  status: string;
  draft_package: Record<string, unknown> | null;
  final_price_php: number | null;
  discount_amount_php: number | null;
  voucher_redemption_id: string | null;
  reviewed_analysis_version: string | null;
  build_reference_number: string;
}

interface BuildCardDetailRow {
  id: string;
  version: number;
  status: string;
  preliminary_price_php: number | null;
  preliminary_timeline_days: number | null;
  complexity_label: string | null;
  summary: string | null;
}

interface McpRunSummary {
  server_role: string;
  status: string;
  version: string | null;
  completed_at: string | null;
}

interface AssetRow {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  scan_status: string;
  size_bytes: number | null;
}

/**
 * Assembles the frozen delivery-package payload.
 * The caller MUST have passed a fresh checkBuildEligibility snapshot.
 *
 * We DO NOT copy raw storage paths for the client — the manifest uses the
 * internal storage_path so authorized asset endpoints can mint scoped URLs
 * on request. Signed URLs / tokens are never embedded in the package.
 */
export async function buildDeliveryPackagePayload(args: {
  intakeId: string;
  version: number;
  snapshot: BuildEligibilitySnapshot;
}): Promise<DeliveryPackagePayload> {
  const { intakeId, version, snapshot } = args;

  // Reads are performed sequentially so that per-table failures surface with
  // clear stack traces and callers/tests can reason about ordering. Each read
  // hits Supabase over a warm connection and completes in a few ms; the
  // freeze operation is not on any latency-sensitive path.
  const { data: intakeRow } = await supabase
    .from("intakes")
    .select("id, project_name, industry, project_type, business_description, tier, client_id")
    .eq("id", intakeId)
    .maybeSingle();

  const intake = intakeRow as Record<string, unknown> | null;
  const clientId = (intake?.client_id as string | null) ?? null;

  const { data: clientRow } = clientId
    ? await supabase
        .from("clients")
        .select("id, full_name, company, email")
        .eq("id", clientId)
        .maybeSingle()
    : { data: null };
  const { data: templateSel } = await supabase
    .from("intake_template_selections")
    .select("template_id, project_version, color_preset")
    .eq("intake_id", intakeId)
    .maybeSingle();
  const { data: enterprise } = await supabase
    .from("intake_enterprise_requirements")
    .select("*")
    .eq("intake_id", intakeId)
    .maybeSingle();
  const { data: features } = await supabase
    .from("intake_features")
    .select("feature_name, priority")
    .eq("intake_id", intakeId);
  const { data: design } = await supabase
    .from("intake_design_preferences")
    .select("style_key")
    .eq("intake_id", intakeId);
  const { data: payment } = await supabase
    .from("intake_payment_preferences")
    .select("payment_plan, maintenance_rate_php, maintenance_end_acknowledged, billing_schedule_note")
    .eq("intake_id", intakeId)
    .maybeSingle();
  const { data: buildCardDetail } = await supabase
    .from("build_cards")
    .select("id, version, status, preliminary_price_php, preliminary_timeline_days, complexity_label, summary")
    .eq("id", snapshot.buildCard.id)
    .maybeSingle();
  const { data: draftRow } = await supabase
    .from("agreement_drafts")
    .select(
      "id, version, status, draft_package, final_price_php, discount_amount_php, voucher_redemption_id, reviewed_analysis_version, build_reference_number",
    )
    .eq("id", snapshot.agreementDraft.id)
    .maybeSingle();
  const { data: voucherRedemption } = await supabase
    .from("intake_voucher_redemptions")
    .select("submitted_code, verification_status, discount_amount_php")
    .eq("intake_id", intakeId)
    .eq("verification_status", "valid")
    .maybeSingle();
  const { data: assets } = await supabase
    .from("uploaded_assets")
    .select("id, file_name, storage_path, mime_type, scan_status, size_bytes")
    .eq("intake_id", intakeId);
  const { data: mcpRuns } = await supabase
    .from("mcp_runs")
    .select("server_role, status, version, completed_at")
    .eq("intake_id", intakeId)
    .order("completed_at", { ascending: false });
  const { data: pages } = await supabase
    .from("intake_page_contents")
    .select("page_name")
    .eq("intake_id", intakeId);
  const { data: pageContents } = await supabase
    .from("intake_page_contents")
    .select("page_name, headline, body")
    .eq("intake_id", intakeId);

  const client = clientRow as Record<string, unknown> | null;
  const template = templateSel as Record<string, unknown> | null;
  const enterpriseRow = enterprise as Record<string, unknown> | null;
  const paymentRow = payment as Record<string, unknown> | null;
  const buildCard = buildCardDetail as BuildCardDetailRow | null;
  const draft = draftRow as DraftRow | null;
  const voucher = voucherRedemption as Record<string, unknown> | null;
  const assetRows = (assets ?? []) as AssetRow[];
  const mcpRows = (mcpRuns ?? []) as McpRunSummary[];
  const pageRows = (pages ?? []) as Array<{ page_name: string }>;
  const pageContentRows = (pageContents ?? []) as Array<{
    page_name: string;
    headline: string | null;
    body: string | null;
  }>;

  if (!draft || !buildCard) {
    throw new Error("build-package: required draft or build_card row is missing");
  }

  const readyAssets = assetRows.filter((r) => r.scan_status === "clean").length;
  const blockedAssets = assetRows.filter(
    (r) => r.scan_status === "blocked" || r.scan_status === "failed",
  ).length;
  const excludedAssets = assetRows.filter((r) => r.scan_status === "excluded").length;

  const uniquePages = Array.from(new Set(pageRows.map((r) => r.page_name).filter(Boolean)));

  const draftPkg = (draft.draft_package ?? {}) as Record<string, unknown>;
  const assumptionsBlock = (draftPkg.assumptionsAndExclusions ?? {}) as Record<string, unknown>;

  const analysisIssues = Array.isArray(assumptionsBlock.analysisIssues)
    ? (assumptionsBlock.analysisIssues as string[])
    : [];

  const pageContentReadiness: "ready" | "partial" | "not_provided" = (() => {
    if (pageContentRows.length === 0) return "not_provided";
    const withBody = pageContentRows.filter((r) => (r.body ?? "").trim().length > 0).length;
    if (withBody === 0) return "not_provided";
    if (withBody === pageContentRows.length) return "ready";
    return "partial";
  })();

  const now = new Date().toISOString();

  return {
    buildReferenceNumber: snapshot.buildReferenceNumber,
    intakeId,
    packageVersion: version,
    createdAt: now,
    client: {
      id: clientId,
      name: ((client?.full_name as string) ?? (client?.company as string)) ?? null,
      contactEmail: (client?.email as string) ?? null,
      industry: (intake?.industry as string) ?? null,
    },
    project: {
      name: (intake?.project_name as string) ?? null,
      tier: (intake?.tier as string) ?? null,
      projectType: (intake?.project_type as string) ?? null,
      templateKey: (template?.template_id as string) ?? null,
      projectVersion: (template?.project_version as string) ?? null,
      description: (intake?.business_description as string) ?? null,
    },
    scope: {
      features: (features ?? []).map((f) => ({
        name: (f as Record<string, unknown>).feature_name as string,
        priority: ((f as Record<string, unknown>).priority as string) ?? null,
      })),
      approvedPages: uniquePages,
      designStyles: (design ?? []).map((d) => (d as Record<string, unknown>).style_key as string),
      enterprise: enterpriseRow ?? null,
    },
    contentAndDesign: {
      pageContentSummaries: pageContentRows.map((r) => ({
        page: r.page_name,
        hasContent: Boolean((r.body ?? "").trim()),
      })),
      contentReadiness: pageContentReadiness,
    },
    assets: {
      total: assetRows.length,
      ready: readyAssets,
      blocked: blockedAssets,
      excluded: excludedAssets,
      manifest: assetRows.map((r) => ({
        id: r.id,
        fileName: r.file_name,
        storagePath: r.storage_path,
        mimeType: r.mime_type,
        scanStatus: r.scan_status,
        sizeBytes: r.size_bytes,
      })),
      unresolvedBlockers:
        blockedAssets > 0
          ? [`${blockedAssets} asset(s) failed scanning and require resolution or explicit exclusion.`]
          : [],
    },
    buildCard: {
      id: buildCard.id,
      version: buildCard.version,
      preliminaryPricePhp: buildCard.preliminary_price_php,
      preliminaryTimelineDays: buildCard.preliminary_timeline_days,
      complexityLabel: buildCard.complexity_label,
      summary: buildCard.summary,
      status: buildCard.status,
    },
    commercial: {
      agreementDraftId: draft.id,
      agreementDraftVersion: draft.version,
      agreementStatus: draft.status,
      finalPricePhp: draft.final_price_php,
      discountAmountPhp: draft.discount_amount_php,
      paymentPlan: (paymentRow?.payment_plan as string) ?? null,
      maintenanceRatePhp: (paymentRow?.maintenance_rate_php as number) ?? null,
      maintenanceEndAcknowledged: Boolean(paymentRow?.maintenance_end_acknowledged),
      voucher: voucher
        ? {
            code: (voucher.submitted_code as string) ?? null,
            status: (voucher.verification_status as string) ?? null,
            discountAmountPhp: (voucher.discount_amount_php as number) ?? null,
          }
        : null,
    },
    assumptionsAndExclusions: {
      assumptions: [
        "Prices and timeline reflect the finance-approved values on the referenced agreement draft version.",
        "Assets excluded from delivery are documented in the assets manifest.",
      ],
      exclusions: excludedAssets > 0 ? [`${excludedAssets} asset(s) explicitly excluded from build.`] : [],
      risks: analysisIssues,
      dependencies: [
        "Owner approval must remain current at queue time — a new decision invalidates this package.",
      ],
      openIssues:
        blockedAssets > 0
          ? [`${blockedAssets} unresolved asset scanning failures — must be resolved or accepted before queue.`]
          : [],
    },
    approvals: {
      ownerDecisionId: snapshot.ownerDecision.id,
      ownerDecisionAt: snapshot.ownerDecision.decidedAt,
      reviewedBuildCardVersion:
        (draftPkg.approval as Record<string, unknown> | undefined)?.reviewedBuildCardVersion as string ?? null,
      reviewedAnalysisVersion: draft.reviewed_analysis_version,
    },
    analysisReferences: mcpRows.map((r) => ({
      role: r.server_role,
      status: r.status,
      version: r.version,
      completedAt: r.completed_at,
    })),
    disclaimers: [
      "This delivery package is the approved baseline for build execution.",
      "Any material scope, price, or timeline change must return through the owner and finance workflow.",
      "Asset access is authorized separately and per-request; the manifest does not embed credentials or signed URLs.",
      "Queueing this package does not by itself capture payment or start deployment.",
    ],
  };
}
