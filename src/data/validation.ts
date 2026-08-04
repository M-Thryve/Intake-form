import type { FormData, StepId, ValidationError } from '../types/intake'

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
    case 'payment':
      errors.push(...validatePayment(formData))
      break
    case 'final-confirm':
      errors.push(...validateFinalConfirm(formData))
      break
  }

  return errors
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

function validateCompanyAssets(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!form.assetQualification) errors.push({ message: 'Asset qualification is required' })
  return errors
}

function validateBuildApproach(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!form.tier) errors.push({ message: 'Build tier selection is required' })
  if (form.tier === 'template' && (form.assetQualification === 'incomplete' || form.assetQualification === 'no-assets')) {
    errors.push({ message: 'Drag & Drop requires at least "Ready" asset status' })
  }
  return errors
}

function validateTemplateSelect(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if ((form.tier === 'template' || form.tier === 'custom') && !form.templateId) {
    errors.push({ message: 'Template selection is required' })
  }
  if ((form.tier === 'template' || form.tier === 'custom') && !form.projectVersion) {
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

function validatePayment(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!form.paymentPlan) {
    errors.push({ message: 'Payment plan is required' })
  }
  return errors
}

function validateFinalConfirm(form: FormData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!form.confirmAccurate) errors.push({ message: 'Please confirm project information is accurate' })
  if (!form.confirmReceipt) errors.push({ message: 'Please acknowledge receipt of preliminary pricing' })
  if (!form.confirmPayment) errors.push({ message: 'Please confirm payment plan' })
  if (!form.confirmMaintenance) errors.push({ message: 'Please acknowledge maintenance terms' })
  if (!form.confirmBuildCard) errors.push({ message: 'Please confirm Build Card understanding' })
  if (!form.confirmSubmission) errors.push({ message: 'Please confirm your understanding of the process' })
  return errors
}
