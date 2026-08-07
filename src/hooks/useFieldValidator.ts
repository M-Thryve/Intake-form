import { useState, useCallback, useMemo } from 'react'
import { getInlineWarnings } from '../data/field-validators'
import type { FormData, StepId } from '../types/intake'

export interface FieldValidationResult {
  isValid: boolean
  warning?: string
  shouldShow: boolean
}

/**
 * Blur-triggered, non-blocking field validation hook.
 *
 * Wraps the existing `getInlineWarnings` / `ValidationState` system into a
 * reusable hook that can be used by individual fields or sub-components.
 * Warnings appear on blur and clear when the field is corrected. Never
 * prevents draft saves or step navigation.
 */
export function useFieldValidator(
  fieldId: string,
  fieldValue: unknown,
  form: FormData,
  currentStep: StepId,
) {
  const [touched, setTouched] = useState(false)

  const validate = useCallback((): FieldValidationResult => {
    const stepWarnings = getInlineWarnings(currentStep, form)
    const msg = stepWarnings[fieldId] ?? null
    return {
      isValid: msg === null,
      warning: msg ?? undefined,
      shouldShow: touched && msg !== null,
    }
  }, [fieldId, form, currentStep, touched])

  const handleBlur = useCallback(() => {
    setTouched(true)
  }, [])

  const result = useMemo(() => validate(), [validate])

  return {
    isValid: result.isValid,
    warning: touched ? result.warning : undefined,
    shouldShow: result.shouldShow,
    handleBlur,
    setTouched,
  }
}