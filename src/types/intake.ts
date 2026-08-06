// ── Canonical Intake Form Types (v2.0) ──
//
// v2.0 restricts new intakes to the "custom" and "enterprise" build paths and
// removes payment capture from the active contract. Legacy tier/payment fields
// remain readable through the compatibility layer in `src/api/intake.ts`.

// ── Build Path ─────────────────────────────────────────────────────────────

/** Active build path for new v2.0 intakes. */
export type BuildPath = 'custom' | 'enterprise'

/**
 * Legacy tier union kept for reading historical records and for the current
 * UI form state during the Phase 1 -> Phase 2 transition. The legacy 'template'
 * value maps to 'custom' when normalized to a v2 payload.
 *
 * @deprecated Use `BuildPath` for new intakes.
 */
export type Tier = 'template' | 'custom' | 'enterprise' | ''

// ── Intake Outcomes ────────────────────────────────────────────────────────

/** Terminal outcome selected by the operator at the end of a discovery call. */
export type IntakeOutcome = 'discarded' | 'draft' | 'submitted'

/** Full lifecycle status persisted server-side. */
export type IntakeStatus =
  | 'in_progress'
  | 'draft'
  | 'submitted'
  | 'waiting_owner_review'
  | 'needs_revision'
  | 'approved'
  | 'rejected'
  | 'discarded'

// ── Missing Requirements ───────────────────────────────────────────────────

export type RequirementSeverity = 'required' | 'recommended' | 'follow_up'

export type RequirementStatus =
  | 'missing'
  | 'pending'
  | 'provide_later'
  | 'resolved'
  | 'waived'

/** Broad categorization of intake requirements. */
export type RequirementCategory =
  | 'client'
  | 'project'
  | 'build_path'
  | 'brand_identity'
  | 'company_content'
  | 'product_content'
  | 'media'
  | 'references'
  | 'legal_compliance'
  | 'technical'
  | 'company_deck'
  | 'design'
  | 'scope'
  | 'other'

/** Normalized record for a gap identified during draft/submit validation. */
export interface MissingRequirement {
  key: string
  label: string
  category: RequirementCategory
  section: string
  severity: RequirementSeverity
  status: RequirementStatus
  owner?: string
  nextAction?: string
  note?: string
  /** Preliminary cost when the operator marked this as an M-THRYVE add-on. */
  preliminaryCost?: number
}

// ── Operator Notes ─────────────────────────────────────────────────────────

export type OperatorNoteKind =
  | 'discovery'
  | 'follow_up'
  | 'assumption'
  | 'disposition'

export interface OperatorNote {
  kind: OperatorNoteKind
  section?: string
  note: string
  createdAt?: string
}

// ── Discard Reason ─────────────────────────────────────────────────────────

export type DiscardReasonCode =
  | 'not_proceeding'
  | 'out_of_scope'
  | 'budget'
  | 'timing'
  | 'duplicate'
  | 'other'

export interface DiscardReason {
  code: DiscardReasonCode
  note?: string
}

// ── Asset / Resource Readiness ─────────────────────────────────────────────

/** Availability state for a required or optional intake asset. */
export type AssetReadiness =
  | 'available'
  | 'missing'
  | 'provide_later'
  | 'not_applicable'
  | 'm_thryve_add_on'

export interface AssetChecklistItem {
  id: string
  label: string
  severity: RequirementSeverity
  status: AssetReadiness
  storageReference?: string
  note?: string
}

// ── Outcome Metadata ───────────────────────────────────────────────────────

export interface OutcomeMetadata {
  outcome: IntakeOutcome
  status?: IntakeStatus
  decidedAt?: string
  decidedBy?: string
  reason?: DiscardReason
}

// ── Step / Flow (v2.0) ─────────────────────────────────────────────────────

/**
 * v2.0 step ids. `payment` and `final-confirm` are retained in the union only
 * so the existing UI can render/reference them during Phase 1; they are not
 * part of `getFlow()` and should be removed once Phase 2 UX lands.
 */
export type StepId =
  | 'intro'
  | 'client-details'
  | 'company-assets'
  | 'build-approach'
  | 'template-select'
  | 'enterprise-vision'
  | 'pages-features'
  | 'design'
  | 'review'
  | 'outcome'
  | 'build-card'
  /** @deprecated v1.x payment step removed from v2.0 flow */
  | 'payment'
  /** @deprecated v1.x final-confirmation step removed from v2.0 flow */
  | 'final-confirm'

// ── UI Form State ──────────────────────────────────────────────────────────
//
// FormData is the operator-facing wizard state model. Payment/voucher/
// maintenance/confirmation fields are marked @deprecated: they remain to
// preserve the existing UI compile during Phase 1 and MUST be removed as
// part of the Phase 2 UX redesign.

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
  /** @deprecated legacy v1 pill state; superseded by resourceStatuses in v2 */
  assetStatuses: Record<string, string>
  selectedAssetServices: string[]

  // v2 structured asset & deck state
  /** Does a company deck exist at all? 'yes' | 'partial' | 'no' | 'add_on' */
  deckExists: string
  /** Per-deck-section availability, keyed by section id. */
  deckSectionStatuses: Record<string, AssetReadiness>
  /** Per-deck-section operator notes. */
  deckSectionNotes: Record<string, string>
  /** Per-resource availability, keyed by resource id. */
  resourceStatuses: Record<string, AssetReadiness>
  /** Per-resource operator notes (context, follow-up owner, verbatim client statement). */
  resourceNotes: Record<string, string>
  /** Preliminary add-on cost captured for `m_thryve_add_on` items. */
  resourceAddOnCosts: Record<string, number>

  // Build approach
  tier: Tier

  // Template (Custom Build)
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

  // Outcome / v2.0
  outcome?: IntakeOutcome
  discardReason?: DiscardReason
  operatorNotes?: OperatorNote[]
  missingRequirements?: MissingRequirement[]

  // ── Legacy v1.x payment fields (removed from v2.0 contract) ──
  /** @deprecated Removed from v2.0 intake contract. */
  paymentPlan: string
  /** @deprecated Removed from v2.0 intake contract. */
  voucherCode: string
  /** @deprecated Removed from v2.0 intake contract. */
  voucherStatus: string
  /** @deprecated Removed from v2.0 intake contract. */
  maintenanceAfterFree: string
  /** @deprecated Removed from v2.0 intake contract. */
  maintenanceEndAcknowledged: boolean
  /** @deprecated Removed from v2.0 intake contract. */
  preferredBillingDate: string

  // ── Legacy v1.x final confirmation checkboxes (removed) ──
  /** @deprecated Removed from v2.0 intake contract. */
  confirmAccurate: boolean
  /** @deprecated Removed from v2.0 intake contract. */
  confirmReceipt: boolean
  /** @deprecated Removed from v2.0 intake contract. */
  confirmPayment: boolean
  /** @deprecated Removed from v2.0 intake contract. */
  confirmMaintenance: boolean
  /** @deprecated Removed from v2.0 intake contract. */
  confirmBuildCard: boolean
  /** @deprecated Removed from v2.0 intake contract. */
  confirmSubmission: boolean
}

// ── v2.0 Intake Submission Payload ─────────────────────────────────────────

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
  buildPath: BuildPath
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
  assets: {
    qualification: string
    statuses: Record<string, AssetReadiness | string>
    requestedServices: string[]
    checklist?: AssetChecklistItem[]
  }
  scope: {
    pages: Array<{ name: string; fields: Record<string, string> }>
    features: Array<{
      name: string
      priority: string
      source: string
      preliminaryCost?: number
      note?: string
    }>
  }
  design: {
    styles: string[]
    inspirationLink: string
  }
  outcome: IntakeOutcome
  discardReason?: DiscardReason
  missingRequirements: MissingRequirement[]
  operatorNotes: OperatorNote[]
  sourceMetadata?: {
    operator?: string
    appointmentId?: string
    submittedAt?: string
    importedFrom?: string
  }
}

export interface IntakeSubmissionResponse {
  success: boolean
  buildReferenceNumber?: string
  intakeId?: string
  status?: IntakeStatus
  outcome?: IntakeOutcome
  preliminaryBuildCard?: Record<string, unknown>
  missingRequirements?: MissingRequirement[]
  error?: string
}

export interface ValidationError {
  field?: string
  message: string
  requirementKey?: string
}

// ── Legacy Compatibility ───────────────────────────────────────────────────
//
// Legacy stored records may include the historical 'template' tier and
// payment/voucher/maintenance groups. The compatibility layer in
// `src/api/intake.ts` normalizes these into the v2.0 shape for reads.

/** @deprecated v1.x payload shape, retained for read compatibility. */
export interface LegacyIntakePayload {
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
  /** Legacy tier — may include 'template' (Drag & Drop). */
  tier: Tier
  template?: {
    templateId: string
    projectVersion: string
    colorPreset: string
  }
  enterprise?: IntakeSubmissionPayload['enterprise']
  content?: {
    pages: Array<{ name: string; fields: Record<string, string> }>
    features: Array<{ name: string; priority: string; source: string }>
  }
  design?: {
    styles: string[]
    inspirationLink: string
  }
  /** @deprecated Removed in v2.0. */
  payment?: {
    plan: string
    maintenanceAfterFree: string
    maintenanceEndAcknowledged: boolean
    voucherCode: string
  }
  /** @deprecated Removed in v2.0. */
  confirmations?: {
    accurate: boolean
    receipt: boolean
    payment: boolean
    maintenance: boolean
    buildCard: boolean
    submission: boolean
  }
}
