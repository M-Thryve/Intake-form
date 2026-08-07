import { z } from "zod";

const MAX_SHORT = 500;
const MAX_LONG = 5000;
const MAX_FEATURES = 100;
const MAX_PAGES = 50;

const clientSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(MAX_SHORT),
  company: z.string().max(MAX_SHORT).default(""),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(MAX_SHORT).default(""),
});

const projectSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(MAX_SHORT),
  industry: z.string().min(1, "Industry is required").max(MAX_SHORT),
  projectType: z.string().min(1, "Project type is required").max(MAX_SHORT),
  businessDescription: z.string().max(MAX_LONG).default(""),
});

const assetsSchema = z.object({
  qualification: z.enum(["provided", "ready", "incomplete", "no-assets"], {
    errorMap: () => ({ message: "Invalid asset qualification" }),
  }),
  statuses: z.record(z.string()).default({}),
  requestedServices: z.array(z.string()).default([]),
});

const templateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  projectVersion: z.enum(["desktop", "mobile", "both"], {
    errorMap: () => ({ message: "Invalid project version" }),
  }),
  colorPreset: z.string().default(""),
});

const enterpriseSchema = z.object({
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

const featureSchema = z.object({
  name: z.string().min(1, "Feature name is required"),
  priority: z.enum(["Required", "Nice to Have", "Future Phase", "Need Help Deciding"]).default("Need Help Deciding"),
  source: z.enum(["chip", "custom"]).default("chip"),
});

const pageSchema = z.object({
  name: z.string(),
  fields: z.record(z.string()).default({}),
});

const contentSchema = z.object({
  features: z.array(featureSchema).min(1, "At least one feature is required").max(MAX_FEATURES),
  pages: z.array(pageSchema).max(MAX_PAGES).default([]),
});

// REV-05: design step removed — design fields are optional with defaults.
// Legacy records with design data are still readable.
const designSchema = z.object({
  styles: z.array(z.string()).default([]),
  inspirationLink: z.string().max(2000).default(""),
});

const paymentSchema = z.object({
  plan: z.string().min(1, "Payment plan is required"),
  maintenanceAfterFree: z.string().default(""),
  maintenanceEndAcknowledged: z.boolean(),
  voucherCode: z.string().default(""),
});

const confirmationsSchema = z.object({
  accurate: z.literal(true, { errorMap: () => ({ message: "Must confirm accuracy" }) }),
  receipt: z.literal(true, { errorMap: () => ({ message: "Must confirm receipt" }) }),
  payment: z.literal(true, { errorMap: () => ({ message: "Must confirm payment" }) }),
  maintenance: z.literal(true, { errorMap: () => ({ message: "Must confirm maintenance" }) }),
  buildCard: z.literal(true, { errorMap: () => ({ message: "Must confirm build card" }) }),
  submission: z.literal(true, { errorMap: () => ({ message: "Must confirm submission" }) }),
});

const basePayloadSchema = z.object({
  client: clientSchema,
  project: projectSchema,
  assets: assetsSchema,
  tier: z.enum(["custom", "enterprise"], {
    errorMap: () => ({ message: "Tier must be custom or enterprise. Template is legacy-read-only." }),
  }),
  template: templateSchema.optional(),
  enterprise: enterpriseSchema.optional(),
  content: contentSchema,
  design: designSchema,
  payment: paymentSchema,
  confirmations: confirmationsSchema,
});

export type ValidatedPayload = z.infer<typeof basePayloadSchema>;

export interface ValidationResult {
  success: boolean;
  data?: ValidatedPayload;
  errors?: Array<{ field: string; message: string }>;
}

export function validateIntakePayload(payload: unknown): ValidationResult {
  const result = basePayloadSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return { success: false, errors };
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

  // REV-02: Per-path project type validation.
  // Custom Build (including legacy template) only accepts website and mobile-app.
  // Enterprise Level accepts website, webapp, mobile_app, ai_agent, ecommerce, internal_tool.
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
