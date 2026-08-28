import { z } from "zod";
import {
  V3_CUSTOM_PROJECT_TYPES,
  V3_ENTERPRISE_PROJECT_TYPES,
  CANONICAL_INDUSTRIES,
  EXTENSION_CODES,
} from "./features.js";

const MAX_SHORT = 500;
const MAX_LONG = 5000;
const MAX_FEATURES = 100;
const MAX_PAGES = 50;
const MAX_UPLOADS = 100;

// ═══════════════════════════════════════════════════════════
// Shared field shapes — single source of truth for field
// definitions so draft and submit schemas never drift.
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Submit schemas — full contract, strict validation.
// Payment and confirmation fields are deliberately absent from
// the active v3.0 submit contract. They remain on the legacy
// intakeSubmitSchema (for historical record reads only).
// ═══════════════════════════════════════════════════════════

const clientSubmitSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(MAX_SHORT),
  company: z.string().max(MAX_SHORT).default(""),
  email: z.string().email("A valid client email is required"),
  phone: z.string().max(MAX_SHORT).default(""),
});

const projectSubmitSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(MAX_SHORT),
  industry: z.string().min(1, "Industry is required").max(MAX_SHORT),
  projectType: z.string().min(1, "Project type is required").max(MAX_SHORT),
  businessDescription: z.string().max(MAX_LONG).default(""),
});

const uploadedAssetMetadataSchema = z.object({
  assetId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(MAX_SHORT),
  sizeBytes: z.number().int().nonnegative(),
  assetStatus: z.enum(["pending", "uploaded", "scanning", "ready", "rejected", "failed"]),
  scanStatus: z.enum(["pending", "clean", "blocked", "failed"]),
  rejectionReason: z.string().max(MAX_LONG).optional(),
  requirementKey: z.string().max(MAX_SHORT).optional(),
  uploadedAt: z.string().max(MAX_SHORT).optional(),
});

const assetMetadataFields = {
  uploads: z.array(uploadedAssetMetadataSchema).max(MAX_UPLOADS).default([]),
  deckExists: z.string().max(MAX_SHORT).optional(),
  deckSectionNotes: z.record(z.string().max(MAX_LONG)).default({}),
  resourceNotes: z.record(z.string().max(MAX_LONG)).default({}),
  resourceAddOnCosts: z.record(z.number().nonnegative()).default({}),
};

const assetsSubmitSchema = z.object({
  qualification: z.enum(["provided", "ready", "incomplete", "no-assets"], {
    errorMap: () => ({ message: "Invalid asset qualification" }),
  }),
  statuses: z.record(z.string()).default({}),
  requestedServices: z.array(z.string()).default([]),
  ...assetMetadataFields,
});

const templateSubmitSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  // v3.1 removed platform version selection. New submissions omit this
  // field; historical clients may still send desktop/mobile/both, and old
  // records carry it — tolerated on read, never required.
  projectVersion: z
    .enum(["desktop", "mobile", "both"])
    .optional()
    .nullable(),
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
  priority: z
    .enum(["Required", "Nice to Have", "Future Phase", "Need Help Deciding"])
    .default("Need Help Deciding"),
  source: z.enum(["chip", "custom"]).default("chip"),
});

const pageSubmitSchema = z.object({
  name: z.string(),
  fields: z.record(z.string()).default({}),
});

// v3.0: features are no longer required — extensions replace them for website builds.
const contentSubmitSchema = z.object({
  features: z.array(featureSubmitSchema).max(MAX_FEATURES).default([]),
  pages: z.array(pageSubmitSchema).max(MAX_PAGES).default([]),
});

// v3.0 active scope block — replaces content in new submissions.
const scopeSubmitSchema = z
  .object({
    coreFeatures: z.array(z.string()).default([]),
    extensions: z.array(z.string()).default([]),
    customFeatures: z.array(z.string()).default([]),
    pages: z.array(pageSubmitSchema).max(MAX_PAGES).default([]),
    features: z.array(featureSubmitSchema).max(MAX_FEATURES).default([]),
  })
  .default({});

// Questionnaire is a free-form record; field requirements are enforced in
// validatePhase2Payload (see QUESTIONNAIRE_SUBMIT_REQUIRED in questionnaire.ts).
const websiteQuestionnaireSubmitSchema = z
  .record(z.string(), z.union([z.string(), z.array(z.string())]))
  .optional()
  .nullable();

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

const discardReasonSchema = z.object({
  code: z.enum(["not_proceeding", "out_of_scope", "budget", "timing", "duplicate", "other"]),
  note: z.string().max(MAX_LONG).optional(),
});

const missingRequirementSchema = z.object({
  key: z.string().max(MAX_SHORT),
  label: z.string().max(MAX_LONG),
  category: z.string().max(MAX_SHORT),
  section: z.string().max(MAX_SHORT),
  severity: z.string().max(MAX_SHORT),
  status: z.string().max(MAX_SHORT),
  owner: z.string().max(MAX_SHORT).optional(),
  nextAction: z.string().max(MAX_LONG).optional(),
  note: z.string().max(MAX_LONG).optional(),
  preliminaryCost: z.number().nonnegative().optional(),
});

const operatorNoteSchema = z.object({
  kind: z.enum(["discovery", "follow_up", "assumption", "disposition"]),
  section: z.string().max(MAX_SHORT).optional(),
  note: z.string().max(MAX_LONG),
  createdAt: z.string().max(MAX_SHORT).optional(),
});

const sourceMetadataSchema = z.object({
  operator: z.string().max(MAX_SHORT).optional(),
  appointmentId: z.string().max(MAX_SHORT).optional(),
  submittedAt: z.string().max(MAX_SHORT).optional(),
  importedFrom: z.string().max(MAX_SHORT).optional(),
  lastEditedStep: z.string().max(MAX_SHORT).optional(),
}).default({});

// Legacy strict schema — used by validateIntakePayload (historical path only).
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

// v3.0 active schema — payment and confirmations are informational defaults.
const phase2PaymentSchema = z
  .object({
    plan: z.string().default(""),
    maintenanceAfterFree: z.string().default(""),
    maintenanceEndAcknowledged: z.boolean().default(false),
    voucherCode: z.string().default(""),
  })
  .default({});

const phase2ConfirmationsSchema = z
  .object({
    accurate: z.boolean().default(false),
    receipt: z.boolean().default(false),
    payment: z.boolean().default(false),
    maintenance: z.boolean().default(false),
    buildCard: z.boolean().default(false),
    submission: z.boolean().default(false),
  })
  .default({});

const phase2IntakeSubmitSchema = z.object({
  client: clientSubmitSchema,
  project: projectSubmitSchema,
  assets: assetsSubmitSchema,
  tier: z.enum(["custom", "enterprise"], {
    errorMap: () => ({ message: "Tier must be custom or enterprise. Template is legacy-read-only." }),
  }),
  template: templateSubmitSchema.optional(),
  enterprise: enterpriseSubmitSchema.optional(),
  // v3.0 active scope (replaces content for new submissions)
  scope: scopeSubmitSchema,
  // content kept optional for legacy read-compatibility only
  content: contentSubmitSchema.optional(),
  design: designSubmitSchema,
  payment: phase2PaymentSchema,
  confirmations: phase2ConfirmationsSchema,
  // Questionnaire: sent for ai-assisted-website builds only
  websiteQuestionnaire: websiteQuestionnaireSubmitSchema,
  buildPath: z.enum(["custom", "enterprise"]).optional().nullable(),
  discardReason: discardReasonSchema.optional().nullable(),
  outcome: z.enum(["draft", "submitted", "discarded"]).optional(),
  missingRequirements: z.array(missingRequirementSchema).max(200).default([]),
  operatorNotes: z.array(operatorNoteSchema).max(200).default([]),
  sourceMetadata: sourceMetadataSchema,
});

// ═══════════════════════════════════════════════════════════
// Draft schema — shape-only validation. Email is the only
// universal hard requirement (missing → 422). Every other
// business-required field is optional; gaps are returned as
// MissingRequirementItem records. Field length ceilings still
// apply; enum values where present are still validated.
// ═══════════════════════════════════════════════════════════

// Draft: email optional (validated if provided). Missing requirements collected below.
const clientDraftSchema = z.object({
  fullName: z.string().max(MAX_SHORT).default(""),
  company: z.string().max(MAX_SHORT).default(""),
  email: z
    .string()
    .trim()
    .email("A valid client email is required")
    .max(MAX_SHORT)
    .optional()
    .nullable(),
  phone: z.string().max(MAX_SHORT).default(""),
}).default({});

const projectDraftSchema = z
  .object({
    projectName: z.string().max(MAX_SHORT).default(""),
    industry: z.string().max(MAX_SHORT).default(""),
    projectType: z.string().max(MAX_SHORT).default(""),
    businessDescription: z.string().max(MAX_LONG).default(""),
  })
  .default({});

const assetsDraftSchema = z
  .object({
    qualification: z
      .union([z.enum(["provided", "ready", "incomplete", "no-assets"]), z.literal("")])
      .optional()
      .nullable(),
    statuses: z.record(z.string()).default({}),
    requestedServices: z.array(z.string()).default([]),
    ...assetMetadataFields,
  })
  .default({});

const templateDraftSchema = z
  .object({
    templateId: z.string().default(""),
    // v3.1: platform versions removed from the offer. Accepted on read for
    // legacy drafts; never required and never written for new selections.
    projectVersion: z
      .union([z.enum(["desktop", "mobile", "both"]), z.literal("")])
      .optional()
      .nullable(),
    colorPreset: z.string().default(""),
  })
  .optional()
  .nullable();

const enterpriseDraftSchema = z
  .object({
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
  })
  .optional()
  .nullable();

const featureDraftSchema = z.object({
  name: z.string().default(""),
  priority: z
    .enum(["Required", "Nice to Have", "Future Phase", "Need Help Deciding"])
    .default("Need Help Deciding"),
  source: z.enum(["chip", "custom"]).default("chip"),
});

const pageDraftSchema = z.object({
  name: z.string().default(""),
  fields: z.record(z.string()).default({}),
});

// Legacy content block — retained for reading older payloads.
const contentDraftSchema = z
  .object({
    features: z.array(featureDraftSchema).max(MAX_FEATURES).default([]),
    pages: z.array(pageDraftSchema).max(MAX_PAGES).default([]),
  })
  .default({});

// v3.0 scope block — coreFeatures and extensions replace content.features.
const scopeDraftSchema = z
  .object({
    coreFeatures: z.array(z.string()).default([]),
    extensions: z.array(z.string()).default([]),
    customFeatures: z.array(z.string()).default([]),
    pages: z.array(pageDraftSchema).max(MAX_PAGES).default([]),
    features: z.array(featureDraftSchema).max(MAX_FEATURES).default([]),
  })
  .default({});

// Questionnaire answers are free-form; each value is a string or string[].
const websiteQuestionnaireDraftSchema = z
  .record(z.string(), z.union([z.string(), z.array(z.string())]))
  .optional()
  .nullable();

const designDraftSchema = z
  .object({
    styles: z.array(z.string()).default([]),
    inspirationLink: z.string().max(2000).default(""),
  })
  .default({});

// payment and confirmations: kept for shape compatibility, but no longer
// added as missing requirements for draft saves in v3.0.
const paymentDraftSchema = z
  .object({
    plan: z.string().default(""),
    maintenanceAfterFree: z.string().default(""),
    maintenanceEndAcknowledged: z.boolean().default(false),
    voucherCode: z.string().default(""),
  })
  .default({});

const confirmationsDraftSchema = z
  .object({
    accurate: z.boolean().default(false),
    receipt: z.boolean().default(false),
    payment: z.boolean().default(false),
    maintenance: z.boolean().default(false),
    buildCard: z.boolean().default(false),
    submission: z.boolean().default(false),
  })
  .default({});

const intakeDraftSchema = z.object({
  client: clientDraftSchema,
  project: projectDraftSchema,
  assets: assetsDraftSchema,
  tier: z
    .union([z.enum(["template", "custom", "enterprise"]), z.literal("")])
    .optional()
    .nullable(),
  template: templateDraftSchema,
  enterprise: enterpriseDraftSchema,
  scope: scopeDraftSchema,
  content: contentDraftSchema,
  design: designDraftSchema,
  payment: paymentDraftSchema,
  confirmations: confirmationsDraftSchema,
  websiteQuestionnaire: websiteQuestionnaireDraftSchema,
  buildPath: z.enum(["custom", "enterprise"]).optional().nullable(),
  discardReason: discardReasonSchema.optional().nullable(),
  outcome: z.enum(["draft", "submitted", "discarded"]).optional(),
  missingRequirements: z.array(missingRequirementSchema).max(200).default([]),
  operatorNotes: z.array(operatorNoteSchema).max(200).default([]),
  sourceMetadata: sourceMetadataSchema,
});

// ═══════════════════════════════════════════════════════════
// Exports and types
// ═══════════════════════════════════════════════════════════

export type ValidatedPayload = z.infer<typeof phase2IntakeSubmitSchema>;
export type LegacyValidatedPayload = z.infer<typeof intakeSubmitSchema>;
export type DraftPayload = z.infer<typeof intakeDraftSchema>;

export interface MissingRequirementItem {
  field: string;
  message: string;
}

export interface ValidationResult<T = ValidatedPayload> {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface DraftValidationResult {
  success: boolean;
  data?: DraftPayload;
  missingRequirements: MissingRequirementItem[];
  errors?: Array<{ field: string; message: string }>;
}

export function validateIntakePayload(payload: unknown): ValidationResult<LegacyValidatedPayload> {
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

  // Template required only for Templated Website builds.
  if (data.project.projectType === "templated-website" && !data.template) {
    tierErrors.push({
      field: "template",
      message: "Template selection is required for Templated Website builds",
    });
  }

  if (data.tier === "enterprise" && !data.enterprise) {
    tierErrors.push({
      field: "enterprise",
      message: "Enterprise requirements are required for enterprise tier",
    });
  }

  const projectTypes =
    data.tier === "enterprise" ? V3_ENTERPRISE_PROJECT_TYPES : V3_CUSTOM_PROJECT_TYPES;

  if (!projectTypes.has(data.project.projectType)) {
    tierErrors.push({
      field: "project.projectType",
      message:
        data.tier === "enterprise"
          ? `Enterprise Level supports: Website, Web App, E-Commerce, Internal Tool. Got: "${data.project.projectType}"`
          : `Custom Build supports: Templated Website, AI-Assisted Website. Got: "${data.project.projectType}"`,
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

  // Canonical industry allowlist (7 values).
  if (!CANONICAL_INDUSTRIES.has(data.project.industry)) {
    tierErrors.push({
      field: "project.industry",
      message: `Industry must be one of the seven M-THRYVE canonical values. Got: "${data.project.industry}"`,
    });
  }

  // Template required only for Templated Website builds.
  if (data.project.projectType === "templated-website" && !data.template) {
    tierErrors.push({
      field: "template",
      message: "Template selection is required for Templated Website builds",
    });
  }

  if (data.tier === "enterprise" && !data.enterprise) {
    tierErrors.push({
      field: "enterprise",
      message: "Enterprise requirements are required for enterprise tier",
    });
  }

  const projectTypes =
    data.tier === "enterprise" ? V3_ENTERPRISE_PROJECT_TYPES : V3_CUSTOM_PROJECT_TYPES;

  if (!projectTypes.has(data.project.projectType)) {
    tierErrors.push({
      field: "project.projectType",
      message: `${data.tier === "enterprise" ? "Enterprise" : "Custom Build"} tier does not support project type "${data.project.projectType}"`,
    });
  }

  // Active submissions may only reference canonical v3.0 extension codes.
  // Drafts use collectDraftMissingRequirements below so incomplete drafts can
  // still be saved with an actionable missing-requirement entry.
  for (const code of data.scope?.extensions ?? []) {
    if (!EXTENSION_CODES.has(code)) {
      tierErrors.push({
        field: "scope.extensions",
        message: `Unknown extension code: ${code}`,
      });
    }
  }

  // Questionnaire required fields for AI-Assisted Website submissions only.
  if (data.project.projectType === "ai-assisted-website") {
    const q = data.websiteQuestionnaire as Record<string, unknown> | null | undefined;
    const REQUIRED = ["primaryGoal", "visitorAction", "websitePurpose"] as const;
    for (const field of REQUIRED) {
      const val = q?.[field];
      const isEmpty = !val || (Array.isArray(val) ? val.length === 0 : String(val).trim() === "");
      if (isEmpty) {
        tierErrors.push({
          field: `websiteQuestionnaire.${field}`,
          message: `${field} is required for AI-Assisted Website submissions`,
        });
      }
    }
    // Conditional: websitePurposeOther required when websitePurpose includes 'other'.
    const purpose = q?.websitePurpose;
    const purposeArr = Array.isArray(purpose) ? purpose : purpose ? [String(purpose)] : [];
    if (purposeArr.includes("other")) {
      const other = q?.websitePurposeOther;
      if (!other || String(other).trim() === "") {
        tierErrors.push({
          field: "websiteQuestionnaire.websitePurposeOther",
          message: "Please explain the 'other' website purpose",
        });
      }
    }
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

  if (!data.client?.email?.trim()) {
    missing.push({ field: "client.email", message: "Client email is required" });
  } else if (!data.client.email.includes("@")) {
    missing.push({ field: "client.email", message: "A valid client email is required" });
  }

  if (!data.client?.fullName?.trim()) {
    missing.push({ field: "client.fullName", message: "Full name is required" });
  }

  if (!data.project?.projectName?.trim()) {
    missing.push({ field: "project.projectName", message: "Project name is required" });
  }

  if (!data.project?.industry?.trim()) {
    missing.push({ field: "project.industry", message: "Industry is required" });
  } else if (!CANONICAL_INDUSTRIES.has(data.project.industry)) {
    missing.push({
      field: "project.industry",
      message: "Industry must be one of the seven M-THRYVE canonical values",
    });
  }

  if (!data.project?.projectType?.trim()) {
    missing.push({ field: "project.projectType", message: "Project type is required" });
  }

  if (!data.tier) {
    missing.push({ field: "tier", message: "Build path selection is required" });
  }

  // Template required only for Templated Website builds.
  // v3.1: projectVersion is no longer part of the discovery contract.
  if (data.project?.projectType === "templated-website") {
    if (!data.template?.templateId?.trim()) {
      missing.push({ field: "template.templateId", message: "Template selection is required" });
    }
  }

  if (data.tier === "enterprise") {
    if (!data.enterprise?.projectVision?.trim()) {
      missing.push({ field: "enterprise.projectVision", message: "Project vision is required" });
    }
    if (!data.enterprise?.targetUsers?.trim()) {
      missing.push({ field: "enterprise.targetUsers", message: "Target users is required" });
    }
  }

  // Extension code validation — unknown codes produce missing requirements (not 422).
  if (data.scope?.extensions) {
    for (const code of data.scope.extensions) {
      if (!EXTENSION_CODES.has(code)) {
        missing.push({
          field: "scope.extensions",
          message: `Unknown extension code: ${code}`,
        });
      }
    }
  }

  if (!data.assets?.qualification) {
    missing.push({ field: "assets.qualification", message: "Asset qualification is required" });
  }

  return missing;
}
