import { describe, expect, it } from "vitest"
import { toSubmissionPayload } from "../api/intake"
import type { FormData } from "../types/intake"

function formWithV2Assets(): FormData {
  return {
    fullName: "A",
    company: "",
    email: "a@example.com",
    phone: "",
    projectName: "Project",
    industry: "Tech",
    projectType: "website",
    businessDesc: "",
    assetQualification: "",
    assetStatuses: {},
    selectedAssetServices: [],
    deckExists: "partial",
    deckSectionStatuses: { overview: "available" },
    deckSectionNotes: {},
    resourceStatuses: { logo: "available" },
    resourceNotes: {},
    resourceAddOnCosts: {},
    tier: "custom",
    templateCategory: "",
    templateId: "starter",
    projectVersion: "desktop",
    colorPreset: "",
    customSizes: false,
    allSizes: false,
    projectVision: "",
    targetUsers: "",
    userRoles: "",
    businessWorkflows: "",
    integrations: "",
    existingSystems: "",
    dataSecurityReqs: "",
    scalabilityReqs: "",
    designInspiration: "",
    competitors: "",
    successCriteria: "",
    features: ["Contact Form"],
    featurePriorities: { "Contact Form": "Required" },
    customFeatures: [], selectedExtensions: [],
    designStyles: [],
    inspirationLink: "",
    paymentPlan: "",
    voucherCode: "",
    voucherStatus: "",
    maintenanceAfterFree: "",
    maintenanceEndAcknowledged: false,
    preferredBillingDate: "",
    confirmAccurate: false,
    confirmReceipt: false,
    confirmPayment: false,
    confirmMaintenance: false,
    confirmBuildCard: false,
    confirmSubmission: false,
  }
}

describe("intake API payload mapping", () => {
  it("maps v2 structured assets into the legacy-compatible submit contract", () => {
    const payload = toSubmissionPayload(formWithV2Assets(), {}, "submitted")

    expect(payload.assets.qualification).toBe("ready")
    expect(payload.assets.statuses).toEqual({
      logo: "available",
      "deck.overview": "available",
    })
  })
})
