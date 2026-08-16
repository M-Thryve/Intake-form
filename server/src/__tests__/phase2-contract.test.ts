import { describe, expect, it } from "vitest";
import { validatePhase2Payload } from "../lib/validation.js";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      fullName: "Test User",
      company: "Test Co",
      email: "test@example.com",
      phone: "555-0100",
    },
    project: {
      projectName: "Test Site",
      industry: "service-commerce",
      projectType: "templated-website",
      businessDescription: "A test site",
    },
    assets: {
      qualification: "ready",
      statuses: { logo: "available" },
      requestedServices: [],
    },
    tier: "custom",
    template: {
      templateId: "starter",
      projectVersion: "desktop",
      colorPreset: "blue",
    },
    scope: {
      coreFeatures: [],
      extensions: [],
      pages: [{ name: "Home", fields: {} }],
      features: [],
    },
    content: {
      pages: [{ name: "Home", fields: {} }],
      features: [{ name: "Contact", priority: "Required", source: "chip" }],
    },
    design: { styles: ["Modern"], inspirationLink: "" },
    payment: {
      plan: "one-time",
      maintenanceAfterFree: "none",
      maintenanceEndAcknowledged: true,
      voucherCode: "",
    },
    confirmations: {
      accurate: true,
      receipt: true,
      payment: true,
      maintenance: true,
      buildCard: true,
      submission: true,
    },
    ...overrides,
  };
}

describe("Phase 2 submission contract", () => {
  it("accepts custom tier (active v3.0 path)", () => {
    expect(validatePhase2Payload(validPayload({ tier: "custom" })).success).toBe(true);
  });

  it("rejects legacy template tier", () => {
    const result = validatePhase2Payload(validPayload({ tier: "template" }));
    expect(result.success).toBe(false);
  });

  it("accepts enterprise requirements without a template", () => {
    const result = validatePhase2Payload(validPayload({
      tier: "enterprise",
      template: undefined,
      project: {
        projectName: "Enterprise Platform",
        industry: "service-commerce",
        projectType: "website",
        businessDescription: "An enterprise platform",
      },
      enterprise: {
        projectVision: "A platform",
        targetUsers: "Teams",
        userRoles: "Admins",
        businessWorkflows: "Onboarding",
        integrations: "CRM",
        existingSystems: "None",
        dataSecurityRequirements: "Standard",
        scalabilityRequirements: "10k users",
        designInspiration: "Minimal",
        competitors: "None",
        successCriteria: "Adoption",
      },
    }));
    expect(result.success).toBe(true);
  });

  it("rejects tier-incompatible conditional data", () => {
    const result = validatePhase2Payload(validPayload({
      tier: "enterprise",
      template: undefined,
      project: {
        projectName: "Enterprise Platform",
        industry: "service-commerce",
        projectType: "website",
        businessDescription: "An enterprise platform",
      },
    }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((error) => error.field === "enterprise")).toBe(true);
  });

  it("accepts missing payment and confirmation sections (v2: both fields default to empty objects)", () => {
    // Phase 2 intentionally removed payment/confirmation gates from the submission
    // contract. Both schemas use .default({}) so undefined input is valid.
    const result = validatePhase2Payload(validPayload({ payment: undefined, confirmations: undefined }));
    expect(result.success).toBe(true);
  });

  it("REV-03: rejects non-canonical industry values", () => {
    const result = validatePhase2Payload(validPayload({
      project: {
        projectName: "Test Site",
        industry: "healthcare",
        projectType: "templated-website",
        businessDescription: "A test site",
      },
    }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "project.industry")).toBe(true);
  });

  it("REV-04: accepts all seven canonical industries", () => {
    const industries = [
      "service-commerce",
      "dtc-ecommerce",
      "retail-multi-branch",
      "wholesale-distribution",
      "manufacturing-fabrication",
      "warehousing-storage",
      "logistics-transportation",
    ];
    for (const industry of industries) {
      const result = validatePhase2Payload(validPayload({
        project: {
          projectName: "Test Site",
          industry,
          projectType: "templated-website",
          businessDescription: "A test site",
        },
      }));
      expect(result.success, `expected ${industry} to be accepted`).toBe(true);
    }
  });

  it("REV-05: accepts scope block alongside content", () => {
    const result = validatePhase2Payload(validPayload({
      scope: {
        coreFeatures: ["contact-form"],
        extensions: ["EXT-001"],
        pages: [{ name: "Home", fields: { headline: "Welcome" } }],
        features: [],
      },
    }));
    expect(result.success).toBe(true);
  });

  it("rejects unknown extension codes on submit", () => {
    const result = validatePhase2Payload(validPayload({
      scope: {
        coreFeatures: [],
        extensions: ["EXT-001", "UNKNOWN-CODE"],
        pages: [],
        features: [],
      },
    }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((error) => error.field === "scope.extensions")).toBe(true);
  });

  it("REV-06: enforces questionnaire required fields for ai-assisted-website", () => {
    const result = validatePhase2Payload(validPayload({
      project: {
        projectName: "AI Site",
        industry: "service-commerce",
        projectType: "ai-assisted-website",
        businessDescription: "AI driven site",
      },
      template: undefined,
      websiteQuestionnaire: { websitePurpose: ["generate-leads"] },
    }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "websiteQuestionnaire.primaryGoal")).toBe(true);
    expect(result.errors?.some((e) => e.field === "websiteQuestionnaire.visitorAction")).toBe(true);
  });

  it("REV-06: enforces websitePurposeOther when websitePurpose includes 'other' (ai-assisted-website)", () => {
    const result = validatePhase2Payload(validPayload({
      project: {
        projectName: "AI Site",
        industry: "service-commerce",
        projectType: "ai-assisted-website",
        businessDescription: "AI driven site",
      },
      template: undefined,
      websiteQuestionnaire: {
        primaryGoal: "Sell services",
        visitorAction: "Call us",
        websitePurpose: ["generate-leads", "other"],
      },
    }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "websiteQuestionnaire.websitePurposeOther")).toBe(true);
  });

  it("REV-06: does not enforce questionnaire for templated-website", () => {
    const result = validatePhase2Payload(validPayload());
    // templated-website has no questionnaire requirement
    expect(result.errors?.some((e) => e.field?.startsWith("websiteQuestionnaire"))).toBeFalsy();
  });
});
