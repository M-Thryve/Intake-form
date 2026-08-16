// ── Canonical Intake Form Types (v3.0) ──
//
// v3.0 introduces the Website-Only Custom Build: two Custom project types
// (Templated Website and AI-Assisted Website) and four Enterprise types.
// Payment capture is permanently removed from the active contract.
// Legacy tier/payment fields remain readable through the compatibility
// layer in `src/api/intake.ts`.

// ── Build Path ─────────────────────────────────────────────────────────────

/** Active build path for new intakes. */
export type BuildPath = 'custom' | 'enterprise'

/**
 * Legacy tier union kept for reading historical records. The legacy 'template'
 * value maps to 'custom' when normalized to a v3.0 payload.
 *
 * @deprecated Use `BuildPath` for new intakes.
 */
export type Tier = 'template' | 'custom' | 'enterprise' | ''

// ── v3.0 Project Types ─────────────────────────────────────────────────────

/** v3.0 Custom Build project types — Website-Only paths. */
export type CustomProjectType = 'templated-website' | 'ai-assisted-website'

/** v3.0 Enterprise Build project types. */
export type EnterpriseProjectType = 'website' | 'webapp' | 'ecommerce' | 'internal'

/** All v3.0 active project types — union of Custom and Enterprise paths. */
export type ProjectType = CustomProjectType | EnterpriseProjectType

// ── v3.0 Canonical Industries ──────────────────────────────────────────────

/** Seven canonical industry values. New records must use exactly these slugs. */
export type Industry =
  | 'service-commerce'
  | 'dtc-ecommerce'
  | 'retail-multi-branch'
  | 'wholesale-distribution'
  | 'manufacturing-fabrication'
  | 'warehousing-storage'
  | 'logistics-transportation'

// ── v3.0 Feature Codes ─────────────────────────────────────────────────────

/** Factory core features — always included, never selectable by the operator. */
export type CoreFeatureCode =
  | 'Core001'
  | 'Core002'
  | 'Core003'
  | 'Core004'
  | 'Core005'
  | 'Core006'
  | 'Core007'
  | 'Core008'

/** Optional website extension codes selectable for Custom builds. */
export type ExtensionCode =
  | 'EXT-001'
  | 'EXT-002'
  | 'EXT-003'
  | 'EXT-004'
  | 'EXT-005'
  | 'EXT-006'
  | 'EXT-007'
  | 'EXT-008'
  | 'EXT-009'
  | 'EXT-010'
  | 'EXT-011'

/** Feature category for browsing — not persisted as scope. */
export type FeatureCategory =
  | 'crm'
  | 'catalog'
  | 'sales'
  | 'operations'
  | 'scheduling'
  | 'inventory'
  | 'documents'
  | 'workflow'
  | 'billing'
  | 'engagement'
  | 'analytics'
  | 'administration'
  | 'integrations'

// ── v3.0 Website Questionnaire ─────────────────────────────────────────────
//
// Collected for `ai-assisted-website` builds only.
// Every field is optional at draft time; submit validation enforces
// `primaryGoal`, `visitorAction`, and `websitePurpose`.

export interface WebsiteQuestionnaire {
  // Business & Objectives
  businessDescription?: string
  primaryGoal?: string
  visitorAction?: string
  websitePurpose?: string[]
  websitePurposeOther?: string
  // Visual Direction
  feel?: string[]
  // Typography
  fontPreference?: string
  fontNames?: string
  // Color
  hasBrandColors?: string
  brandColors?: string
  colorMode?: string
  // Layout
  density?: string
  gridStyle?: string
  // Components & UI Style
  buttonStyle?: string
  cardStyle?: string
  shadowStyle?: string
  gradientStyle?: string
  // Motion & Interaction
  transitions?: string
  interactivity?: string
  hoverEffects?: string
  notes?: string
}

// ── v3.0 Uploaded Asset Reference ─────────────────────────────────────────

/** Reference to a file uploaded to storage. Never contains raw content. */
export interface UploadedAssetRef {
  storageKey: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  uploadedAt?: string
}

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

// ── Step / Flow (v3.0) ─────────────────────────────────────────────────────

/**
 * v3.0 step ids. `payment`, `final-confirm`, and `draft-saved` are included
 * for type completeness; only `draft-saved` is part of the active flow.
 * `payment` and `final-confirm` are retained for legacy render compatibility.
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
  | 'draft-saved'
  /** @deprecated v1.x payment step removed from v2.0 flow */
  | 'payment'
  /** @deprecated v1.x final-confirmation step removed from v2.0 flow */
  | 'final-confirm'

// ── UI Form State ──────────────────────────────────────────────────────────
//
// FormData is the operator-facing wizard state model. Payment/voucher/
// maintenance/confirmation fields are @deprecated; they remain to preserve
// existing UI compile and MUST be removed as part of the Phase 2 UX redesign.
// `featurePriorities` is deprecated in v3.0 — scope is expressed via
// `selectedExtensions` (EXT-xxx codes), not feature+priority pairs.

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

  // Template (Custom Build — Templated Website only)
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

  // v3.0 scope — Website-Only Custom Build
  /** Selected extension codes (EXT-xxx) for website builds. */
  selectedExtensions: string[]
  /**
   * Questionnaire answers for ai-assisted-website.
   * Only populated when projectType is `ai-assisted-website`.
   */
  websiteQuestionnaire?: WebsiteQuestionnaire

  // Legacy features (Enterprise / v2.0 phases)
  features: string[]
  /**
   * Per-feature priority labels. Deprecated in v3.0 — Custom builds no
   * longer collect priority. Retained to compile existing Enterprise UI code.
   *
   * @deprecated v3.0 scope uses selectedExtensions, not feature+priority pairs.
   */
  featurePriorities: Record<string, string>
  customFeatures: string[]

  // Design
  designStyles: string[]
  inspirationLink: string

  // Outcome / v3.0
  outcome?: IntakeOutcome
  discardReason?: DiscardReason
  operatorNotes?: OperatorNote[]
  missingRequirements?: MissingRequirement[]

  // ── Legacy v1.x payment fields (removed from v2.0/v3.0 contract) ──
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

// ── v3.0 Intake Submission Payload ─────────────────────────────────────────
//
// `payment` and `confirmations` are optional for read compatibility with
// legacy stored records. New v3.0 submissions omit both fields. The
// `fromLegacyPayload` compat mapper still populates them for historical reads.
// `content` is optional — v3.0 submissions use `scope` instead.

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
  assets: {
    qualification: string
    statuses: Record<string, AssetReadiness | string>
    requestedServices: string[]
    checklist?: AssetChecklistItem[]
  }
  /** @deprecated v3.0 uses `scope` instead. Retained for reading legacy records. */
  content?: {
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
  /** @deprecated Removed from v3.0 active contract. Retained for read compatibility. */
  payment?: {
    plan: string
    maintenanceAfterFree: string
    maintenanceEndAcknowledged: boolean
    voucherCode: string
  }
  /** @deprecated Removed from v3.0 active contract. Retained for read compatibility. */
  confirmations?: {
    accurate: boolean
    receipt: boolean
    payment: boolean
    maintenance: boolean
    buildCard: boolean
    submission: boolean
  }
  /** Active build path derived from tier. Populated by v3.0 mapper. */
  buildPath?: BuildPath
  /**
   * v3.0 scope — replaces `content` for new intakes.
   * `coreFeatures` lists the always-included Core001..Core008 codes.
   * `extensions` lists the operator-selected EXT-xxx codes.
   */
  scope?: {
    pages: Array<{ name: string; fields: Record<string, string> }>
    features: Array<{
      name: string
      priority: string
      source: string
      preliminaryCost?: number
      note?: string
    }>
    /** Always-included core feature codes. */
    coreFeatures?: string[]
    /** Operator-selected extension codes. */
    extensions?: string[]
  }
  /** Website questionnaire answers for ai-assisted-website builds. */
  websiteQuestionnaire?: WebsiteQuestionnaire
  outcome?: IntakeOutcome
  discardReason?: DiscardReason
  missingRequirements?: MissingRequirement[]
  operatorNotes?: OperatorNote[]
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
  clientId?: string
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
// `src/api/intake.ts` normalizes these into the v3.0 shape for reads.

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
