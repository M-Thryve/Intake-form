import { describe, it, expect } from 'vitest'
import { filterTemplatesByIndustry } from '../lib/templateFiltering'
import { TEMPLATES } from '../data/templates'

describe('filterTemplatesByIndustry (static catalogue)', () => {
  it('resolves the full static catalogue (69 templates / 29 categories / 7 industries)', () => {
    expect(TEMPLATES).toHaveLength(69)
    const categories = new Set(TEMPLATES.map((t) => t.category))
    expect(categories.size).toBe(29)
    const industries = new Set(TEMPLATES.map((t) => t.industry))
    expect(industries.size).toBe(7)
  })

  it('returns every template as primary for an unknown industry (no filtering)', async () => {
    const result = await filterTemplatesByIndustry('Technology')
    expect(result.primary).toHaveLength(69)
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })

  it('returns only the selected industry\'s templates as primary', async () => {
    const result = await filterTemplatesByIndustry('dtc-ecommerce')
    expect(result.primary.length).toBeGreaterThan(0)
    expect(result.primary.every((t) => t.industry === 'dtc-ecommerce')).toBe(true)
    expect(result.other.every((t) => t.industry !== 'dtc-ecommerce')).toBe(true)
  })

  it('returns the correct shape for an empty industry', async () => {
    const result = await filterTemplatesByIndustry('')
    expect(result).toHaveProperty('primary')
    expect(result).toHaveProperty('recommended')
    expect(result).toHaveProperty('other')
    expect(result.primary).toHaveLength(69)
  })
})