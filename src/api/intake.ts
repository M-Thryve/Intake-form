import type { FormData, IntakeSubmissionPayload, IntakeSubmissionResponse } from '../types/intake'

const API_BASE_URL = 'http://localhost:3000'
const API_ENDPOINT = '/api/intakes'

export function toSubmissionPayload(formData: FormData, pageContents: Record<string, Record<string, string>>): IntakeSubmissionPayload {
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
    assets: {
      qualification: formData.assetQualification,
      statuses: formData.assetStatuses,
      requestedServices: formData.selectedAssetServices,
    },
    tier: formData.tier,
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

  // Add tier-specific data
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

export async function submitIntake(
  payload: IntakeSubmissionPayload,
  idempotencyKey: string
): Promise<IntakeSubmissionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ intake: payload, idempotencyKey }),
    })

    const data: IntakeSubmissionResponse = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Submission failed. Please try again.',
      }
    }

    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.'
    return {
      success: false,
      error: `Submission error: ${errorMessage}`,
    }
  }
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}
