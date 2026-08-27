import { describe, it, expect } from 'vitest'
import {
  getMappingForIndustry,
  resolveIndustryKey,
  INDUSTRY_TEMPLATE_MAP,
} from '../industry-template-map'

describe('getMappingForIndustry', () => {
  it('returns the categories for a known canonical industry slug', () => {
    const m = getMappingForIndustry('dtc-ecommerce')
    expect(m.industry).toBe('dtc-ecommerce')
    expect(m.label).toBe('Direct-to-Consumer E-Commerce')
    expect(m.categories).toContain('Fashion and Lifestyle Store')
    expect(m.categories).toContain('Digital Product Store')
  })

  it('falls back to "other" for an unknown industry', () => {
    const m = getMappingForIndustry('unknown-industry')
    expect(m.industry).toBe('other')
  })

  it('returns "other" mapping with empty categories (no filtering) for "other"', () => {
    const m = getMappingForIndustry('other')
    expect(m.industry).toBe('other')
    expect(m.categories).toEqual([])
  })

  it('works with an empty string (falls back to "other")', () => {
    const m = getMappingForIndustry('')
    expect(m.industry).toBe('other')
  })
})

describe('resolveIndustryKey', () => {
  it('maps every canonical v3.2 industry slug directly to itself', () => {
    expect(resolveIndustryKey('service-commerce')).toBe('service-commerce')
    expect(resolveIndustryKey('dtc-ecommerce')).toBe('dtc-ecommerce')
    expect(resolveIndustryKey('retail-multi-branch')).toBe('retail-multi-branch')
    expect(resolveIndustryKey('wholesale-distribution')).toBe('wholesale-distribution')
    expect(resolveIndustryKey('manufacturing-fabrication')).toBe('manufacturing-fabrication')
    expect(resolveIndustryKey('warehousing-storage')).toBe('warehousing-storage')
    expect(resolveIndustryKey('logistics-transportation')).toBe('logistics-transportation')
  })

  it('maps a known display label to its slug', () => {
    expect(resolveIndustryKey('Service-Based Commerce')).toBe('service-commerce')
    expect(resolveIndustryKey('Direct-to-Consumer E-Commerce')).toBe('dtc-ecommerce')
    expect(resolveIndustryKey('Wholesale & Distribution')).toBe('wholesale-distribution')
    expect(resolveIndustryKey('Logistics & Transportation')).toBe('logistics-transportation')
  })

  it('maps the "Other" display name', () => {
    expect(resolveIndustryKey('Other')).toBe('other')
  })

  it('maps an unmapped industry to "other"', () => {
    expect(resolveIndustryKey('Technology')).toBe('other')
    expect(resolveIndustryKey('Marketing')).toBe('other')
    expect(resolveIndustryKey('Government')).toBe('other')
  })

  it('returns "other" for an empty string', () => {
    expect(resolveIndustryKey('')).toBe('other')
  })
})

describe('INDUSTRY_TEMPLATE_MAP integrity', () => {
  it('has exactly one entry per industry key (no duplicates)', () => {
    const keys = INDUSTRY_TEMPLATE_MAP.map((m) => m.industry)
    expect(keys).toHaveLength(new Set(keys).size)
  })

  it('every entry has a non-empty label', () => {
    for (const m of INDUSTRY_TEMPLATE_MAP) {
      expect(m.label.trim()).not.toBe('')
    }
  })

  it('the "other" entry has empty categories', () => {
    const other = INDUSTRY_TEMPLATE_MAP.find((m) => m.industry === 'other')
    expect(other).toBeDefined()
    expect(other!.categories).toEqual([])
  })

  it('catalogues exactly 7 canonical industries plus "other"', () => {
    const canonical = INDUSTRY_TEMPLATE_MAP.filter((m) => m.industry !== 'other')
    expect(canonical).toHaveLength(7)
    const categoryCount = canonical.reduce(
      (sum, m) => sum + m.categories.length,
      0,
    )
    expect(categoryCount).toBe(29)
  })
})