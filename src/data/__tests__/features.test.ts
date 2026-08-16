import { describe, it, expect } from 'vitest'
import {
  CORE_FEATURES,
  FEATURE_CATEGORIES,
  EXTENSIONS,
  CORE_FEATURE_CODES,
  EXTENSION_CODES,
  FEATURE_CATEGORY_VALUES,
  CATEGORIES_WITH_WEBSITE_EXTENSIONS,
} from '../features'
import type { CoreFeatureCode, ExtensionCode, FeatureCategory } from '../../types/intake'

describe('CORE_FEATURES', () => {
  it('contains exactly 8 entries', () => {
    expect(CORE_FEATURES).toHaveLength(8)
  })

  it('has unique codes Core001 through Core008', () => {
    const codes = CORE_FEATURES.map(f => f.code)
    expect(codes).toEqual([
      'Core001', 'Core002', 'Core003', 'Core004',
      'Core005', 'Core006', 'Core007', 'Core008',
    ])
  })

  it('every entry has a non-empty name and operator explanation', () => {
    for (const feature of CORE_FEATURES) {
      expect(feature.name.trim()).not.toBe('')
      expect(feature.operatorExplanation.trim()).not.toBe('')
    }
  })
})

describe('CORE_FEATURE_CODES', () => {
  it('is a Set containing exactly 8 codes', () => {
    expect(CORE_FEATURE_CODES).toBeInstanceOf(Set)
    expect(CORE_FEATURE_CODES.size).toBe(8)
  })

  it('contains every code from CORE_FEATURES', () => {
    for (const feature of CORE_FEATURES) {
      expect(CORE_FEATURE_CODES.has(feature.code as CoreFeatureCode)).toBe(true)
    }
  })

  it('contains Core001 through Core008', () => {
    for (let i = 1; i <= 8; i++) {
      const code = `Core00${i}` as CoreFeatureCode
      expect(CORE_FEATURE_CODES.has(code)).toBe(true)
    }
  })
})

describe('FEATURE_CATEGORIES', () => {
  it('contains exactly 13 entries', () => {
    expect(FEATURE_CATEGORIES).toHaveLength(13)
  })

  it('has unique values', () => {
    const values = FEATURE_CATEGORIES.map(c => c.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('every entry has a non-empty label', () => {
    for (const category of FEATURE_CATEGORIES) {
      expect(category.label.trim()).not.toBe('')
    }
  })

  it('values match FEATURE_CATEGORY_VALUES', () => {
    const fromCategories = FEATURE_CATEGORIES.map(c => c.value).sort()
    const fromValues = [...FEATURE_CATEGORY_VALUES].sort()
    expect(fromCategories).toEqual(fromValues)
  })
})

describe('FEATURE_CATEGORY_VALUES', () => {
  it('contains exactly 13 values', () => {
    expect(FEATURE_CATEGORY_VALUES.size).toBe(13)
  })

  it('contains all canonical category slugs', () => {
    const expectedSlugs: FeatureCategory[] = [
      'crm', 'catalog', 'sales', 'operations', 'scheduling',
      'inventory', 'documents', 'workflow', 'billing',
      'engagement', 'analytics', 'administration', 'integrations',
    ]
    expect([...FEATURE_CATEGORY_VALUES].sort()).toEqual(expectedSlugs.sort())
  })
})

describe('EXTENSIONS', () => {
  it('contains exactly 11 entries', () => {
    expect(EXTENSIONS).toHaveLength(11)
  })

  it('has unique codes EXT-001 through EXT-011', () => {
    const codes = EXTENSIONS.map(e => e.code)
    expect(codes).toEqual([
      'EXT-001', 'EXT-002', 'EXT-003', 'EXT-004', 'EXT-005', 'EXT-006',
      'EXT-007', 'EXT-008', 'EXT-009', 'EXT-010', 'EXT-011',
    ])
  })

  it('every entry has a non-empty name and description', () => {
    for (const ext of EXTENSIONS) {
      expect(ext.name.trim()).not.toBe('')
      expect(ext.description.trim()).not.toBe('')
    }
  })

  it('every entry carries a category that exists in FEATURE_CATEGORY_VALUES', () => {
    for (const ext of EXTENSIONS) {
      expect(FEATURE_CATEGORY_VALUES.has(ext.category)).toBe(true)
    }
  })
})

describe('EXTENSION_CODES', () => {
  it('is a Set containing exactly 11 codes', () => {
    expect(EXTENSION_CODES).toBeInstanceOf(Set)
    expect(EXTENSION_CODES.size).toBe(11)
  })

  it('contains every code from EXTENSIONS', () => {
    for (const ext of EXTENSIONS) {
      expect(EXTENSION_CODES.has(ext.code as ExtensionCode)).toBe(true)
    }
  })

  it('does not contain any core feature code', () => {
    for (const coreCode of CORE_FEATURE_CODES) {
      expect(EXTENSION_CODES.has(coreCode as unknown as ExtensionCode)).toBe(false)
    }
  })
})

describe('CATEGORIES_WITH_WEBSITE_EXTENSIONS', () => {
  it('is a non-empty set', () => {
    expect(CATEGORIES_WITH_WEBSITE_EXTENSIONS.size).toBeGreaterThan(0)
  })

  it('contains only valid category values', () => {
    for (const cat of CATEGORIES_WITH_WEBSITE_EXTENSIONS) {
      expect(FEATURE_CATEGORY_VALUES.has(cat)).toBe(true)
    }
  })

  it('is a subset of all categories', () => {
    expect(CATEGORIES_WITH_WEBSITE_EXTENSIONS.size).toBeLessThanOrEqual(FEATURE_CATEGORIES.length)
  })
})

describe('canonical code contract — server mirror consistency', () => {
  it('CoreFeatureCode union has exactly 8 members that match CORE_FEATURE_CODES', () => {
    // The TypeScript type restricts at compile time; this verifies the runtime Set
    // that the server mirror must replicate byte-for-byte.
    const expected = ['Core001', 'Core002', 'Core003', 'Core004', 'Core005', 'Core006', 'Core007', 'Core008']
    expect([...CORE_FEATURE_CODES].sort()).toEqual(expected.sort())
  })

  it('ExtensionCode union has exactly 11 members that match EXTENSION_CODES', () => {
    const expected = [
      'EXT-001', 'EXT-002', 'EXT-003', 'EXT-004', 'EXT-005', 'EXT-006',
      'EXT-007', 'EXT-008', 'EXT-009', 'EXT-010', 'EXT-011',
    ]
    expect([...EXTENSION_CODES].sort()).toEqual(expected.sort())
  })
})
