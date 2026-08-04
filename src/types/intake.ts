// ── Canonical Intake Form Types ──

export type Tier = 'template' | 'custom' | 'enterprise' | ''

export type StepId =
  | 'intro' | 'client-details' | 'company-assets' | 'build-approach'
  | 'template-select' | 'enterprise-vision' | 'pages-features'
  | 'design' | 'review' | 'payment' | 'final-confirm' | 'build-card'

export interface FormData {
  // Client
  fullName: string
  company: string
  email: string
  phone: string
  projectName: string
  industry: string
  projectType: string
  businessDesc: string

  // Company assets
  assetQualification: string
  assetStatuses: Record<string, string>
  selectedAssetServices: string[]

  // Build approach
  tier: Tier

  // Template
  templateCategory: string
  templateId: string
  projectVersion: string
  colorPreset: string
  customSizes: boolean
  allSizes: boolean

  // Enterprise vision
  projectVision: string
  targetUsers: string
  userRoles: string
  businessWorkflows: string
  integrations: string
  existingSystems: string
  dataSecurityReqs: string
  scalabilityReqs: string
  designInspiration: string
  competitors: string
  successCriteria: string

  // Features
  features: string[]
  featurePriorities: Record<string, string>
  customFeatures: string[]

  // Design
  designStyles: string[]
  inspirationLink: string

  // Payment
  paymentPlan: string
  voucherCode: string
  voucherStatus: string
  maintenanceAfterFree: string
  maintenanceEndAcknowledged: boolean
  preferredBillingDate: string

  // Final confirm checkboxes
  confirmAccurate: boolean
  confirmReceipt: boolean
  confirmPayment: boolean
  confirmMaintenance: boolean
  confirmBuildCard: boolean
  confirmSubmission: boolean
}

export interface IntakeSubmissionPayload {
  client: {
    fullName: string
    company: string
    email: string
    phone: string
  }
  project: {
    projectName: string
    industry: string
    projectType: string
    businessDescription: string
  }
  assets: {
    qualification: string
    statuses: Record<string, string>
    requestedServices: string[]
  }
  tier: Tier
  template?: {
    templateId: string
    projectVersion: string
    colorPreset: string
  }
  enterprise?: {
    projectVision: string
    targetUsers: string
    userRoles: string
    businessWorkflows: string
    integrations: string
    existingSystems: string
    dataSecurityRequirements: string
    scalabilityRequirements: string
    designInspiration: string
    competitors: string
    successCriteria: string
  }
  content: {
    pages: Array<{ name: string; fields: Record<string, string> }>
    features: Array<{ name: string; priority: string; source: string }>
  }
  design: {
    styles: string[]
    inspirationLink: string
  }
  payment: {
    plan: string
    maintenanceAfterFree: string
    maintenanceEndAcknowledged: boolean
    voucherCode: string
  }
  confirmations: {
    accurate: boolean
    receipt: boolean
    payment: boolean
    maintenance: boolean
    buildCard: boolean
    submission: boolean
  }
}

export interface IntakeSubmissionResponse {
  success: boolean
  buildReferenceNumber?: string
  intakeId?: string
  status?: string
  preliminaryBuildCard?: Record<string, unknown>
  error?: string
}

export interface ValidationError {
  field?: string
  message: string
}
