import type { Tier, StepId, FormData, BuildPath } from '../types/intake'

/**
 * v2.0 flow — no `payment` or `final-confirm` steps. Legacy 'template' tier
 * is treated as 'custom' for step sequencing during the Phase 1 transition.
 */
export function getFlow(tier: Tier): StepId[] {
  // v2.0 flow per TECHNICAL_HANDOVER §6: build-approach precedes
  // company-assets so that the resource checklist can be derived from the
  // chosen build path and project type.
  const base: StepId[] = ['intro', 'client-details', 'build-approach']
  if (!tier) return base

  const path = normalizeToBuildPath(tier)
  if (path === 'custom') {
    return [
      ...base,
      'company-assets',
      'template-select',
      'pages-features',
      'design',
      'review',
      'outcome',
      'build-card',
    ]
  }
  return [
    ...base,
    'company-assets',
    'enterprise-vision',
    'pages-features',
    'design',
    'review',
    'outcome',
    'build-card',
  ]
}

/**
 * Normalize the UI tier value to a v2.0 BuildPath.
 * Legacy 'template' (Drag & Drop) maps to 'custom'.
 */
export function normalizeToBuildPath(tier: Tier): BuildPath {
  if (tier === 'enterprise') return 'enterprise'
  return 'custom'
}

export function isStepAllowed(stepId: StepId, formData: FormData): boolean {
  const flow = getFlow(formData.tier)
  const currentIndex = flow.indexOf(stepId)
  if (currentIndex < 0) return false

  if (stepId === 'build-approach' && !formData.tier) return false
  if (stepId === 'company-assets' && !formData.tier) return false

  return true
}
