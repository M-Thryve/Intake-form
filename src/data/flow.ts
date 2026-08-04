import type { Tier, StepId, FormData } from '../types/intake'

export function getFlow(tier: Tier): StepId[] {
  const base: StepId[] = ['intro', 'client-details', 'company-assets', 'build-approach']
  if (!tier) return base
  if (tier === 'template' || tier === 'custom') {
    return [...base, 'template-select', 'pages-features', 'design', 'review', 'payment', 'final-confirm', 'build-card']
  }
  return [...base, 'enterprise-vision', 'pages-features', 'design', 'review', 'payment', 'final-confirm', 'build-card']
}

export function isStepAllowed(stepId: StepId, formData: FormData): boolean {
  const flow = getFlow(formData.tier)
  const currentIndex = flow.indexOf(stepId)
  if (currentIndex < 0) return false

  // Tier selection gate
  if (stepId === 'build-approach' && !formData.tier) return false

  // Asset qualification gate
  if (stepId === 'company-assets' && !formData.assetQualification) return false

  // Template gating: block if assets incomplete
  if (stepId === 'template-select' && formData.tier === 'template') {
    const assetsBlocked = formData.assetQualification === 'incomplete' || formData.assetQualification === 'no-assets'
    if (assetsBlocked) return false
  }

  return true
}
