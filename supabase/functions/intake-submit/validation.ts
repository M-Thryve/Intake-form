interface ValidationError {
  field: string;
  message: string;
}

const MAX_TEXT_LENGTH = 5000;
const MAX_SHORT_TEXT = 500;
const VALID_TIERS = ["template", "custom", "enterprise"];
const VALID_QUALIFICATIONS = ["provided", "ready", "incomplete", "no-assets"];
const VALID_PRIORITIES = ["Required", "Nice to Have", "Future Phase", "Need Help Deciding"];
const VALID_SOURCES = ["chip", "custom"];

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isString(val: unknown): val is string {
  return typeof val === "string";
}

function isBoolean(val: unknown): val is boolean {
  return typeof val === "boolean";
}

function textTooLong(val: unknown, max: number): boolean {
  return typeof val === "string" && val.length > max;
}

function validateClient(
  client: Record<string, unknown>,
  errors: ValidationError[]
) {
  if (!isNonEmptyString(client.fullName))
    errors.push({ field: "client.fullName", message: "Full name is required" });
  if (textTooLong(client.fullName, MAX_SHORT_TEXT))
    errors.push({ field: "client.fullName", message: "Full name is too long" });

  if (!isNonEmptyString(client.email))
    errors.push({ field: "client.email", message: "Email is required" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email as string))
    errors.push({ field: "client.email", message: "Email format is invalid" });

  if (!isNonEmptyString(client.projectName ?? client.company ?? "")) {
    // company is optional per schema
  }

  if (client.phone !== undefined && textTooLong(client.phone, MAX_SHORT_TEXT))
    errors.push({ field: "client.phone", message: "Phone is too long" });
}

function validateProject(
  project: Record<string, unknown>,
  errors: ValidationError[]
) {
  if (!isNonEmptyString(project.projectName))
    errors.push({ field: "project.projectName", message: "Project name is required" });
  if (textTooLong(project.projectName, MAX_SHORT_TEXT))
    errors.push({ field: "project.projectName", message: "Project name is too long" });

  if (!isNonEmptyString(project.industry))
    errors.push({ field: "project.industry", message: "Industry is required" });

  if (!isNonEmptyString(project.projectType))
    errors.push({ field: "project.projectType", message: "Project type is required" });

  if (textTooLong(project.businessDescription, MAX_TEXT_LENGTH))
    errors.push({ field: "project.businessDescription", message: "Business description is too long" });
}

function validateAssets(
  assets: Record<string, unknown>,
  tier: string,
  errors: ValidationError[]
) {
  if (!isNonEmptyString(assets.qualification))
    errors.push({ field: "assets.qualification", message: "Asset qualification is required" });
  else if (!VALID_QUALIFICATIONS.includes(assets.qualification as string))
    errors.push({ field: "assets.qualification", message: "Invalid asset qualification value" });

  if (
    tier === "template" &&
    (assets.qualification === "incomplete" || assets.qualification === "no-assets")
  ) {
    errors.push({
      field: "assets.qualification",
      message: "Template tier requires at least 'ready' asset status",
    });
  }

  if (assets.statuses !== undefined && typeof assets.statuses !== "object")
    errors.push({ field: "assets.statuses", message: "Asset statuses must be an object" });

  if (assets.requestedServices !== undefined && !Array.isArray(assets.requestedServices))
    errors.push({ field: "assets.requestedServices", message: "Requested services must be an array" });
}

function validateTemplate(
  template: Record<string, unknown> | undefined,
  tier: string,
  errors: ValidationError[]
) {
  if (tier === "template" || tier === "custom") {
    if (!template) {
      errors.push({ field: "template", message: "Template selection is required for this tier" });
      return;
    }
    if (!isNonEmptyString(template.templateId))
      errors.push({ field: "template.templateId", message: "Template ID is required" });
    // v3.1: projectVersion no longer collected — optional for legacy tolerance
    if (template.projectVersion !== undefined && template.projectVersion !== null && template.projectVersion !== "") {
      if (!["desktop", "mobile", "both"].includes(template.projectVersion as string))
        errors.push({ field: "template.projectVersion", message: "Invalid project version" });
    }
  }
}

function validateEnterprise(
  enterprise: Record<string, unknown> | undefined,
  tier: string,
  errors: ValidationError[]
) {
  if (tier === "enterprise") {
    if (!enterprise) {
      errors.push({ field: "enterprise", message: "Enterprise requirements are required for enterprise tier" });
      return;
    }
    if (!isNonEmptyString(enterprise.projectVision))
      errors.push({ field: "enterprise.projectVision", message: "Project vision is required" });
    if (!isNonEmptyString(enterprise.targetUsers))
      errors.push({ field: "enterprise.targetUsers", message: "Target users is required" });

    const textFields = [
      "projectVision", "targetUsers", "userRoles", "businessWorkflows",
      "integrations", "existingSystems", "dataSecurityRequirements",
      "scalabilityRequirements", "designInspiration", "competitors", "successCriteria",
    ];
    for (const f of textFields) {
      if (textTooLong(enterprise[f], MAX_TEXT_LENGTH))
        errors.push({ field: `enterprise.${f}`, message: `${f} is too long` });
    }
  }
}

function validateContent(
  content: Record<string, unknown>,
  errors: ValidationError[]
) {
  if (!Array.isArray(content.features) || content.features.length === 0)
    errors.push({ field: "content.features", message: "At least one feature is required" });
  else {
    for (let i = 0; i < content.features.length; i++) {
      const f = content.features[i] as Record<string, unknown>;
      if (!isNonEmptyString(f?.name))
        errors.push({ field: `content.features[${i}].name`, message: "Feature name is required" });
      if (f?.priority && !VALID_PRIORITIES.includes(f.priority as string))
        errors.push({ field: `content.features[${i}].priority`, message: "Invalid priority value" });
      if (f?.source && !VALID_SOURCES.includes(f.source as string))
        errors.push({ field: `content.features[${i}].source`, message: "Invalid source value" });
    }
    if (content.features.length > 100)
      errors.push({ field: "content.features", message: "Too many features (max 100)" });
  }

  if (content.pages !== undefined) {
    if (!Array.isArray(content.pages))
      errors.push({ field: "content.pages", message: "Pages must be an array" });
    else if (content.pages.length > 50)
      errors.push({ field: "content.pages", message: "Too many pages (max 50)" });
  }
}

function validateDesign(
  design: Record<string, unknown>,
  errors: ValidationError[]
) {
  if (!Array.isArray(design.styles) || design.styles.length === 0)
    errors.push({ field: "design.styles", message: "At least one design style is required" });

  if (design.inspirationLink !== undefined && textTooLong(design.inspirationLink, 2000))
    errors.push({ field: "design.inspirationLink", message: "Inspiration link is too long" });
}

function validatePayment(
  payment: Record<string, unknown>,
  errors: ValidationError[]
) {
  if (!isNonEmptyString(payment.plan))
    errors.push({ field: "payment.plan", message: "Payment plan is required" });

  if (!isBoolean(payment.maintenanceEndAcknowledged))
    errors.push({ field: "payment.maintenanceEndAcknowledged", message: "Maintenance acknowledgement is required" });
}

function validateConfirmations(
  confirmations: Record<string, unknown>,
  errors: ValidationError[]
) {
  const required = ["accurate", "receipt", "payment", "maintenance", "buildCard", "submission"];
  for (const key of required) {
    if (confirmations[key] !== true)
      errors.push({ field: `confirmations.${key}`, message: `Confirmation '${key}' must be true` });
  }
}

export function validatePayload(payload: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!payload.client || typeof payload.client !== "object")
    errors.push({ field: "client", message: "Client details are required" });

  if (!payload.project || typeof payload.project !== "object")
    errors.push({ field: "project", message: "Project details are required" });

  if (!payload.assets || typeof payload.assets !== "object")
    errors.push({ field: "assets", message: "Asset information is required" });

  if (!isNonEmptyString(payload.tier))
    errors.push({ field: "tier", message: "Build tier is required" });
  else if (!VALID_TIERS.includes(payload.tier as string))
    errors.push({ field: "tier", message: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` });

  if (!payload.content || typeof payload.content !== "object")
    errors.push({ field: "content", message: "Content information is required" });

  if (!payload.design || typeof payload.design !== "object")
    errors.push({ field: "design", message: "Design preferences are required" });

  if (!payload.payment || typeof payload.payment !== "object")
    errors.push({ field: "payment", message: "Payment preferences are required" });

  if (!payload.confirmations || typeof payload.confirmations !== "object")
    errors.push({ field: "confirmations", message: "Confirmations are required" });

  // Stop early if top-level sections are missing
  if (errors.length > 0) return errors;

  const tier = payload.tier as string;

  validateClient(payload.client as Record<string, unknown>, errors);
  validateProject(payload.project as Record<string, unknown>, errors);
  validateAssets(payload.assets as Record<string, unknown>, tier, errors);
  validateTemplate(payload.template as Record<string, unknown> | undefined, tier, errors);
  validateEnterprise(payload.enterprise as Record<string, unknown> | undefined, tier, errors);
  validateContent(payload.content as Record<string, unknown>, errors);
  validateDesign(payload.design as Record<string, unknown>, errors);
  validatePayment(payload.payment as Record<string, unknown>, errors);
  validateConfirmations(payload.confirmations as Record<string, unknown>, errors);

  return errors;
}
