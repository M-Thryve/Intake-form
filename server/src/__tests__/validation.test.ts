import { describe, it, expect } from "vitest";
import { validateIntakePayload, validateDraftPayload, validatePhase2Payload } from "../lib/validation.js";

// v3.0 canonical payload. projectType uses v3.0 values; industry is canonical.
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
      industry: "service-commerce",
      projectType: "templated-website",
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
    scope: {
      coreFeatures: [],
      extensions: [],
      pages: [{ name: "Home", fields: { headline: "Welcome" } }],
      features: [],
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
  it("accepts a valid Templated Website payload", () => {
    const result = validateIntakePayload(validPayload());
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("accepts a valid enterprise payload", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "enterprise",
        template: undefined,
        project: {
          projectName: "Enterprise App",
          industry: "service-commerce",
          projectType: "website",
          businessDescription: "An enterprise application",
        },
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
    const result = validateIntakePayload(validPayload({ tier: "custom" }));
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
        project: {
          projectName: "",
          industry: "service-commerce",
          projectType: "templated-website",
          businessDescription: "",
        },
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

  it("rejects legacy template tier (not an active tier in the submit contract)", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "template",
        assets: { qualification: "incomplete", statuses: {}, requestedServices: [] },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "tier")).toBe(true);
  });

  it("rejects Templated Website build without template selection", () => {
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
        project: {
          projectName: "App",
          industry: "service-commerce",
          projectType: "website",
          businessDescription: "",
        },
        enterprise: undefined,
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "enterprise")).toBe(true);
  });

  // v3.0: features are optional — empty array is now valid.
  it("accepts empty features array (v3.0 — features no longer required)", () => {
    const result = validateIntakePayload(
      validPayload({
        content: { pages: [], features: [] },
      })
    );
    expect(result.success).toBe(true);
  });

  it("accepts empty design styles (REV-05 — default-empty payload)", () => {
    const result = validateIntakePayload(
      validPayload({
        design: { styles: [], inspirationLink: "" },
      })
    );
    expect(result.success).toBe(true);
  });

  it("rejects missing payment plan (legacy intakeSubmitSchema — payment still validated)", () => {
    const result = validateIntakePayload(
      validPayload({
        payment: { plan: "", maintenanceAfterFree: "", maintenanceEndAcknowledged: true, voucherCode: "" },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("plan"))).toBe(true);
  });

  it("rejects false confirmations (legacy intakeSubmitSchema)", () => {
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
          industry: "service-commerce",
          projectType: "templated-website",
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

  // ── REV-02: v3.0 project type constants ────────────────────────────────────

  it("REV-02: rejects saas project type for custom tier (not in v3.0 custom types)", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Test",
          industry: "service-commerce",
          projectType: "saas",
          businessDescription: "A SaaS",
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("projectType"))).toBe(true);
    expect(result.errors?.some((e) => e.message.includes("Custom Build"))).toBe(true);
  });

  it("REV-02: rejects webapp project type for custom tier (not in v3.0 custom types)", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Test",
          industry: "service-commerce",
          projectType: "webapp",
          businessDescription: "A web app",
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("projectType"))).toBe(true);
  });

  it("REV-02: rejects mobile project type for custom tier (removed from v3.0)", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Mobile App",
          industry: "service-commerce",
          projectType: "mobile",
          businessDescription: "A mobile app",
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
          industry: "service-commerce",
          projectType: "saas",
          businessDescription: "A SaaS product",
        },
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.message.includes("Enterprise"))).toBe(true);
  });

  it("REV-02: accepts Templated Website project type for custom tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        project: {
          projectName: "Website",
          industry: "service-commerce",
          projectType: "templated-website",
          businessDescription: "A website",
        },
      })
    );
    expect(result.success).toBe(true);
  });

  it("REV-02: accepts AI-Assisted Website project type for custom tier", () => {
    const result = validateIntakePayload(
      validPayload({
        tier: "custom",
        template: undefined,
        project: {
          projectName: "AI Website",
          industry: "service-commerce",
          projectType: "ai-assisted-website",
          businessDescription: "An AI-assisted website",
        },
      })
    );
    expect(result.success).toBe(true);
  });

  it("REV-02: accepts all four v3.0 enterprise project types", () => {
    for (const pt of ["website", "webapp", "ecommerce", "internal"]) {
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
            industry: "service-commerce",
            projectType: pt,
            businessDescription: "Desc",
          },
        })
      );
      expect(result.success).toBe(true);
    }
  });

  it("REV-02: rejects mobile and ai-agent (removed from v3.0 enterprise types)", () => {
    for (const pt of ["mobile", "ai-agent"]) {
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
            industry: "service-commerce",
            projectType: pt,
            businessDescription: "Desc",
          },
        })
      );
      expect(result.success).toBe(false);
    }
  });

  it("Phase 4: rejects legacy 'template' tier", () => {
    const result = validateIntakePayload(validPayload({ tier: "template" }));
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === "tier")).toBe(true);
  });
});

describe("validateDraftPayload", () => {
  // v3.0: email is the single universal hard requirement for draft saves.
  // An empty or missing email → schema-level failure (422); all other gaps
  // are returned as missingRequirements records.

  it("rejects a completely empty object (email is required at schema level)", () => {
    const result = validateDraftPayload({});
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("rejects draft with missing email (schema-level, not a gap record)", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", company: "", phone: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects draft with empty email string", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", company: "", email: "", phone: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects draft with invalid email format", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "notanemail" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts the frontend's empty placeholders when email is present", () => {
    const result = validateDraftPayload({
      client: { fullName: "", company: "", email: "draft@client.com", phone: "" },
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

  it("accepts a minimal draft with valid email", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@test.com" },
    });
    expect(result.success).toBe(true);
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it("returns missingRequirements listing gaps (email validated at schema level, not as a gap)", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@test.com" },
    });
    expect(result.success).toBe(true);
    const fields = result.missingRequirements.map((m) => m.field);
    // Email is valid → NOT in missingRequirements (schema-level validation handled it).
    expect(fields).not.toContain("client.email");
    // Other required fields are missing.
    expect(fields).toContain("project.projectName");
    expect(fields).toContain("tier");
  });

  it("does not list fullName as missing when provided", () => {
    const result = validateDraftPayload({
      client: { fullName: "Juan", email: "juan@test.com" },
    });
    expect(result.success).toBe(true);
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
      client: { fullName: "x".repeat(501), email: "a@b.com" },
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("lists template gaps when projectType is templated-website", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "templated-website" },
      tier: "custom",
    });
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).toContain("template.templateId");
    expect(fields).toContain("template.projectVersion");
  });

  it("does NOT list template gaps when projectType is ai-assisted-website", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "ai-assisted-website" },
      tier: "custom",
    });
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).not.toContain("template.templateId");
    expect(fields).not.toContain("template.projectVersion");
  });

  it("lists enterprise gaps when tier is enterprise", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "website" },
      tier: "enterprise",
    });
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).toContain("enterprise.projectVision");
    expect(fields).toContain("enterprise.targetUsers");
  });

  it("reports non-canonical industry as a missing requirement", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "Technology", projectType: "templated-website" },
      tier: "custom",
    });
    expect(result.success).toBe(true);
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).toContain("project.industry");
  });

  it("reports unknown extension codes as missing requirements", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "templated-website" },
      tier: "custom",
      scope: { extensions: ["EXT-001", "UNKNOWN-CODE"] },
    });
    expect(result.success).toBe(true);
    const messages = result.missingRequirements.map((m) => m.message);
    expect(messages.some((m) => m.includes("UNKNOWN-CODE"))).toBe(true);
  });

  it("accepts valid extension codes without reporting gaps", () => {
    const result = validateDraftPayload({
      client: { fullName: "Juan", email: "juan@test.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "templated-website" },
      tier: "custom",
      template: { templateId: "starter", projectVersion: "desktop", colorPreset: "" },
      assets: { qualification: "ready", statuses: {}, requestedServices: [] },
      scope: { extensions: ["EXT-001", "EXT-003", "EXT-007"] },
    });
    expect(result.success).toBe(true);
    const messages = result.missingRequirements.map((m) => m.message);
    expect(messages.some((m) => m.includes("Unknown extension code"))).toBe(false);
  });

  // v3.0: payment plan and confirmations are NOT required for draft saves.
  it("does NOT report payment.plan as a missing requirement", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "templated-website" },
      tier: "custom",
      payment: { plan: "" },
    });
    expect(result.success).toBe(true);
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields).not.toContain("payment.plan");
  });

  it("does NOT report confirmations as missing requirements", () => {
    const result = validateDraftPayload({
      client: { fullName: "A", email: "a@b.com" },
      project: { projectName: "P", industry: "service-commerce", projectType: "templated-website" },
      tier: "custom",
      confirmations: { accurate: false, receipt: false, payment: false, maintenance: false, buildCard: false, submission: false },
    });
    expect(result.success).toBe(true);
    const fields = result.missingRequirements.map((m) => m.field);
    expect(fields.some((f) => f.startsWith("confirmations"))).toBe(false);
  });
});

describe("validatePhase2Payload", () => {
  it("accepts a complete v3.0 submission without legacy payment or confirmation controls", () => {
    const result = validatePhase2Payload({
      client: { fullName: "A", company: "", email: "a@example.com", phone: "" },
      project: {
        projectName: "Project",
        industry: "service-commerce",
        projectType: "templated-website",
        businessDescription: "",
      },
      assets: { qualification: "ready", statuses: {}, requestedServices: [] },
      tier: "custom",
      template: { templateId: "starter", projectVersion: "desktop", colorPreset: "" },
      content: { pages: [], features: [] },
      design: { styles: [], inspirationLink: "" },
    });

    expect(result.success).toBe(true);
  });

  it("accepts an AI-Assisted Website build without template", () => {
    const result = validatePhase2Payload({
      client: { fullName: "A", company: "", email: "a@example.com", phone: "" },
      project: {
        projectName: "AI Site",
        industry: "service-commerce",
        projectType: "ai-assisted-website",
        businessDescription: "",
      },
      assets: { qualification: "ready", statuses: {}, requestedServices: [] },
      tier: "custom",
      websiteQuestionnaire: {
        primaryGoal: "Drive leads for the business",
        visitorAction: "Fill out a contact form",
        websitePurpose: ["generate-leads"],
      },
      content: { pages: [], features: [] },
      design: { styles: [], inspirationLink: "" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown project type for custom tier", () => {
    const result = validatePhase2Payload({
      client: { fullName: "A", company: "", email: "a@example.com", phone: "" },
      project: {
        projectName: "Project",
        industry: "service-commerce",
        projectType: "mobile",
        businessDescription: "",
      },
      assets: { qualification: "ready", statuses: {}, requestedServices: [] },
      tier: "custom",
      content: { pages: [], features: [] },
      design: { styles: [], inspirationLink: "" },
    });

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field.includes("projectType"))).toBe(true);
  });
});
