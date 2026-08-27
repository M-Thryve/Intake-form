/**
 * v3.2 Template catalogue — static frontend definition.
 *
 * The catalogue is organised as 7 canonical industries, each containing one
 * or more categories. Template filtering is a DIRECT mapping from the selected
 * industry to its categories (see industry-template-map.ts) — the previous
 * tag-matching layer has been removed.
 *
 * The authoritative data supplied by the owner is the template NAME and its
 * CATEGORY (grouped under one of 7 canonical industries). Per-template
 * supporting fields (pages, features, accent, bg, delivery, purpose) are
 * prototype defaults derived from the template's industry — they are not part
 * of the owner-supplied catalogue and may be refined later.
 *
 * v3.1: Platform version selection is removed from the offer. Pricing is now
 * derived from a single base (see App.tsx calcPrice). Delivery estimates
 * remain per-template.
 */
export const PRICE_BASE_PHP = 20000

export type IndustrySlug =
  | 'service-commerce'
  | 'dtc-ecommerce'
  | 'retail-multi-branch'
  | 'wholesale-distribution'
  | 'manufacturing-fabrication'
  | 'warehousing-storage'
  | 'logistics-transportation'

export interface TemplateDefinition {
  id: string
  name: string
  /** Canonical industry slug this template belongs to. */
  industry: string
  /** Category label (one of the 29 catalogue categories). */
  category: string
  accent: string
  bg: string
  pages: string[]
  features: string[]
  purpose: string
  /** Deprecated: retained for interface stability. Filtering no longer uses tags. */
  tags: string[]
  /** Supported project types for REV-02 custom path (website only — mobile removed v3.1). */
  projectTypes: string[]
  /** Delivery estimate in working days (prototype default per industry). */
  delivery: number
}

interface IndustryDefaults {
  slug: IndustrySlug
  label: string
  accent: string
  bg: string
  pages: string[]
  features: string[]
  purpose: string
  delivery: number
  categories: { label: string; templates: string[] }[]
}

// ── Authoritative catalogue: 7 industries → 29 categories → 69 templates ──────
const CATALOG: IndustryDefaults[] = [
  {
    slug: 'service-commerce',
    label: 'Service-Based Commerce',
    accent: '#39D6C7',
    bg: '#0D2035',
    pages: ['Home', 'About', 'Services', 'Contact'],
    features: ['Contact Form', 'Service Listings', 'Lead Capture', 'Testimonials'],
    purpose: 'Service & consulting website',
    delivery: 7,
    categories: [
      {
        label: 'Marketing Agency',
        templates: ['Modern Marketing Agency', 'Social Media Agency'],
      },
      {
        label: 'Creative Agency and Studio',
        templates: ['Creative Portfolio', 'Production Studio', 'Design Agency'],
      },
      {
        label: 'Professional Consultant',
        templates: ['Personal Consultant', 'Consulting Firm', 'Expert Profile'],
      },
    ],
  },
  {
    slug: 'dtc-ecommerce',
    label: 'Direct-to-Consumer E-Commerce',
    accent: '#F97316',
    bg: '#1C0800',
    pages: ['Home', 'Shop', 'Product', 'Cart', 'Checkout'],
    features: ['Product Catalog', 'Shopping Cart', 'Payments', 'Order Tracking'],
    purpose: 'Online store',
    delivery: 10,
    categories: [
      {
        label: 'Fashion and Lifestyle Store',
        templates: ['Fashion Editorial', 'Minimal Fashion Store', 'Streetwear Store'],
      },
      {
        label: 'Beauty and Personal Care Store',
        templates: ['Skincare Brand', 'Cosmetics Store', 'Beauty Boutique'],
      },
      {
        label: 'Food and Beverage Product Store',
        templates: ['Specialty Food Brand', 'Coffee and Tea Store', 'Snack Brand'],
      },
      {
        label: 'Home and Living Store',
        templates: ['Furniture Store', 'Home Décor Brand', 'Minimal Living Store'],
      },
      {
        label: 'Electronics and Accessories Store',
        templates: ['Electronics Store', 'Gadget Brand', 'Gaming Products Store'],
      },
      {
        label: 'Specialty Product Store',
        templates: ['Pet Store', 'Baby and Kids Store', 'Toy and Learning Store'],
      },
      {
        label: 'Digital Product Store',
        templates: ['Digital Download Store', 'Template Marketplace', 'Creator Resource Store'],
      },
    ],
  },
  {
    slug: 'retail-multi-branch',
    label: 'Retail & Multi-Branch Commerce',
    accent: '#22C55E',
    bg: '#051A0E',
    pages: ['Home', 'Locations', 'Products', 'Contact'],
    features: ['Store Locator', 'Branch Listings', 'Product Catalog', 'Hours & Info'],
    purpose: 'Multi-branch retail website',
    delivery: 9,
    categories: [
      {
        label: 'General Retail Chain',
        templates: ['Standard', 'Specialty / Lifestyle'],
      },
      {
        label: 'Grocery and Convenience Retail',
        templates: ['Standard', 'Convenience / Specialty'],
      },
      {
        label: 'Pharmacy and Health Retail',
        templates: ['Pharmacy', 'Wellness'],
      },
      {
        label: 'Hardware, Furniture, and Appliance Retail',
        templates: ['General', 'Furniture & Appliance', 'Automotive Parts'],
      },
    ],
  },
  {
    slug: 'wholesale-distribution',
    label: 'Wholesale & Distribution',
    accent: '#7C6FCD',
    bg: '#1A0F2E',
    pages: ['Home', 'Catalog', 'About', 'Contact'],
    features: ['Product Catalog', 'Bulk Order Inquiry', 'Account Portal', 'Pricing Tiers'],
    purpose: 'Wholesale & distribution website',
    delivery: 9,
    categories: [
      {
        label: 'General Wholesale Distributor',
        templates: ['Standard', 'Multi-Brand'],
      },
      {
        label: 'Food & Beverage Distributor',
        templates: ['Standard', 'Hospitality Supplier'],
      },
      {
        label: 'Industrial Supplier',
        templates: ['Technical', 'Packaging'],
      },
      {
        label: 'Specialized Distributor',
        templates: ['Medical', 'Beauty & Agricultural', 'Automotive'],
      },
    ],
  },
  {
    slug: 'manufacturing-fabrication',
    label: 'Manufacturing & Fabrication',
    accent: '#EAB308',
    bg: '#1A1200',
    pages: ['Home', 'Capabilities', 'Products', 'Contact'],
    features: ['Capabilities Showcase', 'Product Catalog', 'Quote Request', 'Certifications'],
    purpose: 'Manufacturing & fabrication website',
    delivery: 11,
    categories: [
      {
        label: 'General Manufacturer',
        templates: ['Corporate', 'Consumer'],
      },
      {
        label: 'Industrial Manufacturer',
        templates: ['Heavy Equipment', 'Packaging'],
      },
      {
        label: 'Custom Fabricator',
        templates: ['Corporate', 'Design-Led'],
      },
      {
        label: 'Contract and Private-Label Manufacturer',
        templates: ['Standard', 'Private-Label'],
      },
    ],
  },
  {
    slug: 'warehousing-storage',
    label: 'Warehousing & Storage',
    accent: '#0EA5E9',
    bg: '#021018',
    pages: ['Home', 'Services', 'Facilities', 'Contact'],
    features: ['Service Listings', 'Facility Gallery', 'Request a Quote', 'FAQ'],
    purpose: 'Warehousing & storage website',
    delivery: 8,
    categories: [
      {
        label: 'General Warehouse Provider',
        templates: ['General Warehouse', 'Distribution Center'],
      },
      {
        label: 'E-Commerce Fulfillment',
        templates: ['Standard', 'Regional Fulfillment Hub'],
      },
      {
        label: 'Specialized Storage',
        templates: ['Temperature-Controlled', 'General'],
      },
    ],
  },
  {
    slug: 'logistics-transportation',
    label: 'Logistics & Transportation',
    accent: '#EF4444',
    bg: '#1A0500',
    pages: ['Home', 'Services', 'Track', 'Contact'],
    features: ['Service Listings', 'Shipment Tracking', 'Quote Request', 'Coverage Map'],
    purpose: 'Logistics & transportation website',
    delivery: 9,
    categories: [
      {
        label: 'Courier & Last-Mile Delivery',
        templates: ['Local Courier', 'E-Commerce Delivery'],
      },
      {
        label: 'Trucking & Freight Transport',
        templates: ['Trucking Company', 'Heavy Freight'],
      },
      {
        label: 'Freight Forwarding',
        templates: ['International Logistics', 'Air & Sea Freight'],
      },
      {
        label: 'Specialized Logistics',
        templates: ['Cold Chain & Medical Logistics', 'Moving & Third-Party Logistics'],
      },
    ],
  },
]

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const TEMPLATES: TemplateDefinition[] = CATALOG.flatMap((ind) =>
  ind.categories.flatMap((cat) =>
    cat.templates.map((name) => ({
      id: `${ind.slug}-${slug(cat.label)}-${slug(name)}`,
      name,
      industry: ind.slug,
      category: cat.label,
      accent: ind.accent,
      bg: ind.bg,
      pages: ind.pages,
      features: ind.features,
      purpose: ind.purpose,
      tags: [] as string[],
      projectTypes: ['website'] as string[],
      delivery: ind.delivery,
    })),
  ),
)

/** Flat list of the 29 category labels, in catalogue order. */
export const TEMPLATE_CATEGORY_NAMES: string[] = CATALOG.flatMap((ind) =>
  ind.categories.map((c) => c.label),
)

/** Canonical industry slug → display label. */
export const INDUSTRY_LABELS: Record<IndustrySlug, string> = CATALOG.reduce(
  (acc, ind) => {
    acc[ind.slug] = ind.label
    return acc
  },
  {} as Record<IndustrySlug, string>,
)