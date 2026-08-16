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
import { ctxFor, isNonEmpty, isValidEmail } from './field-validators'

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
// 'design' step removed per REV-05; validateDesign() retained for legacy reads
    // 'payment' and 'final-confirm' intentionally omitted — removed in v2.0
  }

  return errors
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
  if (formData.projectType === 'templated-website') {
    if (!formData.templateId) {
      missing.push(mk('template.id', 'Template selection', 'build_path', 'template-select', 'required'))
    }
    if (!formData.projectVersion) {
      missing.push(mk('template.version', 'Project version (platform)', 'build_path', 'template-select', 'required'))
    }
  }
  if (formData.projectType === 'ai-assisted-website') {
    const q = formData.websiteQuestionnaire
    if (!q?.primaryGoal?.trim()) {
      missing.push(mk('websiteQuestionnaire.primaryGoal', 'Primary goal (questionnaire)', 'project', 'template-select', 'required'))
    }
    if (!q?.visitorAction?.trim()) {
      missing.push(mk('websiteQuestionnaire.visitorAction', 'Visitor action (questionnaire)', 'project', 'template-select', 'required'))
    }
    if (!q?.websitePurpose?.length) {
      missing.push(mk('websiteQuestionnaire.websitePurpose', 'Website purpose (questionnaire)', 'project', 'template-select', 'required'))
    }
    if (q?.websitePurpose?.includes('other') && !q?.websitePurposeOther?.trim()) {
      missing.push(mk('websiteQuestionnaire.websitePurposeOther', 'Explain "other" website purpose', 'project', 'template-select', 'required'))
    }
  }
  if (formData.tier === 'enterprise') {
    if (!formData.projectVision.trim()) {
      missing.push(mk('enterprise.vision', 'Project vision', 'project', 'enterprise-vision', 'required'))
    }
    if (!formData.targetUsers.trim()) {
      missing.push(mk('enterprise.targetUsers', 'Target users', 'project', 'enterprise-vision', 'required'))
    }
  }

  // design.styles check removed per REV-05 — design step is no longer collected

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
    // (yes / partial). REV-04 Phase 4 Delta:
    //   'yes'     — only 'available' and 'not_applicable' count as confirmed.
    //               missing, provide_later, m_thryve_add_on, and unset → gap.
    //               Rationale: m_thryve_add_on on a section contradicts the claim
    //               that the operator has verified a full deck.
    //   'partial' — operator sets each section's status; unset → status:'missing'.
    if (formData.deckExists === 'yes' || formData.deckExists === 'partial') {
      const sections = getCompanyDeckSections(ctx)
      for (const s of sections) {
        const status = formData.deckSectionStatuses[s.key] as AssetReadiness | undefined
        const note = formData.deckSectionNotes[s.key]
        const isYesGating = formData.deckExists === 'yes'
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
        // REV-04 Delta: When 'yes' is selected, only 'available' and 'not_applicable'
        // count as confirmed. All other statuses (missing, provide_later, m_thryve_add_on,
        // unset) produce an explicit gap record.
        if (isYesGating && (!status || status !== 'available' && status !== 'not_applicable')) {
          if (!gap) {
            missing.push({
              key: `deck.${s.key}.yes_gate`,
              label: `Deck section: ${s.label} (must be confirmed for full deck)`,
              category: 'company_deck',
              section: 'company-assets',
              severity: 'required',
              status: status === 'provide_later' ? 'provide_later'
                : status === 'm_thryve_add_on' ? 'pending'
                : 'missing',
              nextAction: status === 'm_thryve_add_on'
                ? 'Section marked as add-on contradicts full-deck claim — select "partial" instead'
                : 'Full deck available — every section requires a confirmed status',
            })
          }
        }
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
  if (!isNonEmpty(form.fullName)) errors.push({ field: 'fullName', message: 'Full name is required' })
  if (!isValidEmail(form.email)) errors.push({ field: 'email', message: 'A valid client email is required' })
  if (!isNonEmpty(form.projectName)) errors.push({ field: 'projectName', message: 'Project name is required' })
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
  const needsTemplate = form.projectType === 'templated-website'
  if (needsTemplate && !form.templateId) {
    errors.push({ message: 'Template selection is required' })
  }
  if (needsTemplate && !form.projectVersion) {
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

function validatePagesFeatures(_form: FormData): ValidationError[] {
  // v3.0: features/extensions are optional — no minimum enforced at step-level.
  return []
}

function validateDesign(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (form.designStyles.length === 0) {
    errors.push({ message: 'At least one design style is required' })
  }
  return errors
}
