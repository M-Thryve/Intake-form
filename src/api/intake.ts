import type {
  FormData,
  IntakeSubmissionPayload,
  IntakeSubmissionResponse,
  IntakeOutcome,
  IntakeStatus,
  LegacyIntakePayload,
  AssetReadiness,
  DiscardReason,
  BuildPath,
  IntakeDraftRecord,
  IntakeDraftResponse,
  StepId,
} from '../types/intake'
import { CORE_FEATURE_CODES } from '../data/features'
import { getApiAuthHeaders } from './auth'

// Keep local development same-origin so Vite can proxy /api to localhost:3200.
// Deployments can point the static frontend at the separately hosted API by
// setting VITE_API_BASE_URL (for example, https://api.example.com).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const API_ENDPOINT = '/api/intakes'

/**
 * v3.0 payload mapper. Payment and final confirmations are omitted — they
 * are no longer part of the active intake contract. The legacy
 * `fromLegacyPayload` mapper retains those fields for historical reads.
 */
export function toSubmissionPayload(
  formData: FormData,
  pageContents: Record<string, Record<string, string>>,
  outcome: IntakeOutcome = 'draft',
  lastEditedStep?: StepId,
): IntakeSubmissionPayload {
  const pages = Object.entries(pageContents).map(([name, fields]) => ({ name, fields }))
  const structuredAssetStatuses = {
    ...formData.assetStatuses,
    ...formData.resourceStatuses,
    ...Object.fromEntries(
      Object.entries(formData.deckSectionStatuses).map(([key, status]) => [`deck.${key}`, status]),
    ),
  }
  const assetQualification = formData.assetQualification || (
    Object.keys(structuredAssetStatuses).length > 0 ? 'ready' : 'incomplete'
  )

  const tierForServer = formData.tier === 'template' ? 'custom' : formData.tier
  const buildPath: BuildPath = formData.tier === 'enterprise' ? 'enterprise' : 'custom'

  const coreFeatureCodes = Array.from(CORE_FEATURE_CODES)
  const selectedExtensions = formData.selectedExtensions ?? []

  const payload: IntakeSubmissionPayload = {
    client: {
      fullName: formData.fullName,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
    },
    project: {
      projectName: formData.projectName,
      industry: formData.industry,
      projectType: formData.projectType,
      businessDescription: formData.businessDesc,
    },
    tier: tierForServer,
    buildPath,
    assets: {
      qualification: assetQualification,
      statuses: structuredAssetStatuses,
      requestedServices: formData.selectedAssetServices,
      uploads: formData.uploadedAssets ?? [],
      deckExists: formData.deckExists,
      deckSectionNotes: formData.deckSectionNotes,
      resourceNotes: formData.resourceNotes,
      resourceAddOnCosts: formData.resourceAddOnCosts,
    },
    design: {
      styles: formData.designStyles,
      inspirationLink: formData.inspirationLink,
    },
    content: {
      pages,
      features: [
        ...coreFeatureCodes.map(code => ({ name: code, priority: 'Required' as const, source: 'chip' as const })),
        ...selectedExtensions.map(code => ({ name: code, priority: 'Required' as const, source: 'chip' as const })),
        ...(formData.customFeatures ?? []).map(name => ({ name, priority: 'Need Help Deciding' as const, source: 'custom' as const })),
      ],
    },
    scope: {
      pages,
      features: [],
      coreFeatures: coreFeatureCodes,
      extensions: selectedExtensions,
      customFeatures: formData.customFeatures ?? [],
    },
    payment: {
      plan: '',
      maintenanceAfterFree: '',
      maintenanceEndAcknowledged: false,
      voucherCode: '',
    },
    confirmations: {
      accurate: false,
      receipt: false,
      payment: false,
      maintenance: false,
      buildCard: false,
      submission: false,
    },
    outcome,
    missingRequirements: formData.missingRequirements ?? [],
    operatorNotes: formData.operatorNotes ?? [],
    ...(formData.intakeId ? { intakeId: formData.intakeId } : {}),
    sourceMetadata: {
      submittedAt: new Date().toISOString(),
      ...(lastEditedStep ? { lastEditedStep } : {}),
    },
  }

  // Template block: only for Templated Website builds.
  // v3.1: projectVersion is no longer collected or submitted. Historical
  // records keep their stored value server-side; it is never rewritten here.
  if (formData.projectType === 'templated-website') {
    payload.template = {
      templateId: formData.templateId,
      colorPreset: formData.colorPreset,
    }
  }

  // Enterprise block: only for enterprise build path.
  if (formData.tier === 'enterprise') {
    payload.enterprise = {
      projectVision: formData.projectVision,
      targetUsers: formData.targetUsers,
      userRoles: formData.userRoles,
      businessWorkflows: formData.businessWorkflows,
      integrations: formData.integrations,
      existingSystems: formData.existingSystems,
      dataSecurityRequirements: formData.dataSecurityReqs,
      scalabilityRequirements: formData.scalabilityReqs,
      designInspiration: formData.designInspiration,
      competitors: formData.competitors,
      successCriteria: formData.successCriteria,
    }
  }

  // Questionnaire: AI-Assisted Website only. Templated Website uses a base template
  // and does not collect questionnaire answers.
  if (formData.projectType === 'ai-assisted-website' && formData.websiteQuestionnaire) {
    payload.websiteQuestionnaire = formData.websiteQuestionnaire
  }

  return payload
}

/**
 * Compatibility mapper: normalizes a legacy stored record into the Phase 2
 * IntakeSubmissionPayload shape. Read-only — legacy records are never used to
 * create new submissions.
 *
 * - Legacy tier, content, payment, and confirmation values remain readable.
 */
export function fromLegacyPayload(legacy: LegacyIntakePayload): IntakeSubmissionPayload {
  const statuses: Record<string, AssetReadiness | string> = { ...(legacy.assets?.statuses ?? {}) }

  const payload: IntakeSubmissionPayload = {
    client: { ...legacy.client },
    project: { ...legacy.project },
    tier: legacy.tier,
    assets: {
      qualification: legacy.assets?.qualification ?? '',
      statuses,
      requestedServices: legacy.assets?.requestedServices ?? [],
      uploads: [],
    },
    content: {
      pages: legacy.content?.pages ?? [],
      features: (legacy.content?.features ?? []).map(f => ({
        name: f.name,
        priority: f.priority,
        source: f.source,
      })),
    },
    design: {
      styles: legacy.design?.styles ?? [],
      inspirationLink: legacy.design?.inspirationLink ?? '',
    },
    payment: {
      plan: legacy.payment?.plan ?? '',
      maintenanceAfterFree: legacy.payment?.maintenanceAfterFree ?? '',
      maintenanceEndAcknowledged: legacy.payment?.maintenanceEndAcknowledged ?? false,
      voucherCode: legacy.payment?.voucherCode ?? '',
    },
    confirmations: {
      accurate: legacy.confirmations?.accurate ?? false,
      receipt: legacy.confirmations?.receipt ?? false,
      payment: legacy.confirmations?.payment ?? false,
      maintenance: legacy.confirmations?.maintenance ?? false,
      buildCard: legacy.confirmations?.buildCard ?? false,
      submission: legacy.confirmations?.submission ?? false,
    },
    sourceMetadata: { importedFrom: 'legacy_v1' },
  }

  if ((legacy.tier === 'template' || legacy.tier === 'custom') && legacy.template) {
    payload.template = { ...legacy.template }
  }
  if (legacy.tier === 'enterprise' && legacy.enterprise) {
    payload.enterprise = { ...legacy.enterprise }
  }

  return payload
}

/**
 * Type guard for identifying a legacy stored record. Legacy records carry
 * `tier` (with possible 'template' value) and lack `buildPath`.
 */
export function isLegacyPayload(value: unknown): value is LegacyIntakePayload {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return 'tier' in record && !('buildPath' in record)
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

// ── Phase 4: Explicit Lifecycle Operations ─────────────────────────────────

const INTAKE_API = `${API_BASE_URL}${API_ENDPOINT}`

/**
 * Save the intake as a draft. Always allowed — bypasses blocking validation.
 * Missing requirements are captured as structured records.
 */
export async function saveDraft(
  payload: IntakeSubmissionPayload,
  idempotencyKey: string,
  intakeId?: string,
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('save_draft', payload, idempotencyKey, intakeId)
}

/**
 * Submit the intake for owner review. Requires the complete discovery contract
 * and generates a server-side build reference number.
 */
export async function submitIntakeForReview(
  payload: IntakeSubmissionPayload,
  idempotencyKey: string,
  intakeId?: string,
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('submit', payload, idempotencyKey, intakeId)
}

/**
 * Discard the intake. Archives the record with a reason and audit event.
 * Excluded from the owner-review queue.
 */
export async function discardIntake(
  payload: IntakeSubmissionPayload,
  discardReason: DiscardReason,
  idempotencyKey: string,
  intakeId?: string,
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('discard', { ...payload, outcome: 'discarded', discardReason }, idempotencyKey, intakeId)
}

export async function getIntakeDraft(intakeId: string): Promise<IntakeDraftResponse> {
  try {
    const response = await fetch(`${INTAKE_API}/${encodeURIComponent(intakeId)}`, {
      credentials: 'include',
      headers: await getApiAuthHeaders(),
    })
    const data = await response.json() as IntakeDraftResponse
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to reopen intake draft' }
    }
    return data
  } catch (error) {
    return {
      success: false,
      error: `Draft rehydration error: ${error instanceof Error ? error.message : 'Network error'}`,
    }
  }
}

export interface RehydratedDraftState {
  form: Partial<FormData>
  pageContents: Record<string, Record<string, string>>
  lastEditedStep?: StepId
}

/**
 * Maps the canonical authenticated read model into fresh wizard state. Callers
 * merge this over EMPTY_FORM so values cleared by a prior path switch cannot
 * leak back in from the operator's current in-memory form.
 */
export function rehydrateDraftState(record: IntakeDraftRecord): RehydratedDraftState {
  const payload = record.payload
  const statuses = payload.assets?.statuses ?? {}
  const deckSectionStatuses = Object.fromEntries(
    Object.entries(statuses)
      .filter(([key]) => key.startsWith('deck.'))
      .map(([key, value]) => [key.slice(5), value]),
  ) as Record<string, AssetReadiness>
  const resourceStatuses = Object.fromEntries(
    Object.entries(statuses).filter(([key]) => !key.startsWith('deck.')),
  ) as Record<string, AssetReadiness>
  const legacyFeatures = payload.content?.features ?? payload.scope?.features ?? []

  return {
    form: {
      fullName: payload.client?.fullName ?? '',
      company: payload.client?.company ?? '',
      email: payload.client?.email ?? '',
      phone: payload.client?.phone ?? '',
      projectName: payload.project?.projectName ?? '',
      industry: payload.project?.industry ?? '',
      projectType: payload.project?.projectType ?? '',
      businessDesc: payload.project?.businessDescription ?? '',
      tier: payload.tier === 'template' ? 'custom' : payload.tier,
      assetQualification: payload.assets?.qualification ?? '',
      assetStatuses: resourceStatuses,
      selectedAssetServices: payload.assets?.requestedServices ?? [],
      uploadedAssets: record.uploadedAssets ?? payload.assets?.uploads ?? [],
      deckExists: payload.assets?.deckExists ?? '',
      deckSectionStatuses,
      deckSectionNotes: payload.assets?.deckSectionNotes ?? {},
      resourceStatuses,
      resourceNotes: payload.assets?.resourceNotes ?? {},
      resourceAddOnCosts: payload.assets?.resourceAddOnCosts ?? {},
      templateId: payload.template?.templateId ?? '',
      colorPreset: payload.template?.colorPreset ?? '',
      websiteQuestionnaire: payload.websiteQuestionnaire ?? undefined,
      projectVision: payload.enterprise?.projectVision ?? '',
      targetUsers: payload.enterprise?.targetUsers ?? '',
      userRoles: payload.enterprise?.userRoles ?? '',
      businessWorkflows: payload.enterprise?.businessWorkflows ?? '',
      integrations: payload.enterprise?.integrations ?? '',
      existingSystems: payload.enterprise?.existingSystems ?? '',
      dataSecurityReqs: payload.enterprise?.dataSecurityRequirements ?? '',
      scalabilityReqs: payload.enterprise?.scalabilityRequirements ?? '',
      designInspiration: payload.enterprise?.designInspiration ?? '',
      competitors: payload.enterprise?.competitors ?? '',
      successCriteria: payload.enterprise?.successCriteria ?? '',
      selectedExtensions: payload.scope?.extensions ?? [],
      customFeatures: payload.scope?.customFeatures ?? [],
      features: legacyFeatures.map(feature => feature.name),
      featurePriorities: Object.fromEntries(legacyFeatures.map(feature => [feature.name, feature.priority])),
      designStyles: payload.design?.styles ?? [],
      inspirationLink: payload.design?.inspirationLink ?? '',
      paymentPlan: payload.payment?.plan ?? '',
      maintenanceAfterFree: payload.payment?.maintenanceAfterFree ?? '',
      maintenanceEndAcknowledged: payload.payment?.maintenanceEndAcknowledged ?? false,
      voucherCode: payload.payment?.voucherCode ?? '',
      intakeId: record.intakeId,
      clientId: record.clientId,
      referenceNumber: record.referenceNumber,
      outcome: record.outcome,
      missingRequirements: record.missingRequirements,
      operatorNotes: record.operatorNotes,
    },
    pageContents: Object.fromEntries(
      (payload.scope?.pages ?? payload.content?.pages ?? []).map(page => [page.name, page.fields]),
    ),
    lastEditedStep: payload.sourceMetadata?.lastEditedStep,
  }
}

async function lifecycleOp(
  command: 'save_draft' | 'submit' | 'discard',
  payload: IntakeSubmissionPayload,
  idempotencyKey: string,
  intakeId?: string,
): Promise<IntakeSubmissionResponse> {
  try {
    const authHeaders = await getApiAuthHeaders()
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      // Only send cookies same-origin. When VITE_API_BASE_URL points at a
      // separate API host, 'include' requires the server to return
      // Access-Control-Allow-Credentials, which it does not set — the browser
      // would then discard an otherwise valid response.
      credentials: API_BASE_URL ? 'omit' : 'include',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'X-Intake-Command': command,
      },
      body: JSON.stringify({ intake: payload, idempotencyKey, command, ...(intakeId ? { intakeId } : {}) }),
    })

    const text = await response.text()
    let data: IntakeSubmissionResponse
    try {
      data = text ? (JSON.parse(text) as IntakeSubmissionResponse) : ({} as IntakeSubmissionResponse)
    } catch {
      // A non-JSON body means something between the browser and the API
      // answered — a proxy, a gateway, an HTML error page. Surface it verbatim
      // rather than collapsing it into a generic failure.
      return {
        success: false,
        error: `${command} failed — HTTP ${response.status} from ${response.url || API_ENDPOINT}, non-JSON body: ${text.slice(0, 200)}`,
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: `Not authorized (HTTP ${response.status}${authHeaders.Authorization ? '' : ', no token was attached'}): ${data.error || 'no detail'}. Sign out and sign in again, then retry.`,
        }
      }
      // Always name the status. "save_draft failed" with no status is
      // undiagnosable from a screenshot.
      return {
        success: false,
        error: `${command} failed — HTTP ${response.status}${data.error ? `: ${data.error}` : ' (empty response body)'}`,
      }
    }

    return data
  } catch (error) {
    return {
      success: false,
      error: `${command} error: ${error instanceof Error ? error.message : 'Network error'}`,
    }
  }
}

/** @deprecated v1.x generic submit — use saveDraft/submitIntakeForReview/discardIntake instead. */
export async function submitIntake(
  payload: IntakeSubmissionPayload,
  idempotencyKey: string,
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('submit', payload, idempotencyKey)
}
