import type {
  FormData,
  IntakeSubmissionPayload,
  IntakeSubmissionResponse,
  IntakeOutcome,
  IntakeStatus,
  LegacyIntakePayload,
  AssetReadiness,
  DiscardReason,
} from '../types/intake'

const API_BASE_URL = ''
const API_ENDPOINT = '/api/intakes'

/**
 * Phase 2 payload mapper. Payment and final confirmations are part of the
 * original Phase 1 wire contract and are sent to the backend here.
 */
export function toSubmissionPayload(
  formData: FormData,
  pageContents: Record<string, Record<string, string>>,
  outcome: IntakeOutcome = 'draft',
): IntakeSubmissionPayload {
  const allFeatures = [...formData.features, ...formData.customFeatures]
  const pages = Object.entries(pageContents).map(([name, fields]) => ({ name, fields }))

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
    tier: formData.tier,
    assets: {
      qualification: formData.assetQualification,
      statuses: formData.assetStatuses,
      requestedServices: formData.selectedAssetServices,
    },
    content: {
      pages,
      features: allFeatures.map(name => ({
        name,
        priority: formData.featurePriorities[name] || 'Need Help Deciding',
        source: formData.customFeatures.includes(name) ? 'custom' : 'chip',
      })),
    },
    design: {
      styles: formData.designStyles,
      inspirationLink: formData.inspirationLink,
    },
    payment: {
      plan: formData.paymentPlan,
      maintenanceAfterFree: formData.maintenanceAfterFree,
      maintenanceEndAcknowledged: formData.maintenanceEndAcknowledged,
      voucherCode: formData.voucherCode,
    },
    confirmations: {
      accurate: formData.confirmAccurate,
      receipt: formData.confirmReceipt,
      payment: formData.confirmPayment,
      maintenance: formData.confirmMaintenance,
      buildCard: formData.confirmBuildCard,
      submission: formData.confirmSubmission,
    },
  }

  if (formData.tier === 'template' || formData.tier === 'custom') {
    payload.template = {
      templateId: formData.templateId,
      projectVersion: formData.projectVersion,
      colorPreset: formData.colorPreset,
    }
  } else if (formData.tier === 'enterprise') {
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
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('save_draft', payload, idempotencyKey)
}

/**
 * Submit the intake for owner review. Requires the complete discovery contract
 * and generates a server-side build reference number.
 */
export async function submitIntakeForReview(
  payload: IntakeSubmissionPayload,
  idempotencyKey: string,
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('submit', payload, idempotencyKey)
}

/**
 * Discard the intake. Archives the record with a reason and audit event.
 * Excluded from the owner-review queue.
 */
export async function discardIntake(
  payload: IntakeSubmissionPayload,
  discardReason: DiscardReason,
  idempotencyKey: string,
): Promise<IntakeSubmissionResponse> {
  return lifecycleOp('discard', { ...payload, outcome: 'discarded', discardReason }, idempotencyKey)
}

async function lifecycleOp(
  command: 'save_draft' | 'submit' | 'discard',
  payload: IntakeSubmissionPayload,
  idempotencyKey: string,
): Promise<IntakeSubmissionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'X-Intake-Command': command,
      },
      body: JSON.stringify({ intake: payload, idempotencyKey, command }),
    })

    const data: IntakeSubmissionResponse = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || `${command} failed` }
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
