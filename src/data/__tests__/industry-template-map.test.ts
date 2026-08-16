import { describe, it, expect } from 'vitest'
import {
  getMappingForIndustry,
  resolveIndustryKey,
  INDUSTRY_TEMPLATE_MAP,
} from '../industry-template-map'

describe('getMappingForIndustry', () => {
  it('returns the correct compatible and related tags for a known industry key', () => {
    const m = getMappingForIndustry('entertainment')
    expect(m.industry).toBe('entertainment')
    expect(m.label).toBe('Entertainment')
    expect(m.compatibleTags).toContain('events')
    expect(m.compatibleTags).toContain('media')
    expect(m.relatedTags).toContain('portfolio')
    expect(m.relatedTags).toContain('agency')
  })

  it('falls back to "other" for an unknown industry', () => {
    const m = getMappingForIndustry('unknown-industry')
    expect(m.industry).toBe('other')
  })

  it('returns "other" mapping with empty compatibleTags (no filtering) for "other"', () => {
    const m = getMappingForIndustry('other')
    expect(m.industry).toBe('other')
    expect(m.compatibleTags).toHaveLength(0)
  })

  it('works with an empty string (falls back to "other")', () => {
    const m = getMappingForIndustry('')
    expect(m.industry).toBe('other')
  })
})

describe('resolveIndustryKey', () => {
  it('maps every canonical v3.0 industry slug to a template family', () => {
    expect(resolveIndustryKey('service-commerce')).toBe('ecommerce')
    expect(resolveIndustryKey('dtc-ecommerce')).toBe('ecommerce')
    expect(resolveIndustryKey('retail-multi-branch')).toBe('ecommerce')
    expect(resolveIndustryKey('wholesale-distribution')).toBe('ecommerce')
    expect(resolveIndustryKey('manufacturing-fabrication')).toBe('construction')
    expect(resolveIndustryKey('warehousing-storage')).toBe('construction')
    expect(resolveIndustryKey('logistics-transportation')).toBe('travel')
  })

  it('maps a known display name to its key', () => {
    expect(resolveIndustryKey('E-Commerce')).toBe('ecommerce')
    expect(resolveIndustryKey('Food & Beverage')).toBe('restaurant')
    expect(resolveIndustryKey('Non-Profit')).toBe('nonprofit')
    expect(resolveIndustryKey('Real Estate')).toBe('real-estate')
    expect(resolveIndustryKey('Technology')).toBe('technology')
    expect(resolveIndustryKey('Healthcare')).toBe('healthcare')
    expect(resolveIndustryKey('Finance')).toBe('finance')
    expect(resolveIndustryKey('Education')).toBe('education')
    expect(resolveIndustryKey('Legal')).toBe('legal')
    expect(resolveIndustryKey('Entertainment')).toBe('entertainment')
  })

  it('maps the "Other" display name', () => {
    expect(resolveIndustryKey('Other')).toBe('other')
  })

  it('mapsMarketing to "other" (no alias)', () => {
    expect(resolveIndustryKey('Marketing')).toBe('other')
  })

  it('mapsLogistics to "other" (unmapped)', () => {
    expect(resolveIndustryKey('Logistics')).toBe('other')
  })

  it('mapsGovernment to "other"', () => {
    expect(resolveIndustryKey('Government')).toBe('other')
  })

  it('returns "other" for an empty string', () => {
    expect(resolveIndustryKey('')).toBe('other')
  })
})

describe('INDUSTRY_TEMPLATE_MAP integrity', () => {
  it('has exactly one entry per industry key (no duplicates)', () => {
    const keys = INDUSTRY_TEMPLATE_MAP.map(m => m.industry)
    expect(keys).toHaveLength(new Set(keys).size)
  })

  it('every entry has a non-empty label', () => {
    for (const m of INDUSTRY_TEMPLATE_MAP) {
      expect(m.label.trim()).not.toBe('')
    }
  })

  it('the "other" entry has empty compatibleTags and relatedTags', () => {
    const other = INDUSTRY_TEMPLATE_MAP.find(m => m.industry === 'other')
    expect(other).toBeDefined()
    expect(other!.compatibleTags).toEqual([])
    expect(other!.relatedTags).toEqual([])
  })
})
