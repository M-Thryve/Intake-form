import { z } from "zod";

// ── MCP Run Status ──
export const MCP_RUN_STATUS = z.enum(["queued", "running", "completed", "failed", "timed_out"]);
export type McpRunStatus = z.infer<typeof MCP_RUN_STATUS>;

// ── MCP Role ──
export const MCP_ROLE = z.enum([
  "intake_validation",
  "asset_readiness",
  "scope_analysis",
  "pricing_timeline",
  "build_card",
  "audit",
]);
export type McpRole = z.infer<typeof MCP_ROLE>;

// ── Finding Severity ──
export const FINDING_SEVERITY = z.enum(["info", "warning", "blocker"]);
export type FindingSeverity = z.infer<typeof FINDING_SEVERITY>;

// ── Common finding structure ──
export const mcpFindingSchema = z.object({
  code: z.string(),
  severity: FINDING_SEVERITY,
  field: z.string().optional(),
  message: z.string(),
});
export type McpFinding = z.infer<typeof mcpFindingSchema>;

// ── Input contract version (applies across all MCPs) ──
export const MCP_INPUT_VERSION = "1.0.0";

// ── Output contract versions per role ──
export const MCP_OUTPUT_VERSIONS: Record<McpRole, string> = {
  intake_validation: "1.0.0",
  asset_readiness: "1.0.0",
  scope_analysis: "1.0.0",
  pricing_timeline: "1.0.0",
  build_card: "1.0.0",
  audit: "1.0.0",
};

// ═══════════════════════════════════════════════════════════
// Intake Validation MCP Output
// ═══════════════════════════════════════════════════════════

export const intakeValidationOutputSchema = z.object({
  validatedAt: z.string(),
  validationStatus: z.enum(["valid", "incomplete", "inconsistent"]),
  findings: z.array(mcpFindingSchema),
  tierWarnings: z.array(z.string()),
  missingInformation: z.array(z.string()),
  recommendation: z.string(),
  is_scoped_to_tier: z.literal(true),
});
export type IntakeValidationOutput = z.infer<typeof intakeValidationOutputSchema>;

// ═══════════════════════════════════════════════════════════
// Asset Readiness MCP Output
// ═══════════════════════════════════════════════════════════

export const assetReadinessOutputSchema = z.object({
  evaluatedAt: z.string(),
  readinessStatus: z.enum(["ready", "partial", "insufficient"]),
  counts: z.object({
    pending: z.number().int().min(0),
    uploaded: z.number().int().min(0),
    scanning: z.number().int().min(0),
    ready: z.number().int().min(0),
    rejected: z.number().int().min(0),
    failed: z.number().int().min(0),
  }),
  missingRequiredAssets: z.array(z.string()),
  warnings: z.array(z.string()),
  findings: z.array(mcpFindingSchema),
  assetReferences: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    status: z.string(),
  })),
});
export type AssetReadinessOutput = z.infer<typeof assetReadinessOutputSchema>;

// ═══════════════════════════════════════════════════════════
// Scope Analysis MCP Output
// ═══════════════════════════════════════════════════════════

export const scopeAnalysisOutputSchema = z.object({
  analyzedAt: z.string(),
  scopeSummary: z.string(),
  includedWork: z.array(z.string()),
  assumptions: z.array(z.string()),
  dependencies: z.array(z.string()),
  risks: z.array(z.object({
    description: z.string(),
    severity: FINDING_SEVERITY,
    mitigation: z.string().optional(),
  })),
  ambiguities: z.array(z.object({
    topic: z.string(),
    question: z.string(),
    impact: z.string(),
  })),
  recommendedComplexity: z.enum(["simple", "moderate", "complex", "enterprise"]),
  complexityRationale: z.string(),
  findings: z.array(mcpFindingSchema),
});
export type ScopeAnalysisOutput = z.infer<typeof scopeAnalysisOutputSchema>;

// ═══════════════════════════════════════════════════════════
// Pricing and Timeline MCP Output
// ═══════════════════════════════════════════════════════════

export const pricingTimelineOutputSchema = z.object({
  estimatedAt: z.string(),
  isPreliminary: z.literal(true),
  preliminaryEstimatePhp: z.object({
    minimum: z.number().int().min(0),
    maximum: z.number().int().min(0),
    recommended: z.number().int().min(0),
  }),
  preliminaryTimeline: z.object({
    minimumWeeks: z.number().int().min(1),
    maximumWeeks: z.number().int().min(1),
    recommendedWeeks: z.number().int().min(1),
  }),
  estimateAssumptions: z.array(z.string()),
  confidenceLevel: z.enum(["low", "medium", "high"]),
  confidenceNotes: z.string(),
  inputsUsed: z.array(z.string()),
  priceComponents: z.array(z.object({
    label: z.string(),
    description: z.string(),
    estimatedAmountPhp: z.number().int().min(0),
  })),
});
export type PricingTimelineOutput = z.infer<typeof pricingTimelineOutputSchema>;

// ═══════════════════════════════════════════════════════════
// Build Card MCP Output
// ═══════════════════════════════════════════════════════════

export const buildCardOutputSchema = z.object({
  generatedAt: z.string(),
  status: z.enum(["preparing", "issued"]),
  buildReferenceNumber: z.string(),
  clientSummary: z.object({
    name: z.string(),
    company: z.string(),
    industry: z.string(),
  }),
  projectSummary: z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
  }),
  tier: z.enum(["template", "custom", "enterprise"]),
  scopeSummary: z.string(),
  assetReadinessSummary: z.object({
    status: z.string(),
    readyCount: z.number().int(),
    totalCount: z.number().int(),
    notes: z.array(z.string()),
  }),
  preliminaryPricing: z.object({
    rangePhp: z.string(),
    estimatedTimeline: z.string(),
    confidence: z.string(),
  }),
  risks: z.array(z.string()),
  openQuestions: z.array(z.string()),
  mcpRunReferences: z.array(z.object({
    role: MCP_ROLE,
    runId: z.string(),
    status: MCP_RUN_STATUS,
  })),
  analysisStatus: z.enum(["complete", "partial", "failed"]),
  ownerReviewRequired: z.literal(true),
  version: z.string(),
});
export type BuildCardOutput = z.infer<typeof buildCardOutputSchema>;

// ═══════════════════════════════════════════════════════════
// Sanitized Intake Context (what each MCP may receive)
// ═══════════════════════════════════════════════════════════

export const sanitizedIntakeContextSchema = z.object({
  intakeId: z.string().uuid(),
  buildReferenceNumber: z.string(),
  tier: z.enum(["template", "custom", "enterprise"]),
  client: z.object({
    company: z.string(),
  }),
  project: z.object({
    projectName: z.string(),
    industry: z.string(),
    projectType: z.string(),
    businessDescription: z.string(),
  }),
  assets: z.object({
    qualification: z.string(),
    serviceRequestedCount: z.number().int(),
    hasRequestedServices: z.boolean(),
  }),
  template: z.object({
    templateId: z.string().optional(),
    projectVersion: z.string().optional(),
    colorPreset: z.string().optional(),
  }).optional(),
  enterprise: z.object({
    projectVision: z.string(),
    targetUsers: z.string(),
    dataSecurityRequirements: z.string(),
    scalabilityRequirements: z.string(),
  }).optional(),
  content: z.object({
    featureCount: z.number().int(),
    pageCount: z.number().int(),
    features: z.array(z.object({
      name: z.string(),
      priority: z.string(),
      source: z.string(),
    })),
    pages: z.array(z.object({
      name: z.string(),
      fieldCount: z.number().int(),
    })),
  }),
  design: z.object({
    styleCount: z.number().int(),
  }),
  payment: z.object({
    plan: z.string(),
    voucherCode: z.string(),
  }),
});
export type SanitizedIntakeContext = z.infer<typeof sanitizedIntakeContextSchema>;