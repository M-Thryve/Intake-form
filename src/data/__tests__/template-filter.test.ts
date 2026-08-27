import { describe, it, expect } from 'vitest'
import type { TemplateDefinition } from '../templates'
import { filterTemplatesByIndustry } from '../template-filter'

function t(overrides: Partial<TemplateDefinition> = {}): TemplateDefinition {
  return {
    id: overrides.id ?? 'test',
    name: overrides.name ?? 'Test',
    industry: overrides.industry ?? 'dtc-ecommerce',
    category: overrides.category ?? 'Fashion and Lifestyle Store',
    accent: '#ccc',
    bg: '#111',
    pages: ['Home'],
    features: [],
    purpose: 'Test template',
    tags: overrides.tags ?? [],
    projectTypes: overrides.projectTypes ?? ['website'],
    delivery: overrides.delivery ?? 1,
  }
}

const templates = [
  t({ id: 'a', category: 'Marketing Agency' }),
  t({ id: 'b', category: 'Fashion and Lifestyle Store' }),
  t({ id: 'c', category: 'Creative Agency and Studio' }),
  t({ id: 'd', category: 'General Warehouse Provider' }),
  t({ id: 'e', category: 'Specialized Logistics' }),
]

describe('filterTemplatesByIndustry', () => {
  it('puts a template whose category belongs to the industry in primary', () => {
    const result = filterTemplatesByIndustry(templates, 'service-commerce')
    expect(result.primary.map((t) => t.id).sort()).toEqual(['a', 'c'])
    expect(result.recommended).toEqual([])
    expect(result.other.map((t) => t.id).sort()).toEqual(['b', 'd', 'e'])
  })

  it('returns all templates as primary for "other" industry (no filtering)', () => {
    const result = filterTemplatesByIndustry(templates, 'Other')
    expect(result.primary).toHaveLength(templates.length)
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })

  it('returns all templates as primary for an unknown industry', () => {
    const result = filterTemplatesByIndustry(templates, 'Technology')
    expect(result.primary).toHaveLength(templates.length)
  })

  it('returns all templates as primary when industry is empty', () => {
    const result = filterTemplatesByIndustry(templates, '')
    expect(result.primary).toHaveLength(templates.length)
  })

  it('handles empty template list gracefully', () => {
    const result = filterTemplatesByIndustry([], 'dtc-ecommerce')
    expect(result.primary).toEqual([])
    expect(result.recommended).toEqual([])
    expect(result.other).toEqual([])
  })
})