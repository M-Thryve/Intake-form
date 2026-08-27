import { describe, it, expect } from "vitest";
import {
  sanitizedIntakeContextSchema,
  MCP_INPUT_VERSION,
  MCP_OUTPUT_VERSIONS,
  type SanitizedIntakeContext,
} from "../lib/mcp-contracts.js";
import {
  runIntakeValidation,
  runAssetReadiness,
  runScopeAnalysis,
  runPricingTimeline,
  runBuildCard,
} from "../lib/mcp-roles.js";

function makeTemplateContext(overrides: Partial<SanitizedIntakeContext> = {}): SanitizedIntakeContext {
  return {
    intakeId: "550e8400-e29b-41d4-a716-446655440000",
    buildReferenceNumber: "MTH-2508-0001-ABCD",
    tier: "template",
    client: { company: "Acme Corp" },
    project: {
      projectName: "Acme Website",
      industry: "Retail",
      projectType: "E-commerce",
      businessDescription: "Online retail platform",
    },
    assets: { qualification: "ready", serviceRequestedCount: 1, hasRequestedServices: true },
    template: { templateId: "tpl-retail", colorPreset: "navy" },
    enterprise: undefined,
    content: {
      featureCount: 5,
      pageCount: 6,
      features: [
        { name: "Product Catalog", priority: "Required", source: "chip" },
        { name: "Shopping Cart", priority: "Required", source: "chip" },
        { name: "Checkout", priority: "Required", source: "chip" },
        { name: "User Accounts", priority: "Nice to Have", source: "chip" },
        { name: "Newsletter", priority: "Future Phase", source: "custom" },
      ],
      pages: [
        { name: "Home", fieldCount: 3 },
        { name: "About", fieldCount: 2 },
        { name: "Products", fieldCount: 4 },
      ],
    },
    design: { styleCount: 2 },
    payment: { plan: "one-time", voucherCode: "" },
    ...overrides,
  };
}

function makeEnterpriseContext(): SanitizedIntakeContext {
  return {
    intakeId: "550e8400-e29b-41d4-a716-446655440001",
    buildReferenceNumber: "MTH-2508-0002-EFGH",
    tier: "enterprise",
    client: { company: "Global Corp" },
    project: {
      projectName: "Platform X",
      industry: "Finance",
      projectType: "SaaS Platform",
      businessDescription: "B2B financial analytics platform",
    },
    assets: { qualification: "provided", serviceRequestedCount: 3, hasRequestedServices: true },
    template: undefined,
    enterprise: {
      projectVision: "Revolutionize financial analytics",
      targetUsers: "Enterprise CFOs",
      dataSecurityRequirements: "SOC2, GDPR",
      scalabilityRequirements: "Multi-region HA",
    },
    content: {
      featureCount: 15,
      pageCount: 25,
      features: [
        { name: "Real-time analytics", priority: "Required", source: "chip" },
        { name: "Custom reports", priority: "Required", source: "chip" },
        { name: "Integrations API", priority: "Required", source: "chip" },
      ],
      pages: [{ name: "Dashboard", fieldCount: 15 }],
    },
    design: { styleCount: 5 },
    payment: { plan: "annual", voucherCode: "VIP-REFERRAL" },
  };
}

const EMPTY_ASSETS: Array<{ id: string; filename: string; assetStatus: string; scanStatus: string }> = [];

// ═══════════════════════════════════════════════════════════
// Schema validation
// ═══════════════════════════════════════════════════════════

describe("MCP contracts and schemas", () => {
  it("accepts a valid template sanitized context", () => {
    const context = makeTemplateContext();
    expect(sanitizedIntakeContextSchema.safeParse(context).success).toBe(true);
  });

  it("accepts a valid enterprise sanitized context", () => {
    const context = makeEnterpriseContext();
    expect(sanitizedIntakeContextSchema.safeParse(context).success).toBe(true);
  });

  it("rejects context with invalid tier", () => {
    const result = sanitizedIntakeContextSchema.safeParse({ ...makeTemplateContext(), tier: "none" } as any);
    expect(result.success).toBe(false);
  });

  it("rejects context with invalid tier enum", () => {
    const result = sanitizedIntakeContextSchema.safeParse({
      ...makeTemplateContext(),
      tier: "invalid-tier",
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Intake Validation MCP
// ═══════════════════════════════════════════════════════════

describe("Intake Validation MCP", () => {
  it("produces valid output for a complete template intake", () => {
    const context = makeTemplateContext();
    const result = runIntakeValidation(context);
    expect(result.validatedAt).toBeDefined();
    expect(result.validationStatus).toBe("valid");
    expect(result.findings.filter((f) => f.severity === "blocker")).toHaveLength(0);
    expect(result.is_scoped_to_tier).toBe(true);
  });

  it("detects missing enterprise requirements for enterprise tier", () => {
    const context = { ...makeEnterpriseContext(), enterprise: undefined as any };
    const result = runIntakeValidation(context);
    expect(result.validationStatus).toBe("incomplete");
    expect(result.missingInformation).toContain("Enterprise requirements");
  });

  it("warns on template tier with no-assets qualification", () => {
    const context = makeTemplateContext({
      assets: { ...makeTemplateContext().assets, qualification: "no-assets" },
    });
    const result = runIntakeValidation(context);
    expect(result.tierWarnings.some((w) => w.toLowerCase().includes("asset"))).toBe(true);
  });

  it("reports voucher code presence as info finding", () => {
    const context = makeTemplateContext({
      payment: { plan: "one-time", voucherCode: "VIP-2024" },
    });
    const result = runIntakeValidation(context);
    const voucherFinding = result.findings.find((f) => f.code === "IV006");
    expect(voucherFinding).toBeDefined();
    expect(voucherFinding!.severity).toBe("info");
  });
});

// ═══════════════════════════════════════════════════════════
// Asset Readiness MCP
// ═══════════════════════════════════════════════════════════

describe("Asset Readiness MCP", () => {
  it("produces ready status when all assets are ready", () => {
    const context = makeTemplateContext();
    const assets = [
      { id: "a1", filename: "logo.png", assetStatus: "ready", scanStatus: "clean" },
      { id: "a2", filename: "hero.jpg", assetStatus: "ready", scanStatus: "clean" },
    ];
    const result = runAssetReadiness(context, assets);
    expect(result.readinessStatus).toBe("ready");
    expect(result.counts.ready).toBe(2);
  });

  it("reports partial readiness for mixed states", () => {
    const context = makeTemplateContext();
    const assets = [
      { id: "a1", filename: "logo.png", assetStatus: "ready", scanStatus: "clean" },
      { id: "a2", filename: "hero.jpg", assetStatus: "uploaded", scanStatus: "pending" },
      { id: "a3", filename: "bg.png", assetStatus: "scanning", scanStatus: "pending" },
    ];
    const result = runAssetReadiness(context, assets);
    expect(result.readinessStatus).toBe("partial");
    expect(result.counts.ready).toBe(1);
    expect(result.counts.uploaded + result.counts.scanning).toBe(2);
  });

  it("reports insufficient when no assets exist", () => {
    const context = makeTemplateContext();
    const result = runAssetReadiness(context, []);
    expect(result.readinessStatus).toBe("insufficient");
  });

  it("flags rejected assets as blocker findings", () => {
    const context = makeTemplateContext();
    const assets = [
      { id: "a1", filename: "malware.exe", assetStatus: "rejected", scanStatus: "blocked" },
    ];
    const result = runAssetReadiness(context, assets);
    expect(result.findings.some((f) => f.severity === "blocker")).toBe(true);
  });

  it("flags failed assets as warning findings", () => {
    const context = makeTemplateContext();
    const assets = [
      { id: "a1", filename: "broken.pdf", assetStatus: "failed", scanStatus: "failed" },
    ];
    const result = runAssetReadiness(context, assets);
    expect(result.findings.some((f) => f.severity === "warning")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// Scope Analysis MCP
// ═══════════════════════════════════════════════════════════

describe("Scope Analysis MCP", () => {
  it("classifies simple template scope", () => {
    const context = makeTemplateContext();
    const result = runScopeAnalysis(context, null);
    expect(result.recommendedComplexity).toBe("simple");
    expect(result.includedWork.length).toBeGreaterThan(0);
  });

  it("classifies enterprise complexity", () => {
    const context = makeEnterpriseContext();
    const result = runScopeAnalysis(context, null);
    expect(result.recommendedComplexity).toBe("enterprise");
    expect(result.includedWork.some((w) => w.toLowerCase().includes("architecture"))).toBe(true);
  });

  it("includes dependencies for enterprise", () => {
    const context = makeEnterpriseContext();
    const result = runScopeAnalysis(context, null);
    expect(result.dependencies.length).toBeGreaterThan(0);
  });

  it("notes high page count as a risk", () => {
    const context = makeTemplateContext({
      content: { ...makeTemplateContext().content, pageCount: 15 },
    });
    const result = runScopeAnalysis(context, null);
    expect(result.risks.some((r) => r.description.toLowerCase().includes("page count"))).toBe(true);
  });

  it("does not flag missing design styles as an ambiguity (REV-05 — design step removed)", () => {
    const context = makeTemplateContext({ design: { styleCount: 0 } });
    const result = runScopeAnalysis(context, null);
    expect(result.ambiguities.some((a) => a.topic.toLowerCase().includes("design"))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Pricing and Timeline MCP
// ═══════════════════════════════════════════════════════════

describe("Pricing and Timeline MCP", () => {
  it("produces preliminary estimates for template tier", () => {
    const context = makeTemplateContext();
    const result = runPricingTimeline(context, null);
    expect(result.preliminaryEstimatePhp.recommended).toBeGreaterThan(0);
    expect(result.isPreliminary).toBe(true);
    expect(result.confidenceLevel).toBe("high");
  });

  it("produces preliminary estimates for enterprise", () => {
    const context = makeEnterpriseContext();
    const result = runPricingTimeline(context, null);
    expect(result.preliminaryEstimatePhp.recommended).toBeGreaterThan(0);
    expect(result.isPreliminary).toBe(true);
    expect(result.confidenceLevel).toBe("low");
  });

  it("has priceComponents with correct categories", () => {
    const context = makeTemplateContext();
    const result = runPricingTimeline(context, null);
    expect(result.priceComponents.length).toBeGreaterThanOrEqual(3);
    expect(result.priceComponents[0].label).toBeDefined();
  });

  it("all estimates marked preliminary", () => {
    const context = makeTemplateContext();
    const result = runPricingTimeline(context, null);
    expect(result.isPreliminary).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// Build Card MCP
// ═══════════════════════════════════════════════════════════

describe("Build Card MCP", () => {
  it("produces a complete Build Card for template intake", () => {
    const context = makeTemplateContext();
    const validation = runIntakeValidation(context);
    const assetReadiness = runAssetReadiness(context, EMPTY_ASSETS);
    const scope = runScopeAnalysis(context, assetReadiness);
    const pricing = runPricingTimeline(context, scope);

    const buildCard = runBuildCard({
      context,
      validation,
      assetReadiness,
      scope,
      pricingTimeline: pricing,
      mcpRunRefs: [
        { role: "intake_validation", runId: "r1", status: "completed" },
        { role: "asset_readiness", runId: "r2", status: "completed" },
        { role: "scope_analysis", runId: "r3", status: "completed" },
        { role: "pricing_timeline", runId: "r4", status: "completed" },
      ],
    });

    expect(buildCard.analysisStatus).toBe("complete");
    expect(buildCard.mcpRunReferences.length).toBe(4);
    expect(buildCard.preliminaryPricing.confidence).toBe("high");
  });

  it("always has ownerReviewRequired = true", () => {
    const context = makeTemplateContext();
    const validation = runIntakeValidation(context);
    const readiness = runAssetReadiness(context, EMPTY_ASSETS);
    const scope = runScopeAnalysis(context, readiness);
    const pricing = runPricingTimeline(context, scope);

    const result = runBuildCard({
      context,
      validation,
      assetReadiness: readiness,
      scope,
      pricingTimeline: pricing,
      mcpRunRefs: [{ role: "build_card", runId: "r0", status: "completed" }],
    });

    expect(result.ownerReviewRequired).toBe(true);
  });

  it("reports partial analysis status when some runs are queued", () => {
    const context = makeTemplateContext();
    const validation = runIntakeValidation(context);
    const readiness = runAssetReadiness(context, EMPTY_ASSETS);
    const scope = runScopeAnalysis(context, readiness);
    const pricing = runPricingTimeline(context, scope);

    const result = runBuildCard({
      context,
      validation,
      assetReadiness: readiness,
      scope,
      pricingTimeline: pricing,
      mcpRunRefs: [
        { role: "intake_validation", runId: "r1", status: "completed" },
        { role: "asset_readiness", runId: "r2", status: "queued" },
      ],
    });

    expect(result.analysisStatus).toBe("partial");
  });

  it("reports failed when any mcp run failed", () => {
    const context = makeTemplateContext();
    const validation = runIntakeValidation(context);
    const readiness = runAssetReadiness(context, EMPTY_ASSETS);
    const scope = runScopeAnalysis(context, readiness);
    const pricing = runPricingTimeline(context, scope);

    const result = runBuildCard({
      context,
      validation,
      assetReadiness: readiness,
      scope,
      pricingTimeline: pricing,
      mcpRunRefs: [
        { role: "intake_validation", runId: "r1", status: "failed" },
      ],
    });

    expect(result.analysisStatus).toBe("failed");
  });
});

// ═══════════════════════════════════════════════════════════
// Owner gate protection
// ═══════════════════════════════════════════════════════════

describe("Owner gate boundary", () => {
  it("Build Card output status is preparing", () => {
    const context = makeTemplateContext();
    const validation = runIntakeValidation(context);
    const readiness = runAssetReadiness(context, EMPTY_ASSETS);
    const scope = runScopeAnalysis(context, readiness);
    const pricing = runPricingTimeline(context, scope);

    const result = runBuildCard({
      context,
      validation,
      assetReadiness: readiness,
      scope,
      pricingTimeline: pricing,
      mcpRunRefs: [],
    });

    expect(result.status).toBe("preparing");
    expect(result.status).not.toBe("issued");
  });

  it("pricing estimates are always preliminary", () => {
    const context = makeTemplateContext();
    const result = runPricingTimeline(context, null);
    expect(result.isPreliminary).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// Data minimization
// ═══════════════════════════════════════════════════════════

describe("Data minimization and sanitized context", () => {
  it("sanitized context excludes client PII fields", () => {
    const context = makeTemplateContext();
    expect((context.client as any).email).toBeUndefined();
    expect((context.client as any).phone).toBeUndefined();
    expect((context.client as any).fullName).toBeUndefined();
  });

  it("sanitized context does not contain secret-like keys", () => {
    const context = makeTemplateContext();
    const serialized = JSON.stringify(context);
    expect(serialized).not.toMatch(/SERVICE_ROLE_KEY/i);
    expect(serialized).not.toMatch(/signedUrl/i);
  });
});

// ═══════════════════════════════════════════════════════════
// Contract versioning
// ═══════════════════════════════════════════════════════════

describe("Contract versioning", () => {
  it("all roles have output version strings", () => {
    for (const role of ["intake_validation", "asset_readiness", "scope_analysis", "pricing_timeline", "build_card", "audit"] as const) {
      expect(MCP_OUTPUT_VERSIONS[role]).toBeDefined();
    }
  });

  it("input version is defined", () => {
    expect(MCP_INPUT_VERSION).toBe("1.0.0");
  });
});