/**
 * REV-03: Industry-to-template-tag mapping layer.
 *
 * Maps each industry to the template tags that are compatible with it.
 * Templates can have multiple tags. A template matches an industry if
 * it has at least one tag that appears in the industry's tag list.
 */

export interface IndustryTemplateMapping {
  /** Slug key used for lookups. */
  industry: string
  /** Human-readable industry label shown in the filter indicator. */
  label: string
  /** Template tags that are compatible with this industry. */
  compatibleTags: string[]
  /** Tags for templates that are "recommended alternatives" — related but not primary. */
  relatedTags: string[]
}

export const INDUSTRY_TEMPLATE_MAP: IndustryTemplateMapping[] = [
  {
    industry: 'entertainment',
    label: 'Entertainment',
    compatibleTags: [
      'entertainment',
      'media',
      'events',
      'streaming',
      'artist',
      'performer',
      'production',
    ],
    relatedTags: ['creative', 'portfolio', 'agency'],
  },
  {
    industry: 'real-estate',
    label: 'Real Estate',
    compatibleTags: ['real-estate', 'property', 'listings', 'realty', 'broker'],
    relatedTags: ['business', 'corporate', 'directory'],
  },
  {
    industry: 'healthcare',
    label: 'Healthcare',
    compatibleTags: [
      'healthcare',
      'medical',
      'clinic',
      'wellness',
      'dental',
      'pharmacy',
    ],
    relatedTags: ['professional', 'booking', 'directory'],
  },
  {
    industry: 'restaurant',
    label: 'Restaurant & Food',
    compatibleTags: ['restaurant', 'food', 'cafe', 'bakery', 'catering', 'bar'],
    relatedTags: ['ecommerce', 'delivery', 'booking'],
  },
  {
    industry: 'technology',
    label: 'Technology',
    compatibleTags: ['technology', 'saas', 'software', 'startup', 'fintech', 'ai'],
    relatedTags: ['corporate', 'agency', 'portfolio'],
  },
  {
    industry: 'education',
    label: 'Education',
    compatibleTags: [
      'education',
      'school',
      'university',
      'elearning',
      'training',
      'tutoring',
    ],
    relatedTags: ['nonprofit', 'community', 'directory'],
  },
  {
    industry: 'ecommerce',
    label: 'E-Commerce & Retail',
    compatibleTags: [
      'ecommerce',
      'retail',
      'shop',
      'store',
      'marketplace',
      'fashion',
    ],
    relatedTags: ['product', 'catalog', 'delivery'],
  },
  {
    industry: 'construction',
    label: 'Construction & Trades',
    compatibleTags: [
      'construction',
      'contractor',
      'architecture',
      'engineering',
      'plumbing',
      'electrical',
    ],
    relatedTags: ['business', 'corporate', 'portfolio'],
  },
  {
    industry: 'legal',
    label: 'Legal',
    compatibleTags: ['legal', 'law', 'attorney', 'firm'],
    relatedTags: ['professional', 'corporate', 'directory'],
  },
  {
    industry: 'finance',
    label: 'Finance & Insurance',
    compatibleTags: [
      'finance',
      'insurance',
      'banking',
      'accounting',
      'investment',
    ],
    relatedTags: ['corporate', 'professional', 'fintech'],
  },
  {
    industry: 'fitness',
    label: 'Fitness & Sports',
    compatibleTags: [
      'fitness',
      'gym',
      'sports',
      'yoga',
      'personal-training',
    ],
    relatedTags: ['wellness', 'booking', 'community'],
  },
  {
    industry: 'nonprofit',
    label: 'Nonprofit & Community',
    compatibleTags: [
      'nonprofit',
      'charity',
      'community',
      'church',
      'ngo',
      'foundation',
    ],
    relatedTags: ['education', 'events', 'directory'],
  },
  {
    industry: 'creative',
    label: 'Creative & Agency',
    compatibleTags: [
      'creative',
      'agency',
      'design',
      'photography',
      'videography',
      'art',
    ],
    relatedTags: ['portfolio', 'entertainment', 'media'],
  },
  {
    industry: 'travel',
    label: 'Travel & Hospitality',
    compatibleTags: [
      'travel',
      'hotel',
      'tourism',
      'hospitality',
      'resort',
      'booking',
    ],
    relatedTags: ['events', 'restaurant', 'directory'],
  },
  {
    industry: 'automotive',
    label: 'Automotive',
    compatibleTags: ['automotive', 'car', 'dealership', 'mechanic', 'rental'],
    relatedTags: ['business', 'directory', 'ecommerce'],
  },
  {
    industry: 'other',
    label: 'Other',
    compatibleTags: [],
    relatedTags: [],
  },
]

/**
 * Display-name aliases that map the intake form's INDUSTRIES values to the
 * mapping keys used by this module. Keys are lowrcased, trimmed display names.
 */
const INDUSTRY_ALIASES: Record<string, string> = {
  entertainment: 'entertainment',
  'real estate': 'real-estate',
  healthcare: 'healthcare',
  'food & beverage': 'restaurant',
  technology: 'technology',
  education: 'education',
  'e-commerce': 'ecommerce',
  'construction & trades': 'construction',
  legal: 'legal',
  finance: 'finance',
  'fitness & sports': 'fitness',
  'non-profit': 'nonprofit',
  nonprofit: 'nonprofit',
  'creative & agency': 'creative',
  'travel & hospitality': 'travel',
  automotive: 'automotive',
  other: 'other',
  // v3.0 canonical industry slugs
  'service-commerce': 'ecommerce',
  'dtc-ecommerce': 'ecommerce',
  'retail-multi-branch': 'ecommerce',
  'wholesale-distribution': 'ecommerce',
  'manufacturing-fabrication': 'construction',
  'logistics-transportation': 'travel',
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9 &-]/g, '')
}

/**
 * Resolves a form industry value (display string or slug) to the canonical
 * mapping key. Returns 'other' for unmapped or empty values so the filter
 * falls back to showing all templates.
 */
export function resolveIndustryKey(industry: string): string {
  const raw = industry.trim()
  if (!raw) return 'other'

  const slug = normalize(raw)

  // Exact key match (e.g. 'ecommerce', 'real-estate').
  const keyMatch = INDUSTRY_TEMPLATE_MAP.find(m => m.industry === slug)
  if (keyMatch) return slug

  // Match against display labels (case-insensitive, punctuation-stripped).
  const labelMatch = INDUSTRY_TEMPLATE_MAP.find(
    m => normalize(m.label) === slug,
  )
  if (labelMatch) return labelMatch.industry

  // Fallback alias.
  const alias = INDUSTRY_ALIASES[slug]
  if (alias) return alias

  return 'other'
}

/**
 * Returns the mapping for a given industry value (display string or key).
 * Falls back to the `'other'` mapping (no filtering) if not found.
 */
export function getMappingForIndustry(
  industry: string,
): IndustryTemplateMapping {
  const key = resolveIndustryKey(industry)
  return (
    INDUSTRY_TEMPLATE_MAP.find(m => m.industry === key) ??
    INDUSTRY_TEMPLATE_MAP.find(m => m.industry === 'other')!
  )
}