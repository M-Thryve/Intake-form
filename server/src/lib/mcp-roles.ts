import type {
  IntakeValidationOutput,
  AssetReadinessOutput,
  ScopeAnalysisOutput,
  PricingTimelineOutput,
  BuildCardOutput,
  SanitizedIntakeContext,
  McpRole,
  McpRunStatus,
} from "./mcp-contracts.js";
import {
  intakeValidationOutputSchema,
  assetReadinessOutputSchema,
  scopeAnalysisOutputSchema,
  pricingTimelineOutputSchema,
  buildCardOutputSchema,
} from "./mcp-contracts.js";
import { buildAssetSnapshots } from "./mcp-sanitization.js";

type AssetSnapshot = Awaited<ReturnType<typeof buildAssetSnapshots>>[number];

// ═══════════════════════════════════════════════════════════
// Intake Validation MCP
// ═══════════════════════════════════════════════════════════

export function runIntakeValidation(
  context: SanitizedIntakeContext,
): IntakeValidationOutput {
  const findings: IntakeValidationOutput["findings"] = [];
  const tierWarnings: string[] = [];
  const missingInformation: string[] = [];

  if (!context.project.projectName || context.project.projectName.length < 3) {
    findings.push({ code: "IV001", severity: "blocker", field: "project.projectName", message: "Project name is too short or missing" });
    missingInformation.push("Project name");
  }

  if (!context.project.industry || context.project.industry === "none") {
    findings.push({ code: "IV002", severity: "warning", field: "project.industry", message: "Industry not specified" });
    missingInformation.push("Industry");
  }

  if (context.tier === "template" && !context.template) {
    findings.push({ code: "IV003", severity: "blocker", field: "template", message: "Template selection required for template tier" });
    missingInformation.push("Template selection");
  }

  if (context.tier === "enterprise" && !context.enterprise) {
    findings.push({ code: "IV004", severity: "blocker", field: "enterprise", message: "Enterprise requirements required" });
    missingInformation.push("Enterprise requirements");
  }

  if (context.content.featureCount === 0) {
    findings.push({ code: "IV005", severity: "blocker", field: "content.features", message: "No features specified" });
    missingInformation.push("Features");
  }

  if (context.payment.voucherCode) {
    findings.push({ severity: "info", code: "IV006", field: "payment.voucherCode", message: "Voucher code present — requires verification" });
  }

  if (context.tier === "template" && context.assets.qualification === "no-assets") {
    tierWarnings.push("Template tier typically requires client assets. Consider requesting assets before Build Card.");
  }

  if (context.tier === "enterprise" && context.content.featureCount < 3) {
    tierWarnings.push("Enterprise tier has unusually few features. Verify requirements with client.");
  }

  if (context.tier === "enterprise" && context.content.features.every((f) => f.priority !== "Required")) {
    tierWarnings.push("No features marked as Required for an Enterprise build — priorities may need review.");
  }

  const hasBlocker = findings.some((f) => f.severity === "blocker");

  const validationStatus: "valid" | "incomplete" | "inconsistent" = hasBlocker
    ? "incomplete"
    : tierWarnings.length > 0
      ? "inconsistent"
      : "valid";

  const recommendation = validationStatus === "valid"
    ? "Intake is complete and consistent. Ready for scope analysis."
    : validationStatus === "inconsistent"
      ? "Intake is consistent but has warnings. Review in Factory Console."
      : "Intake is incomplete. Request missing information before proceeding.";

  const result = {
    validatedAt: new Date().toISOString(),
    validationStatus,
    findings,
    tierWarnings,
    missingInformation,
    recommendation,
    is_scoped_to_tier: true as const,
  };

  return intakeValidationOutputSchema.parse(result);
}

// ═══════════════════════════════════════════════════════════
// Asset Readiness MCP
// ═══════════════════════════════════════════════════════════

type McpSnapshot = { id: string; filename: string; assetStatus: string; scanStatus: string };

export function runAssetReadiness(
  context: SanitizedIntakeContext,
  assets: McpSnapshot[],
): AssetReadinessOutput {
  const counts = { pending: 0, uploaded: 0, scanning: 0, ready: 0, rejected: 0, failed: 0 };

  for (const a of assets) {
    const s = a.assetStatus as keyof typeof counts;
    if (s in counts) counts[s]++;
  }

  const warnings: string[] = [];
  const missingRequiredAssets: string[] = [];

  if (context.assets.qualification !== "no-assets" && assets.length === 0) {
    warnings.push("This build expects assets but none have been uploaded.");
    missingRequiredAssets.push("No assets uploaded despite asset requirement");
  }

  if (counts.pending > 0 || counts.uploaded > 0 || counts.scanning > 0) {
    warnings.push(`${counts.pending + counts.uploaded + counts.scanning} asset(s) still in processing — not verified as safe.`);
  }

  if (counts.rejected > 0) {
    warnings.push(`${counts.rejected} asset(s) rejected during review. These must be addressed.`);
  }

  if (counts.failed > 0) {
    warnings.push(`${counts.failed} asset(s) failed to process. These must be re-uploaded.`);
  }

  let readinessStatus: "ready" | "partial" | "insufficient";
  if (assets.length === 0) {
    readinessStatus = "insufficient";
  } else if (counts.ready === assets.length) {
    readinessStatus = "ready";
  } else {
    readinessStatus = "partial";
  }

  const findings: AssetReadinessOutput["findings"] = [];

  if (counts.rejected > 0) {
    findings.push({
      code: "AR001",
      severity: "blocker",
      message: `${counts.rejected} assets rejected — cannot proceed without resolution or replacement`,
    });
  }

  if (counts.failed > 0) {
    findings.push({
      code: "AR002",
      severity: "warning",
      message: `${counts.failed} assets failed — may need re-upload before review`,
    });
  }

  const result = {
    evaluatedAt: new Date().toISOString(),
    readinessStatus,
    counts,
    missingRequiredAssets,
    warnings,
    findings,
    assetReferences: assets.map((a) => ({
      id: a.id,
      filename: a.filename,
      status: a.assetStatus,
    })),
  };

  return assetReadinessOutputSchema.parse(result);
}

// ═══════════════════════════════════════════════════════════
// Scope Analysis MCP
// ═══════════════════════════════════════════════════════════

export function runScopeAnalysis(
  context: SanitizedIntakeContext,
  assetReadiness: AssetReadinessOutput | null,
): ScopeAnalysisOutput {
  const isEnterprise = context.tier === "enterprise";
  const isTemplate = context.tier === "template";
  const scopeItems: string[] = [];
  const assumptions: string[] = [];
  const dependencies: string[] = [];
  const risks: ScopeAnalysisOutput["risks"] = [];
  const ambiguities: ScopeAnalysisOutput["ambiguities"] = [];

  if (isTemplate) {
    scopeItems.push("Implementation from selected template");
    scopeItems.push("Page-level content population");
    scopeItems.push("Color preset brand customization");
    if (context.template?.projectVersion === "both") {
      scopeItems.push("Desktop and mobile compatible interface");
      dependencies.push("Responsive design validation across target devices");
    } else if (context.template?.projectVersion === "desktop") {
      scopeItems.push("Desktop implementation only");
      assumptions.push("Mobile requirement is not needed at this time");
    }
  } else if (isEnterprise) {
    scopeItems.push("Full enterprise architecture design");
    scopeItems.push("Custom UI/UX development");
    scopeItems.push("Integration with existing systems");
    scopeItems.push("Enterprise security and compliance implementation");
    scopeItems.push("Scalability planning and infrastructure architecture");
    dependencies.push("Architecture review board approval gate");
    dependencies.push("Compliance audit and sign-off");
  } else {
    scopeItems.push("Custom-made implementation");
    scopeItems.push("Template-based customization with extended features");
  }

  if (context.content.pageCount > 10) {
    risks.push({ description: `Large page count (${context.content.pageCount}) — scope may expand during implementation`, severity: "warning" });
  }

  if (context.design.styleCount === 0) {
    // REV-05: Design step removed from intake — no longer an ambiguity.
    // Kept as informational: when styles happen to be present (legacy records),
    // the note is informational only.
    if (context.design.styleCount > 0) {
      // Only note it when styles ARE present but we want to confirm they're still relevant.
    }
  }

  if (assetReadiness && assetReadiness.readinessStatus !== "ready") {
    risks.push({ description: `Asset readiness is ${assetReadiness.readinessStatus} — replacement content may be needed during development`, severity: "warning" });
  }

  let recommendedComplexity: ScopeAnalysisOutput["recommendedComplexity"];
  let complexityRationale: string;

  if (isTemplate && context.content.featureCount <= 8) {
    recommendedComplexity = "simple";
    complexityRationale = "Standard template implementation with modest feature count.";
  } else if (isTemplate && context.content.featureCount <= 15) {
    recommendedComplexity = "moderate";
    complexityRationale = "Template-based with moderate feature scope — needs structured QA.";
  } else if (isEnterprise) {
    recommendedComplexity = "enterprise";
    complexityRationale = "Enterprise tier with architecture, compliance, and integration requirements.";
  } else {
    recommendedComplexity = "complex";
    complexityRationale = `Custom implementation with ${context.content.featureCount} features across ${context.content.pageCount} pages.`;
  }

  const result = {
    analyzedAt: new Date().toISOString(),
    scopeSummary: `${isEnterprise ? "Enterprise custom" : isTemplate ? "Template-based" : "Custom built"} web application with ${context.content.featureCount} features across ${context.content.pageCount} pages`,
    includedWork: scopeItems,
    assumptions,
    dependencies,
    risks,
    ambiguities,
    recommendedComplexity,
    complexityRationale,
    findings: [],
  };

  return scopeAnalysisOutputSchema.parse(result);
}

// ═══════════════════════════════════════════════════════════
// Pricing and Timeline MCP
// ═══════════════════════════════════════════════════════════

function tierPricingFactors(tier: "template" | "custom" | "enterprise") {
  switch (tier) {
    case "template":
      return { base: 15000, perFeature: 2000, perPage: 1000 };
    case "custom":
      return { base: 30000, perFeature: 3000, perPage: 1500 };
    case "enterprise":
      return { base: 90000, perFeature: 8000, perPage: 4000 };
  }
}

function weeklyEstimateFactors(tier: "template" | "custom" | "enterprise") {
  switch (tier) {
    case "template":
      return { baseWeeks: 2, weeksPerFeature: 0.3, weeksPerPage: 0.15 };
    case "custom":
      return { baseWeeks: 4, weeksPerFeature: 0.5, weeksPerPage: 0.25 };
    case "enterprise":
      return { baseWeeks: 8, weeksPerFeature: 0.8, weeksPerPage: 0.5 };
  }
}

export function runPricingTimeline(
  context: SanitizedIntakeContext,
  _scopeAnalysis: ScopeAnalysisOutput | null,
): PricingTimelineOutput {
  const pf = tierPricingFactors(context.tier);
  const tf = weeklyEstimateFactors(context.tier);

  const raw = pf.base + pf.perFeature * context.content.featureCount + pf.perPage * context.content.pageCount;
  const rawWeeks = tf.baseWeeks + tf.weeksPerFeature * context.content.featureCount + tf.weeksPerPage * context.content.pageCount;

  const lower = Math.floor(raw * 0.8 / 5000) * 5000;
  const upper = Math.ceil(raw * 1.3 / 5000) * 5000;
  const rec = Math.round(raw / 5000) * 5000;

  const minWeeks = Math.max(1, Math.floor(rawWeeks * 0.7));
  const maxWeeks = Math.ceil(rawWeeks * 1.4);
  const recWeeks = Math.round(rawWeeks);

  let conf: "low" | "medium" | "high";
  let confNotes: string;
  if (context.tier === "template" && context.content.featureCount <= 10) {
    conf = "high";
    confNotes = "Template-based with limited features — high pricing confidence.";
  } else if (context.tier === "enterprise") {
    conf = "low";
    confNotes = "Enterprise builds require architecture review before accurate pricing. Range is indicative only.";
  } else {
    conf = "medium";
    confNotes = "Custom build with moderate certainty. Final pricing requires owner review.";
  }

  return {
    estimatedAt: new Date().toISOString(),
    isPreliminary: true as const,
    preliminaryEstimatePhp: { minimum: lower, maximum: upper, recommended: rec },
    preliminaryTimeline: { minimumWeeks: minWeeks, maximumWeeks: maxWeeks, recommendedWeeks: recWeeks },
    estimateAssumptions: [
      "Prices are preliminary and subject to revision by the human owner gate",
      "Based on tier-level multipliers and feature count — fine details may shift the range",
      "Maintenance and ongoing support are not included in this preliminary estimate",
    ],
    confidenceLevel: conf,
    confidenceNotes: confNotes,
    inputsUsed: [
      `Tier: ${context.tier}`,
      `Features: ${context.content.featureCount}`,
      `Pages: ${context.content.pageCount}`,
    ],
    priceComponents: [
      { label: "Base platform development", description: `Tier: ${context.tier}`, estimatedAmountPhp: pf.base },
      { label: "Feature implementation", description: `${context.content.featureCount} features`, estimatedAmountPhp: pf.perFeature * context.content.featureCount },
      { label: "Page content setup", description: `${context.content.pageCount} pages`, estimatedAmountPhp: pf.perPage * context.content.pageCount },
    ],
  };
}

// ═══════════════════════════════════════════════════════════
// Build Card MCP
// ═══════════════════════════════════════════════════════════

export function runBuildCard(params: {
  context: SanitizedIntakeContext;
  validation: IntakeValidationOutput | null;
  assetReadiness: AssetReadinessOutput | null;
  scope: ScopeAnalysisOutput | null;
  pricingTimeline: PricingTimelineOutput | null;
  mcpRunRefs: Array<{ role: McpRole; runId: string; status: McpRunStatus }>;
}): BuildCardOutput {
  const hasFailures = params.mcpRunRefs.some((r) => r.status === "failed" || r.status === "timed_out");
  const hasPartial = params.mcpRunRefs.some((r) => r.status !== "completed");
  const analysisStatus: "complete" | "partial" | "failed" = hasFailures ? "failed" : hasPartial ? "partial" : "complete";

  const risks: string[] = [];
  if (params.scope?.risks) {
    risks.push(...params.scope.risks.map((r) => r.description));
  }
  if (params.pricingTimeline?.confidenceLevel === "low") {
    risks.push("Pricing and timeline estimates have low confidence — enterprise builds require additional review.");
  }

  const openQuestions: string[] = [];
  if (params.assetReadiness?.warnings && params.assetReadiness.warnings.length > 0) {
    openQuestions.push("Assets need attention — processing/rejected/failed items exist");
  }
  if (params.validation?.missingInformation && params.validation.missingInformation.length > 0) {
    openQuestions.push("Unanswered: " + params.validation.missingInformation.join(", "));
  }
  if (params.scope?.ambiguities && params.scope.ambiguities.length > 0) {
    openQuestions.push(...params.scope.ambiguities.map((a) => `${a.topic}: ${a.question}`));
  }

  const totalAssetCount = params.assetReadiness
    ? Object.values(params.assetReadiness.counts).reduce((a, b) => a + b, 0)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    status: "waiting_owner_review",
    buildReferenceNumber: params.context.buildReferenceNumber,
    clientSummary: {
      name: "[client name — available in full intake]",
      company: params.context.client.company,
      industry: params.context.project.industry,
    },
    projectSummary: {
      name: params.context.project.projectName,
      type: params.context.project.projectType,
      description: params.context.project.businessDescription,
    },
    tier: params.context.tier,
    scopeSummary: params.scope?.scopeSummary || "Scope analysis not available",
    assetReadinessSummary: {
      status: params.assetReadiness?.readinessStatus ?? "unknown",
      readyCount: params.assetReadiness?.counts.ready ?? 0,
      totalCount: totalAssetCount,
      notes: params.assetReadiness?.warnings ?? [],
    },
    preliminaryPricing: params.pricingTimeline
      ? {
          rangePhp: `PHP ${params.pricingTimeline.preliminaryEstimatePhp.minimum.toLocaleString()} - PHP ${params.pricingTimeline.preliminaryEstimatePhp.maximum.toLocaleString()}`,
          estimatedTimeline: `${params.pricingTimeline.preliminaryTimeline.minimumWeeks}-${params.pricingTimeline.preliminaryTimeline.maximumWeeks} weeks`,
          confidence: params.pricingTimeline.confidenceLevel,
        }
      : { rangePhp: "Estimate not yet available", estimatedTimeline: "Not available", confidence: "n/a" },
    risks: risks.length > 0 ? risks : ["No significant risks identified"],
    openQuestions: openQuestions.length > 0 ? openQuestions : ["No pending questions"],
    mcpRunReferences: params.mcpRunRefs,
    analysisStatus,
    ownerReviewRequired: true as const,
    version: "1.0.0",
  };
}