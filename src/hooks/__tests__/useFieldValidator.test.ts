import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { FormData, StepId } from '../../types/intake'
import { useFieldValidator } from '../useFieldValidator'

function emptyForm(): FormData {
  return {
    fullName: '', company: '', email: '', phone: '', projectName: '',
    industry: '', projectType: '', businessDesc: '',
    assetQualification: '', assetStatuses: {}, selectedAssetServices: [],
    deckExists: '',
    deckSectionStatuses: {}, deckSectionNotes: {},
    resourceStatuses: {}, resourceNotes: {}, resourceAddOnCosts: {},
    tier: '',
    templateCategory: '', templateId: '', projectVersion: '', colorPreset: '',
    customSizes: false, allSizes: false,
    projectVision: '', targetUsers: '', userRoles: '', businessWorkflows: '',
    integrations: '', existingSystems: '', dataSecurityReqs: '', scalabilityReqs: '',
    designInspiration: '', competitors: '', successCriteria: '',
    features: [], featurePriorities: {}, customFeatures: [], selectedExtensions: [],
    designStyles: [], inspirationLink: '',
    paymentPlan: '', voucherCode: '', voucherStatus: '',
    maintenanceAfterFree: '', maintenanceEndAcknowledged: false, preferredBillingDate: '',
    confirmAccurate: false, confirmReceipt: false, confirmPayment: false,
    confirmMaintenance: false, confirmBuildCard: false, confirmSubmission: false,
  }
}

describe('useFieldValidator', () => {
  const currentStep: StepId = 'client-details'

  it('does not show a warning before the field is touched', () => {
    const form = emptyForm()
    const { result } = renderHook(() =>
      useFieldValidator('field-fullName', form.fullName, form, currentStep),
    )

    expect(result.current.shouldShow).toBe(false)
    expect(result.current.warning).toBeUndefined()
    expect(result.current.isValid).toBe(false)
  })

  it('shows a warning after blur on an invalid field', () => {
    const form = emptyForm()
    const { result } = renderHook(() =>
      useFieldValidator('field-fullName', form.fullName, form, currentStep),
    )

    act(() => {
      result.current.handleBlur()
    })

    expect(result.current.shouldShow).toBe(true)
    expect(result.current.warning).toBe('Client full name is required')
  })

  it('clears the warning when the field value becomes valid', () => {
    const form = { ...emptyForm(), fullName: 'Alex Johnson' }
    const { result } = renderHook(() =>
      useFieldValidator('field-fullName', form.fullName, form, currentStep),
    )

    act(() => {
      result.current.handleBlur()
    })

    expect(result.current.shouldShow).toBe(false)
    expect(result.current.warning).toBeUndefined()
    expect(result.current.isValid).toBe(true)
  })

  it('returns false shouldShow for untouched valid field', () => {
    const form = { ...emptyForm(), email: 'alex@acmecorp.com' }
    const { result } = renderHook(() =>
      useFieldValidator('field-email', form.email, form, currentStep),
    )

    expect(result.current.shouldShow).toBe(false)
    expect(result.current.isValid).toBe(true)
  })

  it('tracks touched state independently per hook instance', () => {
    const form = emptyForm()
    const { result: r1 } = renderHook(() =>
      useFieldValidator('field-fullName', form.fullName, form, currentStep),
    )
    const { result: r2 } = renderHook(() =>
      useFieldValidator('field-email', form.email, form, currentStep),
    )

    act(() => {
      r1.current.handleBlur()
    })

    expect(r1.current.shouldShow).toBe(true)
    expect(r2.current.shouldShow).toBe(false)
  })

  it('company_name returns warning for values < 2 chars after blur', () => {
    const form = { ...emptyForm(), company: 'A' }
    const { result } = renderHook(() =>
      useFieldValidator('field-company', form.company, form, currentStep),
    )

    act(() => {
      result.current.handleBlur()
    })

    expect(result.current.warning).toContain('too short')
    expect(result.current.shouldShow).toBe(true)
  })

  it('business description < 20 chars returns brief warning after blur', () => {
    const form = { ...emptyForm(), businessDesc: 'Short text' }
    const { result } = renderHook(() =>
      useFieldValidator('field-businessDesc', form.businessDesc, form, currentStep),
    )

    act(() => {
      result.current.handleBlur()
    })

    expect(result.current.warning).toContain('brief')
    expect(result.current.shouldShow).toBe(true)
  })

  it('clears business description warning on fix to 20+ chars', () => {
    const formShort = { ...emptyForm(), businessDesc: 'Short' }
    const { result, rerender } = renderHook(() =>
      useFieldValidator('field-businessDesc', formShort.businessDesc, formShort, currentStep),
    )

    act(() => {
      result.current.handleBlur()
    })

    expect(result.current.warning).toContain('brief')

    const formLong = { ...emptyForm(), businessDesc: 'This is a detailed project description that exceeds twenty characters.' }
    const { result: r2 } = renderHook(() =>
      useFieldValidator('field-businessDesc', formLong.businessDesc, formLong, currentStep),
    )
    act(() => {
      r2.current.handleBlur()
    })
    expect(r2.current.shouldShow).toBe(false)
    expect(r2.current.warning).toBeUndefined()
  })
})