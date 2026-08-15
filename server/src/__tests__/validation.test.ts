import { describe, it, expect } from "vitest";
import { validateIntakePayload, validateDraftPayload, validatePhase2Payload } from "../lib/validation.js";

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
      projectType: "website",
      businessDescription: "A test application",
    },
    assets: {
      qualification: "ready",
      statuses: { logo: "Available", colors: "Available" },
      requestedServices: [],
    },
    tier: "custom",
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

  it("rejects legacy template tier (not an active tier)", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "template",
        assets: { qualification: "incomplete", statuses: {}, requestedServices: [] },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "tier")).toBe(true);
  });

  // Previous template+incomplete test replaced by the above (template tier itself is rejected).

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

  it("accepts empty design styles (REV-05 — default-empty payload)", () => {
    const result = validateIntakePayload(
      validPayload({
        design: { styles: [], inspirationLink: "" },
      })
    );
    expect(result.success).toBe(true);
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

  // ── Phase 4 Delta: New test cases ──────────────────────────────────────

  it("REV-02: rejects saas project type for custom tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Test",
          industry: "Tech",
          projectType: "saas",
          businessDescription: "A SaaS",
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("projectType"))).toBe(true);
    expect(result.errors?.some((e) => e.message.includes("Custom Build"))).toBe(true);
  });

  it("REV-02: rejects webapp project type for custom tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Test",
          industry: "Tech",
          projectType: "webapp",
          businessDescription: "A web app",
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("projectType"))).toBe(true);
  });

  it("REV-02: rejects saas project type for enterprise tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "enterprise",
        template: undefined,
        enterprise: {
          projectVision: "Platform",
          targetUsers: "Teams",
          userRoles: "Admin",
          businessWorkflows: "Workflow",
          integrations: "",
          existingSystems: "",
          dataSecurityRequirements: "",
          scalabilityRequirements: "",
          designInspiration: "",
          competitors: "",
          successCriteria: "",
        },
        project: {
          projectName: "SaaS Product",
          industry: "Tech",
          projectType: "saas",
          businessDescription: "A SaaS product",
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.message.includes("Enterprise Level"))).toBe(true);
  });

  it("REV-02: accepts website project type for custom tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Website",
          industry: "Tech",
          projectType: "website",
          businessDescription: "A website",
        },
      })
    );
    expect(result.success).toBe(true);
  });

  it("REV-02: accepts mobile project type for custom tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Mobile App",
          industry: "Tech",
          projectType: "mobile",
          businessDescription: "A mobile app",
        },
      })
    );
    expect(result.success).toBe(true);
  });

  it("REV-02: accepts all six enterprise project types", () => {
    for (const pt of ["website", "webapp", "mobile", "ai-agent", "ecommerce", "internal"]) {
      const result = validateIntakePayload(
        validPayload({
          tier: "enterprise",
          template: undefined,
          enterprise: {
            projectVision: "Platform",
            targetUsers: "Teams",
            userRoles: "Admin",
            businessWorkflows: "Wf",
            integrations: "",
            existingSystems: "",
            dataSecurityRequirements: "",
            scalabilityRequirements: "",
            designInspiration: "",
            competitors: "",
            successCriteria: "",
          },
          project: {
            projectName: "Project",
            industry: "Tech",
            projectType: pt,
            businessDescription: "Desc",
          },
        })
      );
      expect(result.success).toBe(true);
    }
  });

  it("Phase 4: rejects legacy 'template' tier", () => {
    const result = validateIntakePayload(
      validPayload({ tier: "template" })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "tier")).toBe(true);
  });
});

describe("validateDraftPayload", () => {
  it("accepts the frontend's empty placeholders and reports them as gaps", () => {
    const result = validateDraftPayload({
      client: { fullName: "", company: "", email: "", phone: "" },
      project: { projectName: "", industry: "", projectType: "", businessDescription: "" },
      tier: "",
      assets: { qualification: "", statuses: {}, requestedServices: [] },
      template: { templateId: "", projectVersion: "", colorPreset: "" },
      content: { pages: [], features: [] },
      design: { styles: [], inspirationLink: "" },
      payment: { plan: "", maintenanceAfterFree: "", maintenanceEndAcknowledged: false, voucherCode: "" },
      confirmations: {
        accurate: false,
        receipt: false,
        payment: false,
        maintenance: false,
        buildCard: false,
        submission: false,
      },
    });

    expect(result.success).toBe(true);
    expect(result.missingRequirements.map((item) => item.field)).toContain("tier");
  });

  it("accepts a minimal draft with only clientName", () => {
    const result = validateDraftPayload({ client: { fullName: "A" } });
    expect(result.success).toBe(true);
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it("accepts a completely empty object", () => {
    const result = validateDraftPayload({});
    expect(result.success).toBe(true);
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it("returns missingRequirements listing all gaps", () => {
    const result = validateDraftPayload({ client: { fullName: "A" } });
    expect(result.success).toBe(true);
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).toContain("client.email");
    expect(fields).toContain("project.projectName");
    expect(fields).toContain("tier");
  });

  it("does not list fullName as missing when provided", () => {
    const result = validateDraftPayload({ client: { fullName: "Juan" } });
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).not.toContain("client.fullName");
  });

  it("accepts a full valid payload with zero gaps", () => {
    const result = validateDraftPayload(validPayload());
    expect(result.success).toBe(true);
    expect(result.missingRequirements.length).toBe(0);
  });

  it("rejects payloads that violate shape constraints (field too long)", () => {
    const result = validateDraftPayload({
      client: { fullName: "x".repeat(501) },
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("lists custom-tier template gaps when tier is custom", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "Tech", projectType: "website" },
      tier: "custom",
    });
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).toContain("template.templateId");
    expect(fields).toContain("template.projectVersion");
  });

  it("lists enterprise gaps when tier is enterprise", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "Tech", projectType: "website" },
      tier: "enterprise",
    });
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).toContain("enterprise.projectVision");
    expect(fields).toContain("enterprise.targetUsers");
  });
});

describe("validatePhase2Payload", () => {
  it("accepts a complete v2 submission without legacy payment or confirmation controls", () => {
    const result = validatePhase2Payload({
      client: { fullName: "A", company: "", email: "a@example.com", phone: "" },
      project: { projectName: "Project", industry: "Tech", projectType: "website", businessDescription: "" },
      assets: { qualification: "ready", statuses: {}, requestedServices: [] },
      tier: "custom",
      template: { templateId: "starter", projectVersion: "desktop", colorPreset: "" },
      content: { pages: [], features: [{ name: "Feature", priority: "Required", source: "chip" }] },
      design: { styles: [], inspirationLink: "" },
    });

    expect(result.success).toBe(true);
  });
});
