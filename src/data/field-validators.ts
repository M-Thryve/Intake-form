// ── REV-01: Shared field-level validation predicates ────────────────────────
//
// Both the step-transition validator (`src/data/validation.ts`) and the inline
// validation system import from this module so the field-level rules never
// diverge. Inline warnings are informational (amber) and never block
// navigation or draft saves; only submit mode blocks on required gaps.

import type { FormData, StepId } from '../types/intake'
import type { RequirementContext } from './assets'
import { getRequiredResources, getCompanyDeckSections } from './assets'

// ── Predicates ───────────────────────────────────────────────────────────────

/** Non-empty after trimming whitespace. */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

/** Basic RFC-style email shape check. Empty input is invalid. */
export function isValidEmail(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

/**
 * A phone number is considered complete when it is empty (optional at draft
 * time) or carries at least 7 digits. Short / partial input reads as
 * "appears incomplete".
 */
export function isValidPhone(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  const digits = v.replace(/\D/g, '')
  return digits.length >= 7
}

// ── Per-field inline validation rules ───────────────────────────────────────

export interface FieldValidationState {
  /** Has this field been blurred at least once? */
  touched: boolean
  /** Current inline validation warning (null = valid). */
  warning: string | null
}

/** Ephemeral UI-only validation tracker keyed by field id. Never persisted. */
export type ValidationState = Record<string, FieldValidationState>

/**
 * Shared requirement context used by both the step validator and the inline
 * validator so resource/deck rules are derived identically.
 */
export function ctxFor(form: FormData): RequirementContext {
  return {
    buildPath: form.tier === 'enterprise' ? 'enterprise' : form.tier ? 'custom' : '',
    projectType: form.projectType,
    templateId: form.templateId,
    features: [...form.features, ...form.customFeatures],
  }
}

/**
 * Returns the warning message for every known field of the given step given
 * the current form state. Absence of a key (or `null`) means the field is
 * valid. The `design` step is skipped per REV-05 (removed from the active
 * flow; types retained for legacy compatibility).
 */
export function getInlineWarnings(stepId: StepId, form: FormData): Record<string, string | null> {
  switch (stepId) {
    case 'client-details':
      return clientDetailsWarnings(form)
    case 'company-assets':
      return companyAssetsWarnings(form)
    case 'build-approach':
      return buildApproachWarnings(form)
    case 'template-select':
      return templateSelectWarnings(form)
    case 'enterprise-vision':
      return enterpriseVisionWarnings(form)
    case 'pages-features':
      return pagesFeaturesWarnings(form)
    default:
      return {}
  }
}

function clientDetailsWarnings(form: FormData): Record<string, string | null> {
  return {
    'field-fullName': isNonEmpty(form.fullName) ? null : 'Client full name is required',
    'field-company': companyWarning(form.company),
    'field-email': isValidEmail(form.email) ? null : 'Please enter a valid email address',
    'field-phone': isValidPhone(form.phone) ? null : 'Phone number appears incomplete',
    'field-projectName': isNonEmpty(form.projectName) ? null : 'Project name is required',
    'field-industry': isNonEmpty(form.industry) ? null : 'Please select an industry',
    'field-projectType': isNonEmpty(form.projectType) ? null : 'Please select a project type',
    'field-businessDesc': businessDescWarning(form.businessDesc),
  }
}

function companyWarning(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length < 2) return 'Company name seems too short — enter at least 2 characters'
  return null
}

function businessDescWarning(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length < 20) return `Project description is brief — add more detail (${v.length}/20 chars)`
  return null
}

function companyAssetsWarnings(form: FormData): Record<string, string | null> {
  const out: Record<string, string | null> = {
    'field-deckExists': isNonEmpty(form.deckExists) ? null : 'Please indicate whether a company deck exists',
  }

  const ctx = ctxFor(form)
  const required = getRequiredResources(ctx)
  for (const r of required) {
    const status = form.resourceStatuses[r.key]
    if (!status) {
      out[`field-resource-${r.key}`] = `${r.label} needs a status decision`
    } else if (status === 'missing' && !(form.resourceNotes[r.key] ?? '').trim()) {
      out[`field-resource-${r.key}`] = `${r.label} is marked missing — add an operator note`
    } else {
      out[`field-resource-${r.key}`] = null
    }
  }

  // Deck sections require a status decision only when the operator confirmed
  // a full deck exists ('yes'). A 'partial' deck legitimately leaves sections
  // unset as follow-ups.
  if (form.deckExists === 'yes') {
    const sections = getCompanyDeckSections(ctx)
    for (const s of sections) {
      if (s.severity !== 'required') continue
      out[`field-deckSection-${s.key}`] = form.deckSectionStatuses[s.key]
        ? null
        : `${s.label} needs a status decision`
    }
  }

  return out
}

function buildApproachWarnings(form: FormData): Record<string, string | null> {
  return {
    'field-tier': isNonEmpty(form.tier) ? null : 'Please select a build approach',
  }
}

function templateSelectWarnings(form: FormData): Record<string, string | null> {
  if (form.projectType !== 'templated-website') return {}
  return {
    'field-templateId': isNonEmpty(form.templateId) ? null : 'Please select a template',
  }
}

const ENTERPRISE_RECOMMENDED: Record<string, string> = {
  'field-userRoles': 'userRoles',
  'field-businessWorkflows': 'businessWorkflows',
  'field-integrations': 'integrations',
  'field-existingSystems': 'existingSystems',
  'field-dataSecurityReqs': 'dataSecurityReqs',
  'field-scalabilityReqs': 'scalabilityReqs',
  'field-designInspiration': 'designInspiration',
  'field-competitors': 'competitors',
  'field-successCriteria': 'successCriteria',
}

const RECOMMENDED_MESSAGE = 'Recommended — helps the owner review scope'

function enterpriseVisionWarnings(form: FormData): Record<string, string | null> {
  if (form.tier !== 'enterprise') return {}

  const out: Record<string, string | null> = {
    'field-projectVision': isNonEmpty(form.projectVision)
      ? null
      : 'Project vision is required for Enterprise builds',
    'field-targetUsers': isNonEmpty(form.targetUsers)
      ? null
      : 'Target users description is required',
  }

  // Recommended-but-optional fields warn (amber) only after the operator has
  // interacted with and left them blank; the touched gate lives in the caller.
  for (const [fieldId, key] of Object.entries(ENTERPRISE_RECOMMENDED)) {
    out[fieldId] = isNonEmpty(form[key as keyof FormData] as string)
      ? null
      : RECOMMENDED_MESSAGE
  }

  return out
}

function pagesFeaturesWarnings(_form: FormData): Record<string, string | null> {
  // v3.0: feature selection is optional — no minimum warning.
  // Priority per-feature is removed; scope is expressed as extension codes.
  return {}
}

/** HTML-safe id fragment for feature-derived field ids. */
export function slugify(value: string): string {
  return value.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')
}
