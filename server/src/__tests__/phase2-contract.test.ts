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
      industry: "Technology",
      projectType: "website",
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
  it.each(["template", "custom"])("accepts template-backed tiers: %s", (tier) => {
    expect(validatePhase2Payload(validPayload({ tier })).success).toBe(true);
  });

  it("accepts enterprise requirements without a template", () => {
    const result = validatePhase2Payload(validPayload({
      tier: "enterprise",
      template: undefined,
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
});
