import { describe, it, expect } from 'vitest'
import type { FormData, StepId } from '../../types/intake'
import {
  isNonEmpty,
  isValidEmail,
  isValidPhone,
  getInlineWarnings,
  slugify,
} from '../field-validators'

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
    features: [], featurePriorities: {}, customFeatures: [],
    designStyles: [], inspirationLink: '',
    paymentPlan: '', voucherCode: '', voucherStatus: '',
    maintenanceAfterFree: '', maintenanceEndAcknowledged: false, preferredBillingDate: '',
    confirmAccurate: false, confirmReceipt: false, confirmPayment: false,
    confirmMaintenance: false, confirmBuildCard: false, confirmSubmission: false,
  }
}

const form = (overrides: Partial<FormData> = {}): FormData => ({ ...emptyForm(), ...overrides })

describe('isValidEmail', () => {
  it('returns true for valid email addresses', () => {
    expect(isValidEmail('alex@acmecorp.com')).toBe(true)
    expect(isValidEmail('a+b@sub.domain.io')).toBe(true)
    expect(isValidEmail('  name@site.org  ')).toBe(true)
  })

  it('returns false for invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('   ')).toBe(false)
    expect(isValidEmail('abc')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
    expect(isValidEmail('a@b.')).toBe(false)
  })
})

describe('isNonEmpty', () => {
  it('returns true for non-empty strings', () => {
    expect(isNonEmpty('value')).toBe(true)
    expect(isNonEmpty('  value  ')).toBe(true)
    expect(isNonEmpty('a')).toBe(true)
  })

  it('returns false for empty or whitespace-only strings', () => {
    expect(isNonEmpty('')).toBe(false)
    expect(isNonEmpty('   ')).toBe(false)
    expect(isNonEmpty('\t\n')).toBe(false)
  })
})

describe('isValidPhone', () => {
  it('treats an empty phone as valid (optional field)', () => {
    expect(isValidPhone('')).toBe(true)
    expect(isValidPhone('   ')).toBe(true)
  })

  it('accepts a complete phone number', () => {
    expect(isValidPhone('+63 917 000 0000')).toBe(true)
    expect(isValidPhone('09170000000')).toBe(true)
  })

  it('flags partial phone input as incomplete', () => {
    expect(isValidPhone('123')).toBe(false)
    expect(isValidPhone('+63 91')).toBe(false)
    expect(isValidPhone('abc')).toBe(false)
  })
})

describe('getInlineWarnings — client-details', () => {
  it('warns on every required field when the step is empty', () => {
    const warnings = getInlineWarnings('client-details', form())
    expect(warnings['field-fullName']).toBe('Client full name is required')
    expect(warnings['field-email']).toBe('Please enter a valid email address')
    expect(warnings['field-projectName']).toBe('Project name is required')
    expect(warnings['field-industry']).toBe('Please select an industry')
    expect(warnings['field-projectType']).toBe('Please select a project type')
  })

  it('does not warn on the optional phone when empty', () => {
    const warnings = getInlineWarnings('client-details', form())
    expect(warnings['field-phone']).toBeNull()
  })

  it('warns on partial phone input only', () => {
    const warnings = getInlineWarnings('client-details', form({ phone: '123' }))
    expect(warnings['field-phone']).toBe('Phone number appears incomplete')
  })

  it('clears all warnings once required fields are valid', () => {
    const warnings = getInlineWarnings('client-details', form({
      fullName: 'Alex Johnson',
      email: 'alex@acmecorp.com',
      projectName: 'Client Portal',
      industry: 'Technology',
      projectType: 'website',
    }))
    expect(warnings['field-fullName']).toBeNull()
    expect(warnings['field-email']).toBeNull()
    expect(warnings['field-projectName']).toBeNull()
    expect(warnings['field-industry']).toBeNull()
    expect(warnings['field-projectType']).toBeNull()
  })
})

describe('getInlineWarnings — company-assets', () => {
  const ctxForm = form({ tier: 'custom', projectType: 'website' })

  it('warns when the company deck existence is unanswered', () => {
    const warnings = getInlineWarnings('company-assets', ctxForm)
    expect(warnings['field-deckExists']).toBe('Please indicate whether a company deck exists')
  })

  it('warns on required resources with no status decision', () => {
    const warnings = getInlineWarnings('company-assets', form({ ...ctxForm, deckExists: 'yes' }))
    expect(warnings['field-resource-logo']).toBe('Logo (final) needs a status decision')
    expect(warnings['field-resource-company_deck']).toBe('Company deck needs a status decision')
  })

  it('treats not_applicable and m_thryve_add_on as valid decisions', () => {
    const warnings = getInlineWarnings('company-assets', form({
      ...ctxForm,
      deckExists: 'yes',
      resourceStatuses: { logo: 'not_applicable', typography: 'm_thryve_add_on' },
    }))
    expect(warnings['field-resource-logo']).toBeNull()
    expect(warnings['field-resource-typography']).toBeNull()
  })

  it('warns when a required resource is marked missing without a note', () => {
    const warnings = getInlineWarnings('company-assets', form({
      ...ctxForm,
      deckExists: 'yes',
      resourceStatuses: { logo: 'missing' },
    }))
    expect(warnings['field-resource-logo']).toBe('Logo (final) is marked missing — add an operator note')
  })

  it('clears the missing-without-note warning once a note is added', () => {
    const warnings = getInlineWarnings('company-assets', form({
      ...ctxForm,
      deckExists: 'yes',
      resourceStatuses: { logo: 'missing' },
      resourceNotes: { logo: 'Client will send the SVG next week' },
    }))
    expect(warnings['field-resource-logo']).toBeNull()
  })

  it('warns on required deck sections when a full deck exists but sections are unset', () => {
    const warnings = getInlineWarnings('company-assets', form({ ...ctxForm, deckExists: 'yes' }))
    expect(warnings['field-deckSection-cover']).toBe('Cover / brand mark needs a status decision')
  })

  it('does not warn on unset deck sections for a partial deck', () => {
    const warnings = getInlineWarnings('company-assets', form({ ...ctxForm, deckExists: 'partial' }))
    expect(warnings['field-deckSection-cover']).toBeUndefined()
  })
})

describe('getInlineWarnings — build-approach', () => {
  it('warns when no build approach is selected', () => {
    const warnings = getInlineWarnings('build-approach', form())
    expect(warnings['field-tier']).toBe('Please select a build approach')
  })

  it('clears once a tier is selected', () => {
    const warnings = getInlineWarnings('build-approach', form({ tier: 'custom' }))
    expect(warnings['field-tier']).toBeNull()
  })
})

describe('getInlineWarnings — template-select', () => {
  it('warns on missing template and version for the custom path', () => {
    const warnings = getInlineWarnings('template-select', form({ tier: 'custom' }))
    expect(warnings['field-templateId']).toBe('Please select a template')
    expect(warnings['field-projectVersion']).toBe('Please select a project version')
  })

  it('only warns on the version once a template is selected', () => {
    const warnings = getInlineWarnings('template-select', form({ tier: 'custom', templateId: 'apex' }))
    expect(warnings['field-templateId']).toBeNull()
    expect(warnings['field-projectVersion']).toBe('Please select a project version')
  })

  it('produces no warnings for the enterprise path', () => {
    const warnings = getInlineWarnings('template-select', form({ tier: 'enterprise' }))
    expect(warnings).toEqual({})
  })
})

describe('getInlineWarnings — enterprise-vision', () => {
  it('produces no warnings outside the enterprise path', () => {
    const warnings = getInlineWarnings('enterprise-vision', form({ tier: 'custom' }))
    expect(warnings).toEqual({})
  })

  it('warns on empty required vision fields for the enterprise path', () => {
    const warnings = getInlineWarnings('enterprise-vision', form({ tier: 'enterprise' }))
    expect(warnings['field-projectVision']).toBe('Project vision is required for Enterprise builds')
    expect(warnings['field-targetUsers']).toBe('Target users description is required')
  })

  it('warns on recommended fields left blank, cleared when filled', () => {
    const warnings = getInlineWarnings('enterprise-vision', form({ tier: 'enterprise' }))
    expect(warnings['field-integrations']).toMatch(/Recommended/)
    const filled = getInlineWarnings('enterprise-vision', form({ tier: 'enterprise', integrations: 'Salesforce' }))
    expect(filled['field-integrations']).toBeNull()
  })

  it('clears required warnings once filled', () => {
    const warnings = getInlineWarnings('enterprise-vision', form({
      tier: 'enterprise',
      projectVision: 'A logistics platform',
      targetUsers: 'Operations managers',
    }))
    expect(warnings['field-projectVision']).toBeNull()
    expect(warnings['field-targetUsers']).toBeNull()
  })
})

describe('getInlineWarnings — pages-features', () => {
  it('warns when no feature is selected', () => {
    const warnings = getInlineWarnings('pages-features', form())
    expect(warnings['field-features']).toBe('At least one feature is required')
  })

  it('warns on features missing a priority', () => {
    const warnings = getInlineWarnings('pages-features', form({ features: ['Authentication'] }))
    expect(warnings['field-features']).toBeNull()
    expect(warnings['field-priority-Authentication']).toBe("Feature 'Authentication' needs a priority")
  })

  it('clears the priority warning once set', () => {
    const warnings = getInlineWarnings('pages-features', form({
      features: ['Authentication'],
      featurePriorities: { Authentication: 'Required' },
    }))
    expect(warnings['field-priority-Authentication']).toBeNull()
  })

  it('sanitizes feature names into html-safe field ids', () => {
    expect(slugify('AI Chatbot')).toBe('AI-Chatbot')
    expect(slugify('API Integration')).toBe('API-Integration')
  })
})

describe('getInlineWarnings — no-op steps', () => {
  it('returns nothing for the design, review, and outcome steps', () => {
    expect(getInlineWarnings('design' as StepId, form())).toEqual({})
    expect(getInlineWarnings('review' as StepId, form())).toEqual({})
    expect(getInlineWarnings('outcome' as StepId, form())).toEqual({})
  })
})
