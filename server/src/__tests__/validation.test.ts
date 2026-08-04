import { describe, it, expect } from "vitest";
import { validateIntakePayload } from "../lib/validation.js";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      fullName: "Juan Dela Cruz",
      company: "Test Corp",
      email: "juan@test.com",
      phone: "+63 912 345 6789",
    },
    project: {
      projectName: "Test App",
      industry: "Technology",
      projectType: "Web Application",
      businessDescription: "A test application",
    },
    assets: {
      qualification: "ready",
      statuses: { logo: "Available", colors: "Available" },
      requestedServices: [],
    },
    tier: "template",
    template: {
      templateId: "starter-portfolio",
      projectVersion: "desktop",
      colorPreset: "blue",
    },
    content: {
      pages: [{ name: "Home", fields: { headline: "Welcome" } }],
      features: [{ name: "Contact Form", priority: "Required", source: "chip" }],
    },
    design: {
      styles: ["Modern"],
      inspirationLink: "",
    },
    payment: {
      plan: "one-time",
      maintenanceAfterFree: "cancel",
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

describe("validateIntakePayload", () => {
  it("accepts a valid template payload", () => {
    const result = validateIntakePayload(validPayload());
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("accepts a valid enterprise payload", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "enterprise",
        template: undefined,
        enterprise: {
          projectVision: "Build a platform",
          targetUsers: "Businesses",
          userRoles: "Admin, User",
          businessWorkflows: "Onboarding",
          integrations: "Slack",
          existingSystems: "None",
          dataSecurityRequirements: "GDPR",
          scalabilityRequirements: "10k users",
          designInspiration: "Notion",
          competitors: "Trello",
          successCriteria: "User adoption",
        },
      })
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid custom payload", () => {
    const result = validateIntakePayload(
      validPayload({ tier: "custom" })
    );
    expect(result.success).toBe(true);
  });

  it("rejects missing client.fullName", () => {
    const result = validateIntakePayload(
      validPayload({
        client: { fullName: "", company: "", email: "x@y.com", phone: "" },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("fullName"))).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = validateIntakePayload(
      validPayload({
        client: { fullName: "A", company: "", email: "notanemail", phone: "" },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("email"))).toBe(true);
  });

  it("rejects missing project name", () => {
    const result = validateIntakePayload(
      validPayload({
        project: { projectName: "", industry: "Tech", projectType: "Web", businessDescription: "" },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("projectName"))).toBe(true);
  });

  it("rejects invalid tier", () => {
    const result = validateIntakePayload(validPayload({ tier: "invalid" }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "tier")).toBe(true);
  });

  it("rejects template tier with incomplete assets", () => {
    const result = validateIntakePayload(
      validPayload({
        assets: { qualification: "incomplete", statuses: {}, requestedServices: [] },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.message.includes("Template tier"))).toBe(true);
  });

  it("rejects template tier without template selection", () => {
    const result = validateIntakePayload(
      validPayload({ template: undefined })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "template")).toBe(true);
  });

  it("rejects enterprise tier without enterprise requirements", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "enterprise",
        template: undefined,
        enterprise: undefined,
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "enterprise")).toBe(true);
  });

  it("rejects empty features array", () => {
    const result = validateIntakePayload(
      validPayload({
        content: { pages: [], features: [] },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("features"))).toBe(true);
  });

  it("rejects empty design styles", () => {
    const result = validateIntakePayload(
      validPayload({
        design: { styles: [], inspirationLink: "" },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("styles"))).toBe(true);
  });

  it("rejects missing payment plan", () => {
    const result = validateIntakePayload(
      validPayload({
        payment: { plan: "", maintenanceAfterFree: "", maintenanceEndAcknowledged: true, voucherCode: "" },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("plan"))).toBe(true);
  });

  it("rejects false confirmations", () => {
    const result = validateIntakePayload(
      validPayload({
        confirmations: {
          accurate: true,
          receipt: false,
          payment: true,
          maintenance: true,
          buildCard: true,
          submission: true,
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("receipt"))).toBe(true);
  });

  it("rejects missing top-level sections", () => {
    const result = validateIntakePayload({});
    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("rejects overly long text fields", () => {
    const result = validateIntakePayload(
      validPayload({
        project: {
          projectName: "Test",
          industry: "Tech",
          projectType: "Web",
          businessDescription: "x".repeat(5001),
        },
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid feature priority", () => {
    const result = validateIntakePayload(
      validPayload({
        content: {
          pages: [],
          features: [{ name: "Feature", priority: "INVALID", source: "chip" }],
        },
      })
    );
    expect(result.success).toBe(false);
  });
});
