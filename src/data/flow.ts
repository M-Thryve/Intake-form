import type { Tier, StepId, FormData, BuildPath } from '../types/intake'

/**
 * v3.0 flow — accepts projectType for future branching. Both custom build
 * paths (templated-website, ai-assisted-website) use the same step sequence;
 * the template-select step renders different content per projectType.
 * draft-saved follows outcome in all flows.
 */
export function getFlow(tier: Tier, _projectType?: string): StepId[] {
  const base: StepId[] = ['entry', 'intro', 'build-approach', 'client-details']
  if (!tier) return base

  const path = normalizeToBuildPath(tier)
  if (path === 'custom') {
    return [
      ...base,
      'company-assets',
      'template-select',
      'pages-features',
      'review',
      'outcome',
      'draft-saved',
      'build-card',
    ]
  }
  return [
    ...base,
    'company-assets',
    'enterprise-vision',
    'pages-features',
    'review',
    'outcome',
    'draft-saved',
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
  const flow = getFlow(formData.tier, formData.projectType)
  const currentIndex = flow.indexOf(stepId)
  if (currentIndex < 0) return false

  if (stepId === 'company-assets' && !formData.tier) return false

  return true
}
