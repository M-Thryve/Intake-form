// Canonical v3.0 feature definitions — §2.4, §2.5, §2.6 of REVISION_HANDOVER.md.
// This file is the single source of truth for every feature code, category, and
// extension definition on the frontend. Do not copy or redefine these lists in
// components — import from here.
//
// The server-side mirror is `server/src/lib/features.ts`.
// Both files must stay byte-for-byte consistent on all codes and values.

import type { CoreFeatureCode, ExtensionCode, FeatureCategory } from '../types/intake'

export interface CoreFeatureDef {
  code: CoreFeatureCode
  name: string
  operatorExplanation: string
}

export interface FeatureCategoryDef {
  value: FeatureCategory
  label: string
}

export interface ExtensionDef {
  code: ExtensionCode
  name: string
  category: FeatureCategory
  description: string
  includedCapabilities: string
}

// ── §2.4 Factory Core Features (always included, never selectable) ──────────

export const CORE_FEATURES: readonly CoreFeatureDef[] = [
  {
    code: 'Core001',
    name: 'Responsive Multi-Device Layout',
    operatorExplanation:
      'The site is built to work on desktop, tablet, and mobile — one build, every screen size.',
  },
  {
    code: 'Core002',
    name: 'Core Page Structure',
    operatorExplanation:
      'The essential pages every business site needs — home, about, services or products, and contact — are part of the build.',
  },
  {
    code: 'Core003',
    name: 'Brand Application & Design System',
    operatorExplanation:
      'Your logo, colors, and typography are applied consistently through a reusable style system.',
  },
  {
    code: 'Core004',
    name: 'Navigation & Site Architecture',
    operatorExplanation:
      'Menus, page hierarchy, and internal linking are structured so visitors can find what they need.',
  },
  {
    code: 'Core005',
    name: 'SEO Foundation',
    operatorExplanation:
      'Page titles, descriptions, clean URLs, sitemap, and robots rules so search engines can index the site correctly.',
  },
  {
    code: 'Core006',
    name: 'Performance Baseline',
    operatorExplanation:
      'Image optimization, caching, and load-speed tuning against modern web performance standards.',
  },
  {
    code: 'Core007',
    name: 'Security & Privacy Baseline',
    operatorExplanation:
      'HTTPS, form spam protection, and the privacy and cookie notices your site needs.',
  },
  {
    code: 'Core008',
    name: 'Deployment & Analytics-Ready Handover',
    operatorExplanation:
      'Production deployment, domain connection, and analytics-ready instrumentation on handover.',
  },
] as const

// ── §2.5 Feature categories (13 total, always present in dropdown) ───────────
// All thirteen appear in the dropdown at all times, in this order.
// Category selection is a browsing filter — never persisted as scope.

export const FEATURE_CATEGORIES: readonly FeatureCategoryDef[] = [
  { value: 'crm', label: 'Customer and Relationship Management' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'documents', label: 'Documents' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'billing', label: 'Billing' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'administration', label: 'Administration' },
  { value: 'integrations', label: 'Integrations' },
] as const

// ── §2.6 Optional website extensions (EXT-001..EXT-011) ─────────────────────
// Available for both templated-website and ai-assisted-website.
// Selection is optional. Persisted by code only — no priority, no cost at intake.

export const EXTENSIONS: readonly ExtensionDef[] = [
  {
    code: 'EXT-001',
    name: 'Contact Forms',
    category: 'crm',
    description: 'Structured ways for visitors to reach the business.',
    includedCapabilities: 'Inquiry forms; contact submissions; email notifications',
  },
  {
    code: 'EXT-002',
    name: 'Appointment Booking',
    category: 'scheduling',
    description:
      'Let clients request and confirm appointments online. Typical for consultants, clinics, and agencies.',
    includedCapabilities: 'Booking calendar; appointment requests; confirmation',
  },
  {
    code: 'EXT-003',
    name: 'Lead Capture',
    category: 'crm',
    description: 'Convert visitors into contactable leads.',
    includedCapabilities: 'Downloadable resources; inquiry capture; newsletter forms',
  },
  {
    code: 'EXT-004',
    name: 'Blog Module',
    category: 'engagement',
    description: 'Publish and organize written content.',
    includedCapabilities: 'Articles; categories; publishing',
  },
  {
    code: 'EXT-005',
    name: 'Newsletter Integration',
    category: 'engagement',
    description: 'Connect the site to an email marketing platform.',
    includedCapabilities: 'Mailchimp; Brevo; HubSpot',
  },
  {
    code: 'EXT-006',
    name: 'Analytics',
    category: 'analytics',
    description: 'Measure traffic and conversions.',
    includedCapabilities: 'Google Analytics; tracking pixels; conversion tracking',
  },
  {
    code: 'EXT-007',
    name: 'Portfolio / Project Gallery',
    category: 'catalog',
    description: 'Show completed work visually.',
    includedCapabilities: 'Project listings; image galleries; case studies',
  },
  {
    code: 'EXT-008',
    name: 'Reviews / Testimonials',
    category: 'crm',
    description: 'Display customer proof.',
    includedCapabilities: 'Testimonials; ratings; customer proof',
  },
  {
    code: 'EXT-009',
    name: 'FAQ Module',
    category: 'engagement',
    description: 'Answer common questions in a structured, searchable format.',
    includedCapabilities: 'FAQ sections; structured FAQ data',
  },
  {
    code: 'EXT-010',
    name: 'Download Center',
    category: 'documents',
    description: 'Give visitors downloadable material.',
    includedCapabilities: 'Brochures; catalogs; PDFs; resources',
  },
  {
    code: 'EXT-011',
    name: 'Product Showcase',
    category: 'catalog',
    description:
      'Present products without online selling. This is not e-commerce — there is no cart, checkout, or payment.',
    includedCapabilities: 'Products; categories; specifications; inquiry call-to-action',
  },
] as const

// ── Derived lookup sets ───────────────────────────────────────────────────────
// Use these for fast O(1) validation rather than iterating the arrays.

export const CORE_FEATURE_CODES: ReadonlySet<string> = new Set(
  CORE_FEATURES.map(f => f.code),
)

export const EXTENSION_CODES: ReadonlySet<string> = new Set(
  EXTENSIONS.map(e => e.code),
)

export const FEATURE_CATEGORY_VALUES: ReadonlySet<string> = new Set(
  FEATURE_CATEGORIES.map(c => c.value),
)

// Categories that have at least one extension for website builds.
// Used to determine whether to show the empty-state message.
export const CATEGORIES_WITH_WEBSITE_EXTENSIONS: ReadonlySet<FeatureCategory> = new Set(
  EXTENSIONS.map(e => e.category),
)
