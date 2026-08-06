import type {
  FormData,
  StepId,
  ValidationError,
  MissingRequirement,
  AssetReadiness,
  RequirementCategory,
  RequirementSeverity,
  RequirementStatus,
} from '../types/intake'
import {
  getResourceRequirements,
  getCompanyDeckSections,
  isNotApplicableAllowed,
  type RequirementContext,
} from './assets'

/**
 * v2.0 validation. Two modes:
 *  - 'submit'     — enforces the minimum discovery contract required for a
 *                   submitted intake, including required resource decisions
 *                   and company-deck section decisions.
 *  - 'save_draft' — collects the same gaps but returns them as
 *                   MissingRequirement records instead of blocking errors.
 *
 * Payment and final-confirmation steps are no longer validated.
 */
export function validateStep(stepId: StepId, formData: FormData): ValidationError[] {
  const errors: ValidationError[] = []

  switch (stepId) {
    case 'client-details':
      errors.push(...validateClientDetails(formData))
      break
    case 'company-assets':
      errors.push(...validateCompanyAssets(formData))
      break
    case 'build-approach':
      errors.push(...validateBuildApproach(formData))
      break
    case 'template-select':
      errors.push(...validateTemplateSelect(formData))
      break
    case 'enterprise-vision':
      errors.push(...validateEnterpriseVision(formData))
      break
    case 'pages-features':
      errors.push(...validatePagesFeatures(formData))
      break
    case 'design':
      errors.push(...validateDesign(formData))
      break
    // 'payment' and 'final-confirm' intentionally omitted — removed in v2.0
  }

  return errors
}

function ctxFor(form: FormData): RequirementContext {
  return {
    buildPath: form.tier === 'enterprise' ? 'enterprise' : form.tier ? 'custom' : '',
    projectType: form.projectType,
    templateId: form.templateId,
    features: [...form.features, ...form.customFeatures],
  }
}

/**
 * Convert a resource `AssetReadiness` value into the corresponding gap
 * record for the missing-requirements list. Returns `null` when the item is
 * fully resolved (available) or genuinely N/A and N/A is allowed here.
 */
function resourceStatusToGap(
  key: string,
  label: string,
  category: RequirementCategory,
  severity: RequirementSeverity,
  section: string,
  status: AssetReadiness | undefined,
  note: string | undefined,
  ctx: RequirementContext,
  preliminaryCost?: number,
): MissingRequirement | null {
  const base = { key, label, category, section, severity, note } as const

  // Never mark as decided if the operator hasn't touched it yet.
  if (!status) {
    return { ...base, status: 'missing', nextAction: 'Confirm status with client' }
  }

  switch (status) {
    case 'available':
      return null
    case 'not_applicable':
      // Guard: N/A is not accepted for certain core brand items.
      if (!isNotApplicableAllowed(key, ctx)) {
        return {
          ...base,
          status: 'missing',
          nextAction: '"Not applicable" is not valid for this resource — confirm actual status',
        }
      }
      return null
    case 'missing':
      return { ...base, status: 'missing', nextAction: 'Missing — capture in follow-up' }
    case 'provide_later':
      return {
        ...base,
        status: 'provide_later',
        nextAction: 'Client will provide after the call',
      }
    case 'm_thryve_add_on':
      return {
        ...base,
        status: 'pending',
        nextAction: 'M-THRYVE add-on requested — pending owner confirmation',
        preliminaryCost,
      }
  }
}

/**
 * Emits the normalized MissingRequirement list across every intake section,
 * including the structured resource checklist and company-deck sections.
 */
export function collectMissingRequirements(formData: FormData): MissingRequirement[] {
  const missing: MissingRequirement[] = []
  const ctx = ctxFor(formData)

  // ── Client / project basics ──────────────────────────────────────────
  if (!formData.fullName.trim()) {
    missing.push(mk('client.fullName', 'Client full name', 'client', 'client-details', 'required'))
  }
  if (!formData.email.trim() || !formData.email.includes('@')) {
    missing.push(mk('client.email', 'Client email', 'client', 'client-details', 'required'))
  }
  if (!formData.projectName.trim()) {
    missing.push(mk('project.name', 'Project name', 'project', 'client-details', 'required'))
  }
  if (!formData.industry) {
    missing.push(mk('project.industry', 'Industry', 'project', 'client-details', 'recommended'))
  }
  if (!formData.projectType) {
    missing.push(mk('project.type', 'Project type', 'project', 'client-details', 'required'))
  }
  if (!formData.tier) {
    missing.push(mk('buildPath', 'Build path selection', 'build_path', 'build-approach', 'required'))
  }

  // ── Path-specific ─────────────────────────────────────────────────────
  const path = formData.tier === 'enterprise' ? 'enterprise' : 'custom'
  if (path === 'custom' && formData.tier) {
    if (!formData.templateId) {
      missing.push(mk('template.id', 'Template selection', 'build_path', 'template-select', 'required'))
    }
    if (!formData.projectVersion) {
      missing.push(mk('template.version', 'Project version (platform)', 'build_path', 'template-select', 'required'))
    }
  }
  if (path === 'enterprise' && formData.tier === 'enterprise') {
    if (!formData.projectVision.trim()) {
      missing.push(mk('enterprise.vision', 'Project vision', 'project', 'enterprise-vision', 'required'))
    }
    if (!formData.targetUsers.trim()) {
      missing.push(mk('enterprise.targetUsers', 'Target users', 'project', 'enterprise-vision', 'required'))
    }
  }

  // ── Scope ─────────────────────────────────────────────────────────────
  const allFeatures = [...formData.features, ...formData.customFeatures]
  if (allFeatures.length === 0) {
    missing.push(mk('scope.features', 'At least one feature', 'scope', 'pages-features', 'required'))
  }
  if (formData.designStyles.length === 0) {
    missing.push(mk('design.styles', 'At least one design style', 'design', 'design', 'recommended'))
  }

  // ── Structured resources ──────────────────────────────────────────────
  // Only evaluate resources once a build path is chosen — the required
  // catalog depends on it.
  if (formData.tier) {
    const resources = getResourceRequirements(ctx)
    for (const r of resources) {
      const status = formData.resourceStatuses[r.key] as AssetReadiness | undefined
      const note = formData.resourceNotes[r.key]
      const cost = formData.resourceAddOnCosts[r.key]
      const gap = resourceStatusToGap(
        r.key,
        r.label,
        r.category,
        r.severity,
        'company-assets',
        status,
        note,
        ctx,
        cost,
      )
      if (gap) missing.push(gap)
    }

    // ── Company-deck sections ──────────────────────────────────────────
    // Deck sections only apply if the operator confirmed a deck exists
    // (yes / partial). If the deck itself is an add-on or absent, the
    // parent 'company_deck' resource gap already captures it.
    if (formData.deckExists === 'yes' || formData.deckExists === 'partial') {
      const sections = getCompanyDeckSections(ctx)
      for (const s of sections) {
        const status = formData.deckSectionStatuses[s.key] as AssetReadiness | undefined
        const note = formData.deckSectionNotes[s.key]
        const gap = resourceStatusToGap(
          `deck.${s.key}`,
          `Deck section: ${s.label}`,
          'company_deck',
          s.severity,
          'company-assets',
          status,
          note,
          ctx,
        )
        if (gap) missing.push(gap)
      }
    } else if (!formData.deckExists) {
      missing.push({
        key: 'deck.exists',
        label: 'Company deck availability confirmation',
        category: 'company_deck',
        section: 'company-assets',
        severity: 'required',
        status: 'missing',
        nextAction: 'Ask the client whether a deck exists',
      })
    }
  }

  return missing
}

function mk(
  key: string,
  label: string,
  category: RequirementCategory,
  section: string,
  severity: RequirementSeverity,
  status: RequirementStatus = 'missing',
): MissingRequirement {
  return { key, label, category, section, severity, status }
}

/**
 * Submit validation: rejects if any 'required' item is unresolved.
 * `provide_later` items and `m_thryve_add_on` items are treated as
 * unresolved because they need owner attention before build-start.
 */
export function canSubmit(formData: FormData): { ok: boolean; missing: MissingRequirement[] } {
  const missing = collectMissingRequirements(formData)
  const blockers = missing.filter(
    m => m.severity === 'required' && (m.status === 'missing' || m.status === 'pending' || m.status === 'provide_later'),
  )
  return { ok: blockers.length === 0, missing }
}

function validateClientDetails(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!form.fullName.trim()) errors.push({ field: 'fullName', message: 'Full name is required' })
  if (!form.email.trim() || !form.email.includes('@')) errors.push({ field: 'email', message: 'Valid email is required' })
  if (!form.projectName.trim()) errors.push({ field: 'projectName', message: 'Project name is required' })
  if (!form.industry) errors.push({ field: 'industry', message: 'Industry is required' })
  if (!form.projectType) errors.push({ field: 'projectType', message: 'Project type is required' })
  return errors
}

function validateCompanyAssets(_form: FormData): ValidationError[] {
  // v2.0: the structured resource checklist replaces the single
  // assetQualification pill. Individual resource status decisions are
  // captured but do not block step progression — missing items are surfaced
  // through the missing-requirements engine and enforced at submit time.
  return []
}

function validateBuildApproach(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!form.tier) {
    errors.push({ message: 'Build path selection is required' })
  }
  return errors
}

function validateTemplateSelect(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  const isCustom = form.tier === 'custom' || form.tier === 'template'
  if (isCustom && !form.templateId) {
    errors.push({ message: 'Template selection is required' })
  }
  if (isCustom && !form.projectVersion) {
    errors.push({ message: 'Project version is required' })
  }
  return errors
}

function validateEnterpriseVision(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (form.tier === 'enterprise' && !form.projectVision.trim()) {
    errors.push({ field: 'projectVision', message: 'Project vision is required' })
  }
  if (form.tier === 'enterprise' && !form.targetUsers.trim()) {
    errors.push({ field: 'targetUsers', message: 'Target users is required' })
  }
  return errors
}

function validatePagesFeatures(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  const allFeatures = [...form.features, ...form.customFeatures]
  if (allFeatures.length === 0) {
    errors.push({ message: 'At least one feature is required' })
  }
  return errors
}

function validateDesign(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (form.designStyles.length === 0) {
    errors.push({ message: 'At least one design style is required' })
  }
  return errors
}
