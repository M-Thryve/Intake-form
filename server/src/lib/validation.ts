import { z } from "zod";

const MAX_SHORT = 500;
const MAX_LONG = 5000;
const MAX_FEATURES = 100;
const MAX_PAGES = 50;

// ═══════════════════════════════════════════════════════════
// Shared field shapes — single source of truth for field
// definitions so draft and submit schemas never drift.
// ═══════════════════════════════════════════════════════════

const clientFields = {
  fullName: z.string().max(MAX_SHORT),
  company: z.string().max(MAX_SHORT),
  email: z.string().max(MAX_SHORT),
  phone: z.string().max(MAX_SHORT),
};

const projectFields = {
  projectName: z.string().max(MAX_SHORT),
  industry: z.string().max(MAX_SHORT),
  projectType: z.string().max(MAX_SHORT),
  businessDescription: z.string().max(MAX_LONG),
};

const assetsFields = {
  qualification: z.enum(["provided", "ready", "incomplete", "no-assets"]),
  statuses: z.record(z.string()),
  requestedServices: z.array(z.string()),
};

const templateFields = {
  templateId: z.string(),
  projectVersion: z.enum(["desktop", "mobile", "both"]),
  colorPreset: z.string(),
};

const enterpriseFields = {
  projectVision: z.string().max(MAX_LONG),
  targetUsers: z.string().max(MAX_LONG),
  userRoles: z.string().max(MAX_LONG),
  businessWorkflows: z.string().max(MAX_LONG),
  integrations: z.string().max(MAX_LONG),
  existingSystems: z.string().max(MAX_LONG),
  dataSecurityRequirements: z.string().max(MAX_LONG),
  scalabilityRequirements: z.string().max(MAX_LONG),
  designInspiration: z.string().max(MAX_LONG),
  competitors: z.string().max(MAX_LONG),
  successCriteria: z.string().max(MAX_LONG),
};

const featureFields = {
  name: z.string(),
  priority: z.enum(["Required", "Nice to Have", "Future Phase", "Need Help Deciding"]),
  source: z.enum(["chip", "custom"]),
};

const pageFields = {
  name: z.string(),
  fields: z.record(z.string()),
};

const designFields = {
  styles: z.array(z.string()),
  inspirationLink: z.string().max(2000),
};

const paymentFields = {
  plan: z.string(),
  maintenanceAfterFree: z.string(),
  maintenanceEndAcknowledged: z.boolean(),
  voucherCode: z.string(),
};

const confirmationsFields = {
  accurate: z.boolean(),
  receipt: z.boolean(),
  payment: z.boolean(),
  maintenance: z.boolean(),
  buildCard: z.boolean(),
  submission: z.boolean(),
};

// ═══════════════════════════════════════════════════════════
// Submit schema — full contract, strict validation
// ═══════════════════════════════════════════════════════════

const clientSubmitSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(MAX_SHORT),
  company: z.string().max(MAX_SHORT).default(""),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(MAX_SHORT).default(""),
});

const projectSubmitSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(MAX_SHORT),
  industry: z.string().min(1, "Industry is required").max(MAX_SHORT),
  projectType: z.string().min(1, "Project type is required").max(MAX_SHORT),
  businessDescription: z.string().max(MAX_LONG).default(""),
});

const assetsSubmitSchema = z.object({
  qualification: z.enum(["provided", "ready", "incomplete", "no-assets"], {
    errorMap: () => ({ message: "Invalid asset qualification" }),
  }),
  statuses: z.record(z.string()).default({}),
  requestedServices: z.array(z.string()).default([]),
});

const templateSubmitSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  projectVersion: z.enum(["desktop", "mobile", "both"], {
    errorMap: () => ({ message: "Invalid project version" }),
  }),
  colorPreset: z.string().default(""),
});

const enterpriseSubmitSchema = z.object({
  projectVision: z.string().min(1, "Project vision is required").max(MAX_LONG),
  targetUsers: z.string().min(1, "Target users is required").max(MAX_LONG),
  userRoles: z.string().max(MAX_LONG).default(""),
  businessWorkflows: z.string().max(MAX_LONG).default(""),
  integrations: z.string().max(MAX_LONG).default(""),
  existingSystems: z.string().max(MAX_LONG).default(""),
  dataSecurityRequirements: z.string().max(MAX_LONG).default(""),
  scalabilityRequirements: z.string().max(MAX_LONG).default(""),
  designInspiration: z.string().max(MAX_LONG).default(""),
  competitors: z.string().max(MAX_LONG).default(""),
  successCriteria: z.string().max(MAX_LONG).default(""),
});

const featureSubmitSchema = z.object({
  name: z.string().min(1, "Feature name is required"),
  priority: z.enum(["Required", "Nice to Have", "Future Phase", "Need Help Deciding"]).default("Need Help Deciding"),
  source: z.enum(["chip", "custom"]).default("chip"),
});

const pageSubmitSchema = z.object({
  name: z.string(),
  fields: z.record(z.string()).default({}),
});

const contentSubmitSchema = z.object({
  features: z.array(featureSubmitSchema).min(1, "At least one feature is required").max(MAX_FEATURES),
  pages: z.array(pageSubmitSchema).max(MAX_PAGES).default([]),
});

const designSubmitSchema = z.object({
  styles: z.array(z.string()).default([]),
  inspirationLink: z.string().max(2000).default(""),
});

const paymentSubmitSchema = z.object({
  plan: z.string().min(1, "Payment plan is required"),
  maintenanceAfterFree: z.string().default(""),
  maintenanceEndAcknowledged: z.boolean(),
  voucherCode: z.string().default(""),
});

const confirmationsSubmitSchema = z.object({
  accurate: z.literal(true, { errorMap: () => ({ message: "Must confirm accuracy" }) }),
  receipt: z.literal(true, { errorMap: () => ({ message: "Must confirm receipt" }) }),
  payment: z.literal(true, { errorMap: () => ({ message: "Must confirm payment" }) }),
  maintenance: z.literal(true, { errorMap: () => ({ message: "Must confirm maintenance" }) }),
  buildCard: z.literal(true, { errorMap: () => ({ message: "Must confirm build card" }) }),
  submission: z.literal(true, { errorMap: () => ({ message: "Must confirm submission" }) }),
});

const intakeSubmitSchema = z.object({
  client: clientSubmitSchema,
  project: projectSubmitSchema,
  assets: assetsSubmitSchema,
  tier: z.enum(["custom", "enterprise"], {
    errorMap: () => ({ message: "Tier must be custom or enterprise. Template is legacy-read-only." }),
  }),
  template: templateSubmitSchema.optional(),
  enterprise: enterpriseSubmitSchema.optional(),
  content: contentSubmitSchema,
  design: designSubmitSchema,
  payment: paymentSubmitSchema,
  confirmations: confirmationsSubmitSchema,
});

// Phase 2 accepts the complete Phase 1 wire contract. Later lifecycle code
// may keep the narrower active-path validator above, but submission itself
// must continue to accept all three Phase 1 tiers.
const phase2IntakeSubmitSchema = intakeSubmitSchema.extend({
  tier: z.enum(["template", "custom", "enterprise"], {
    errorMap: () => ({ message: "Tier must be template, custom, or enterprise" }),
  }),
});

// ═══════════════════════════════════════════════════════════
// Draft schema — shape-only validation. Every business-
// required field is optional. Validates UUIDs, enum values
// where present, and field length ceilings. Never 422 on
// incompleteness.
// ═══════════════════════════════════════════════════════════

const clientDraftSchema = z.object({
  fullName: z.string().max(MAX_SHORT).default(""),
  company: z.string().max(MAX_SHORT).default(""),
  email: z.string().max(MAX_SHORT).default(""),
  phone: z.string().max(MAX_SHORT).default(""),
}).default({});

const projectDraftSchema = z.object({
  projectName: z.string().max(MAX_SHORT).default(""),
  industry: z.string().max(MAX_SHORT).default(""),
  projectType: z.string().max(MAX_SHORT).default(""),
  businessDescription: z.string().max(MAX_LONG).default(""),
}).default({});

const assetsDraftSchema = z.object({
  qualification: z.enum(["provided", "ready", "incomplete", "no-assets"]).optional().nullable(),
  statuses: z.record(z.string()).default({}),
  requestedServices: z.array(z.string()).default([]),
}).default({});

const templateDraftSchema = z.object({
  templateId: z.string().default(""),
  projectVersion: z.enum(["desktop", "mobile", "both"]).optional().nullable(),
  colorPreset: z.string().default(""),
}).optional().nullable();

const enterpriseDraftSchema = z.object({
  projectVision: z.string().max(MAX_LONG).default(""),
  targetUsers: z.string().max(MAX_LONG).default(""),
  userRoles: z.string().max(MAX_LONG).default(""),
  businessWorkflows: z.string().max(MAX_LONG).default(""),
  integrations: z.string().max(MAX_LONG).default(""),
  existingSystems: z.string().max(MAX_LONG).default(""),
  dataSecurityRequirements: z.string().max(MAX_LONG).default(""),
  scalabilityRequirements: z.string().max(MAX_LONG).default(""),
  designInspiration: z.string().max(MAX_LONG).default(""),
  competitors: z.string().max(MAX_LONG).default(""),
  successCriteria: z.string().max(MAX_LONG).default(""),
}).optional().nullable();

const featureDraftSchema = z.object({
  name: z.string().default(""),
  priority: z.enum(["Required", "Nice to Have", "Future Phase", "Need Help Deciding"]).default("Need Help Deciding"),
  source: z.enum(["chip", "custom"]).default("chip"),
});

const pageDraftSchema = z.object({
  name: z.string().default(""),
  fields: z.record(z.string()).default({}),
});

const contentDraftSchema = z.object({
  features: z.array(featureDraftSchema).max(MAX_FEATURES).default([]),
  pages: z.array(pageDraftSchema).max(MAX_PAGES).default([]),
}).default({});

const designDraftSchema = z.object({
  styles: z.array(z.string()).default([]),
  inspirationLink: z.string().max(2000).default(""),
}).default({});

const paymentDraftSchema = z.object({
  plan: z.string().default(""),
  maintenanceAfterFree: z.string().default(""),
  maintenanceEndAcknowledged: z.boolean().default(false),
  voucherCode: z.string().default(""),
}).default({});

const confirmationsDraftSchema = z.object({
  accurate: z.boolean().default(false),
  receipt: z.boolean().default(false),
  payment: z.boolean().default(false),
  maintenance: z.boolean().default(false),
  buildCard: z.boolean().default(false),
  submission: z.boolean().default(false),
}).default({});

const intakeDraftSchema = z.object({
  client: clientDraftSchema,
  project: projectDraftSchema,
  assets: assetsDraftSchema,
  tier: z.enum(["custom", "enterprise"]).optional().nullable(),
  template: templateDraftSchema,
  enterprise: enterpriseDraftSchema,
  content: contentDraftSchema,
  design: designDraftSchema,
  payment: paymentDraftSchema,
  confirmations: confirmationsDraftSchema,
});

// ═══════════════════════════════════════════════════════════
// Exports and types
// ═══════════════════════════════════════════════════════════

export type ValidatedPayload = z.infer<typeof phase2IntakeSubmitSchema>;
export type DraftPayload = z.infer<typeof intakeDraftSchema>;

export interface MissingRequirementItem {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  data?: ValidatedPayload;
  errors?: Array<{ field: string; message: string }>;
}

export interface DraftValidationResult {
  success: boolean;
  data?: DraftPayload;
  missingRequirements: MissingRequirementItem[];
  errors?: Array<{ field: string; message: string }>;
}

export function validateIntakePayload(payload: unknown): ValidationResult {
  const result = intakeSubmitSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return { success: false, errors };
  }

  const data = result.data;
  const tierErrors: Array<{ field: string; message: string }> = [];

  if ((data.tier === "custom") && !data.template) {
    tierErrors.push({
      field: "template",
      message: "Template selection is required for custom tier",
    });
  }

  if (data.tier === "enterprise" && !data.enterprise) {
    tierErrors.push({
      field: "enterprise",
      message: "Enterprise requirements are required for enterprise tier",
    });
  }

  const CUSTOM_PROJECT_TYPES = new Set(["website", "mobile"]);
  const ENTERPRISE_PROJECT_TYPES = new Set([
    "website", "webapp", "mobile", "ai-agent", "ecommerce", "internal",
  ]);
  const buildPath = data.tier === "enterprise" ? "enterprise" : "custom";

  if (buildPath === "custom" && !CUSTOM_PROJECT_TYPES.has(data.project.projectType)) {
    tierErrors.push({
      field: "project.projectType",
      message: `Custom Build only supports: Website, Mobile App. Got: "${data.project.projectType}"`,
    });
  }

  if (buildPath === "enterprise" && !ENTERPRISE_PROJECT_TYPES.has(data.project.projectType)) {
    tierErrors.push({
      field: "project.projectType",
      message: `Enterprise Level supports: Website, Web App, Mobile App, AI Agent, E-Commerce, Internal Tool. Got: "${data.project.projectType}"`,
    });
  }

  if (tierErrors.length > 0) {
    return { success: false, errors: tierErrors };
  }

  return { success: true, data };
}

export function validatePhase2Payload(payload: unknown): ValidationResult {
  const result = phase2IntakeSubmitSchema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const data = result.data;
  const tierErrors: Array<{ field: string; message: string }> = [];

  if (
    data.tier === "template" &&
    (data.assets.qualification === "incomplete" || data.assets.qualification === "no-assets")
  ) {
    tierErrors.push({
      field: "assets.qualification",
      message: "Template tier requires at least 'ready' asset status",
    });
  }

  if ((data.tier === "template" || data.tier === "custom") && !data.template) {
    tierErrors.push({
      field: "template",
      message: "Template selection is required for template/custom tier",
    });
  }

  if (data.tier === "enterprise" && !data.enterprise) {
    tierErrors.push({
      field: "enterprise",
      message: "Enterprise requirements are required for enterprise tier",
    });
  }

  const customProjectTypes = new Set(["website", "mobile"]);
  const enterpriseProjectTypes = new Set([
    "website", "webapp", "mobile", "ai-agent", "ecommerce", "internal",
  ]);
  const projectTypes = data.tier === "enterprise" ? enterpriseProjectTypes : customProjectTypes;
  if (!projectTypes.has(data.project.projectType)) {
    tierErrors.push({
      field: "project.projectType",
      message: `${data.tier === "enterprise" ? "Enterprise" : "Template/Custom"} tier does not support project type "${data.project.projectType}"`,
    });
  }

  return tierErrors.length > 0
    ? { success: false, errors: tierErrors }
    : { success: true, data };
}

export function validateDraftPayload(payload: unknown): DraftValidationResult {
  const result = intakeDraftSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return { success: false, missingRequirements: [], errors };
  }

  const data = result.data;
  const missing = collectDraftMissingRequirements(data);
  return { success: true, data, missingRequirements: missing };
}

function collectDraftMissingRequirements(data: DraftPayload): MissingRequirementItem[] {
  const missing: MissingRequirementItem[] = [];

  if (!data.client?.fullName?.trim()) {
    missing.push({ field: "client.fullName", message: "Full name is required" });
  }
  if (!data.client?.email?.trim() || !data.client.email.includes("@")) {
    missing.push({ field: "client.email", message: "Valid email is required" });
  }
  if (!data.project?.projectName?.trim()) {
    missing.push({ field: "project.projectName", message: "Project name is required" });
  }
  if (!data.project?.industry?.trim()) {
    missing.push({ field: "project.industry", message: "Industry is required" });
  }
  if (!data.project?.projectType?.trim()) {
    missing.push({ field: "project.projectType", message: "Project type is required" });
  }
  if (!data.tier) {
    missing.push({ field: "tier", message: "Build path selection is required" });
  }

  if (data.tier === "custom" && !data.template?.templateId?.trim()) {
    missing.push({ field: "template.templateId", message: "Template selection is required" });
  }
  if (data.tier === "custom" && !data.template?.projectVersion) {
    missing.push({ field: "template.projectVersion", message: "Project version is required" });
  }
  if (data.tier === "enterprise" && !data.enterprise?.projectVision?.trim()) {
    missing.push({ field: "enterprise.projectVision", message: "Project vision is required" });
  }
  if (data.tier === "enterprise" && !data.enterprise?.targetUsers?.trim()) {
    missing.push({ field: "enterprise.targetUsers", message: "Target users is required" });
  }

  if (!data.content?.features || data.content.features.length === 0) {
    missing.push({ field: "content.features", message: "At least one feature is required" });
  }

  if (!data.payment?.plan?.trim()) {
    missing.push({ field: "payment.plan", message: "Payment plan is required" });
  }

  if (!data.assets?.qualification) {
    missing.push({ field: "assets.qualification", message: "Asset qualification is required" });
  }

  const confirmations = data.confirmations;
  if (confirmations) {
    if (!confirmations.accurate) missing.push({ field: "confirmations.accurate", message: "Must confirm accuracy" });
    if (!confirmations.receipt) missing.push({ field: "confirmations.receipt", message: "Must confirm receipt" });
    if (!confirmations.payment) missing.push({ field: "confirmations.payment", message: "Must confirm payment" });
    if (!confirmations.maintenance) missing.push({ field: "confirmations.maintenance", message: "Must confirm maintenance" });
    if (!confirmations.buildCard) missing.push({ field: "confirmations.buildCard", message: "Must confirm build card" });
    if (!confirmations.submission) missing.push({ field: "confirmations.submission", message: "Must confirm submission" });
  }

  return missing;
}
