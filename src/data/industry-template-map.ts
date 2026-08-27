/**
 * REV-03 (v3.2): Industry-to-template direct mapping.
 *
 * The seven canonical industries map EXACTLY onto the seven catalogue groups.
 * A template belongs to a category, and a category belongs to exactly one
 * industry. Filtering is therefore a direct category-membership test — the
 * previous tag-matching layer has been removed.
 */

export interface IndustryTemplateMapping {
  /** Canonical industry slug (e.g. 'service-commerce'). */
  industry: string
  /** Human-readable industry label shown in the filter indicator. */
  label: string
  /** Template category labels that belong to this industry. */
  categories: string[]
}

export const INDUSTRY_TEMPLATE_MAP: IndustryTemplateMapping[] = [
  {
    industry: 'service-commerce',
    label: 'Service-Based Commerce',
    categories: [
      'Marketing Agency',
      'Creative Agency and Studio',
      'Professional Consultant',
    ],
  },
  {
    industry: 'dtc-ecommerce',
    label: 'Direct-to-Consumer E-Commerce',
    categories: [
      'Fashion and Lifestyle Store',
      'Beauty and Personal Care Store',
      'Food and Beverage Product Store',
      'Home and Living Store',
      'Electronics and Accessories Store',
      'Specialty Product Store',
      'Digital Product Store',
    ],
  },
  {
    industry: 'retail-multi-branch',
    label: 'Retail & Multi-Branch Commerce',
    categories: [
      'General Retail Chain',
      'Grocery and Convenience Retail',
      'Pharmacy and Health Retail',
      'Hardware, Furniture, and Appliance Retail',
    ],
  },
  {
    industry: 'wholesale-distribution',
    label: 'Wholesale & Distribution',
    categories: [
      'General Wholesale Distributor',
      'Food & Beverage Distributor',
      'Industrial Supplier',
      'Specialized Distributor',
    ],
  },
  {
    industry: 'manufacturing-fabrication',
    label: 'Manufacturing & Fabrication',
    categories: [
      'General Manufacturer',
      'Industrial Manufacturer',
      'Custom Fabricator',
      'Contract and Private-Label Manufacturer',
    ],
  },
  {
    industry: 'warehousing-storage',
    label: 'Warehousing & Storage',
    categories: [
      'General Warehouse Provider',
      'E-Commerce Fulfillment',
      'Specialized Storage',
    ],
  },
  {
    industry: 'logistics-transportation',
    label: 'Logistics & Transportation',
    categories: [
      'Courier & Last-Mile Delivery',
      'Trucking & Freight Transport',
      'Freight Forwarding',
      'Specialized Logistics',
    ],
  },
  {
    industry: 'other',
    label: 'Other',
    categories: [],
  },
]

/**
 * Display-name / alias fallbacks that map an intake form industry value to a
 * canonical slug. The form's 7 canonical slugs are matched directly; these
 * aliases cover legacy display strings.
 */
const INDUSTRY_ALIASES: Record<string, string> = {
  'service-based commerce': 'service-commerce',
  'direct-to-consumer e-commerce': 'dtc-ecommerce',
  'retail & multi-branch commerce': 'retail-multi-branch',
  'wholesale & distribution': 'wholesale-distribution',
  'manufacturing & fabrication': 'manufacturing-fabrication',
  'warehousing & storage': 'warehousing-storage',
  'logistics & transportation': 'logistics-transportation',
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9 &-]/g, '')
}

/**
 * Resolves a form industry value (display string or slug) to a canonical
 * mapping key. Returns 'other' for unmapped or empty values so the filter
 * falls back to showing all templates.
 */
export function resolveIndustryKey(industry: string): string {
  const raw = (industry ?? '').trim()
  if (!raw) return 'other'

  const slug = normalize(raw)

  const keyMatch = INDUSTRY_TEMPLATE_MAP.find((m) => m.industry === slug)
  if (keyMatch) return slug

  const labelMatch = INDUSTRY_TEMPLATE_MAP.find(
    (m) => normalize(m.label) === slug,
  )
  if (labelMatch) return labelMatch.industry

  const alias = INDUSTRY_ALIASES[slug]
  if (alias) return alias

  return 'other'
}

/**
 * Returns the mapping for a given industry value (display string or key).
 * Falls back to the 'other' mapping (no filtering) if not found.
 */
export function getMappingForIndustry(
  industry: string,
): IndustryTemplateMapping {
  const key = resolveIndustryKey(industry)
  return (
    INDUSTRY_TEMPLATE_MAP.find((m) => m.industry === key) ??
    INDUSTRY_TEMPLATE_MAP.find((m) => m.industry === 'other')!
  )
}