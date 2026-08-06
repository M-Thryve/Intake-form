import { describe, it, expect } from 'vitest'
import type { TemplateDefinition } from '../templates'
import { filterTemplatesByIndustry } from '../template-filter'

function t(overrides: Partial<TemplateDefinition> = {}): TemplateDefinition {
  return {
    id: overrides.id ?? 'test',
    name: overrides.name ?? 'Test',
    category: overrides.category ?? 'Business',
    accent: '#ccc',
    bg: '#111',
    pages: ['Home'],
    features: [],
    purpose: 'Test template',
    tags: overrides.tags ?? [],
    projectTypes: overrides.projectTypes ?? ['website', 'mobile'],
    desktopPrice: 1000,
    mobilePrice: 1000,
    bothPrice: 1000,
    deliveryDesktop: 1,
    deliveryMobile: 1,
    deliveryBoth: 1,
  }
}

const templates = [
  t({ id: 'a', name: 'Business', tags: ['business', 'corporate'] }),
  t({ id: 'b', name: 'Store', tags: ['ecommerce', 'retail'] }),
  t({ id: 'c', name: 'Agency', tags: ['creative', 'portfolio', 'agency'] }),
  t({ id: 'd', name: 'Hotel', tags: ['travel', 'booking'] }),
  t({ id: 'e', name: 'Untagged', tags: [] }),
]

describe('filterTemplatesByIndustry', () => {
  it('categorises templates into primary/recommended/other', () => {
    const result = filterTemplatesByIndustry(templates, 'E-Commerce')
    expect(result.primary).toHaveLength(1)
    expect(result.primary[0].id).toBe('b')
    expect(result.recommended).toHaveLength(0)
    expect(result.other).toHaveLength(4)
  })

  it('puts primary match first even when a template has multiple matching tags', () => {
    // 'c' has tags that match creativecompatibleTags + also relatedTags of creative
    // For 'creative' industry: compatibleTags contains 'creative', relatedTags contains 'portfolio'.
    // 'c' should go to primary because creative is in compatibleTags.
    const result = filterTemplatesByIndustry(templates, 'creative')
    expect(result.primary.map(t => t.id)).toContain('c')
    expect(result.recommended.map(t => t.id)).not.toContain('c')
  })

  it('puts all templates into "other" when an industry has no matching templates', () => {
    // Technology requires technology/saas/software/startup/fintech/ai — none match.
    const result = filterTemplatesByIndustry(templates, 'Technology')
    expect(result.primary).toEqual([])
    expect(result.recommended).toHaveLength(2) // a (corporate), c (agency/portfolio)
    expect(result.other).toHaveLength(3) // b,d,e
  })

  it('returns all templates as primary for "other" industry (no filtering)', () => {
    const result = filterTemplatesByIndustry(templates, 'Other')
    expect(result.primary).toHaveLength(templates.length)
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })

  it('handles empty template list gracefully', () => {
    const result = filterTemplatesByIndustry([], 'Technology')
    expect(result.primary).toEqual([])
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })
})