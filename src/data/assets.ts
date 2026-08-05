// v2.0 asset & company-deck requirements engine.
//
// Requirements vary by build path, project type, selected Custom Build
// template, and selected features. This module returns the resource
// checklist and the company-deck section list for a given context.

import type {
  BuildPath,
  RequirementSeverity,
  RequirementCategory,
} from '../types/intake'

export interface ResourceRequirement {
  key: string
  label: string
  category: RequirementCategory
  severity: RequirementSeverity
  /** Short helper the operator can read to the client. */
  description?: string
  /** Optional preliminary add-on rate when M-THRYVE prepares the resource. */
  preliminaryAddOnCost?: number
}

export interface CompanyDeckSectionDef {
  key: string
  label: string
  severity: RequirementSeverity
  description?: string
}

export interface RequirementContext {
  buildPath: BuildPath | ''
  projectType: string
  templateId?: string
  features: string[]
}

// ── Core brand + content resources (all builds) ───────────────────────────

const CORE_REQUIRED: ResourceRequirement[] = [
  { key: 'logo', label: 'Logo (final)', category: 'brand_identity', severity: 'required', preliminaryAddOnCost: 8000 },
  { key: 'logo_variants', label: 'Logo variants (light / dark / mono)', category: 'brand_identity', severity: 'required', preliminaryAddOnCost: 3000 },
  { key: 'brand_colors', label: 'Brand colors', category: 'brand_identity', severity: 'required' },
  { key: 'typography', label: 'Typography guidance', category: 'brand_identity', severity: 'required' },
  { key: 'company_deck', label: 'Company deck', category: 'company_deck', severity: 'required', preliminaryAddOnCost: 15000 },
  { key: 'product_desc', label: 'Product / service descriptions', category: 'product_content', severity: 'required', preliminaryAddOnCost: 6000 },
  { key: 'required_content', label: 'Required page / screen content', category: 'company_content', severity: 'required', preliminaryAddOnCost: 10000 },
]

const CORE_OPTIONAL: ResourceRequirement[] = [
  { key: 'existing_ref', label: 'Existing website / app reference', category: 'references', severity: 'recommended' },
  { key: 'brand_guide_ext', label: 'Additional brand guidelines', category: 'brand_identity', severity: 'recommended' },
  { key: 'product_screenshots', label: 'Product screenshots', category: 'media', severity: 'recommended' },
  { key: 'marketing_collateral', label: 'Marketing collateral', category: 'company_content', severity: 'recommended' },
  { key: 'personas', label: 'Customer personas', category: 'references', severity: 'recommended' },
  { key: 'competitors', label: 'Competitive references', category: 'references', severity: 'recommended' },
  { key: 'photography_video', label: 'Additional photography / video', category: 'media', severity: 'recommended' },
]

// ── Project-type additions ────────────────────────────────────────────────

const ECOMMERCE_EXTRA: ResourceRequirement[] = [
  { key: 'product_catalog', label: 'Product catalog / inventory source', category: 'product_content', severity: 'required', preliminaryAddOnCost: 12000 },
  { key: 'product_images', label: 'Product photography', category: 'media', severity: 'required', preliminaryAddOnCost: 20000 },
  { key: 'shipping_terms', label: 'Shipping & returns policy', category: 'legal_compliance', severity: 'required' },
  { key: 'payment_terms', label: 'Payment terms / merchant onboarding', category: 'legal_compliance', severity: 'required' },
]

const AI_AGENT_EXTRA: ResourceRequirement[] = [
  { key: 'training_data', label: 'Training / reference documents', category: 'technical', severity: 'required' },
  { key: 'agent_persona', label: 'Agent persona and tone-of-voice', category: 'product_content', severity: 'required' },
  { key: 'ai_disclaimer', label: 'AI-use disclaimer copy', category: 'legal_compliance', severity: 'recommended' },
  { key: 'guardrails', label: 'Response guardrails / escalation rules', category: 'technical', severity: 'required' },
]

const MOBILE_EXTRA: ResourceRequirement[] = [
  { key: 'app_icon', label: 'App icon assets (1024×1024)', category: 'brand_identity', severity: 'required', preliminaryAddOnCost: 4000 },
  { key: 'splash_screen', label: 'Splash screen assets', category: 'brand_identity', severity: 'recommended' },
  { key: 'store_listing', label: 'App store listing copy + screenshots', category: 'company_content', severity: 'recommended' },
]

const INTERNAL_TOOL_EXTRA: ResourceRequirement[] = [
  { key: 'roles_permissions', label: 'Roles & permissions matrix', category: 'technical', severity: 'required' },
  { key: 'data_model', label: 'Data model / entity definitions', category: 'technical', severity: 'required' },
  { key: 'sso_source', label: 'SSO / identity provider details', category: 'technical', severity: 'recommended' },
]

const WEBAPP_EXTRA: ResourceRequirement[] = [
  { key: 'user_flow', label: 'Primary user-flow sketch', category: 'references', severity: 'recommended' },
]

const WEBSITE_EXTRA: ResourceRequirement[] = [
  { key: 'seo_keywords', label: 'SEO keywords / positioning', category: 'company_content', severity: 'recommended' },
]

// ── Enterprise adds discovery-heavy requirements ──────────────────────────

const ENTERPRISE_EXTRA: ResourceRequirement[] = [
  { key: 'workflow_docs', label: 'Business workflow documentation', category: 'technical', severity: 'required' },
  { key: 'integration_specs', label: 'Integration specs (endpoints, contracts)', category: 'technical', severity: 'recommended' },
  { key: 'design_inspiration', label: 'Design inspiration references', category: 'design', severity: 'required' },
  { key: 'ux_reference', label: 'UI / UX reference examples', category: 'design', severity: 'recommended' },
]

// ── Feature-driven requirements ───────────────────────────────────────────

const FEATURE_MAP: Record<string, ResourceRequirement[]> = {
  Authentication: [
    { key: 'auth_policy', label: 'Auth policy (SSO / MFA scope)', category: 'technical', severity: 'recommended' },
  ],
  Payments: [
    { key: 'payment_provider', label: 'Preferred payment provider', category: 'technical', severity: 'required' },
    { key: 'payment_terms', label: 'Payment terms / merchant details', category: 'legal_compliance', severity: 'required' },
  ],
  'AI Chatbot': [
    { key: 'chatbot_kb', label: 'Chatbot knowledge-base content', category: 'technical', severity: 'required' },
  ],
  'Booking System': [
    { key: 'availability_rules', label: 'Availability / scheduling rules', category: 'technical', severity: 'required' },
  ],
  CMS: [
    { key: 'content_taxonomy', label: 'Content taxonomy / information architecture', category: 'company_content', severity: 'recommended' },
  ],
  Analytics: [
    { key: 'analytics_events', label: 'Analytics event definitions', category: 'technical', severity: 'recommended' },
  ],
  'API Integration': [
    { key: 'api_credentials', label: 'API access details (documentation reference)', category: 'technical', severity: 'required', description: 'Do not paste credentials in intake notes — capture through the secure follow-up channel.' },
  ],
  Notifications: [
    { key: 'notification_channels', label: 'Notification channels (email / SMS / push)', category: 'technical', severity: 'recommended' },
  ],
}

// ── Company-deck sections ─────────────────────────────────────────────────

const CORE_DECK: CompanyDeckSectionDef[] = [
  { key: 'cover', label: 'Cover / brand mark', severity: 'required' },
  { key: 'about', label: 'About the company', severity: 'required' },
  { key: 'mission_vision', label: 'Mission & vision', severity: 'required' },
  { key: 'products_services', label: 'Products / services overview', severity: 'required' },
  { key: 'contact', label: 'Contact details', severity: 'required' },
  { key: 'team', label: 'Team / leadership', severity: 'recommended' },
  { key: 'case_studies', label: 'Case studies / traction', severity: 'recommended' },
  { key: 'roadmap', label: 'Roadmap / future plans', severity: 'recommended' },
]

const ENTERPRISE_DECK_EXTRA: CompanyDeckSectionDef[] = [
  { key: 'market', label: 'Target market & personas', severity: 'required' },
  { key: 'gtm', label: 'Go-to-market strategy', severity: 'recommended' },
]

const ECOMMERCE_DECK_EXTRA: CompanyDeckSectionDef[] = [
  { key: 'catalog_overview', label: 'Catalog overview', severity: 'required' },
  { key: 'fulfillment', label: 'Fulfillment / logistics summary', severity: 'recommended' },
]

const AI_DECK_EXTRA: CompanyDeckSectionDef[] = [
  { key: 'use_cases', label: 'Priority AI use cases', severity: 'required' },
]

// ── Public API ────────────────────────────────────────────────────────────

/** Resources — Required (severity: 'required') then Optional (severity: 'recommended'). */
export function getResourceRequirements(ctx: RequirementContext): ResourceRequirement[] {
  const list: ResourceRequirement[] = [...CORE_REQUIRED]

  if (ctx.projectType === 'ecommerce') list.push(...ECOMMERCE_EXTRA)
  if (ctx.projectType === 'ai-agent') list.push(...AI_AGENT_EXTRA)
  if (ctx.projectType === 'mobile') list.push(...MOBILE_EXTRA)
  if (ctx.projectType === 'internal') list.push(...INTERNAL_TOOL_EXTRA)
  if (ctx.projectType === 'webapp') list.push(...WEBAPP_EXTRA)
  if (ctx.projectType === 'website') list.push(...WEBSITE_EXTRA)

  if (ctx.buildPath === 'enterprise') list.push(...ENTERPRISE_EXTRA)

  for (const f of ctx.features) {
    const extra = FEATURE_MAP[f]
    if (extra) list.push(...extra)
  }

  list.push(...CORE_OPTIONAL)

  const seen = new Set<string>()
  return list.filter(r => {
    if (seen.has(r.key)) return false
    seen.add(r.key)
    return true
  })
}

export function getRequiredResources(ctx: RequirementContext): ResourceRequirement[] {
  return getResourceRequirements(ctx).filter(r => r.severity === 'required')
}

export function getOptionalResources(ctx: RequirementContext): ResourceRequirement[] {
  return getResourceRequirements(ctx).filter(r => r.severity !== 'required')
}

export function getCompanyDeckSections(ctx: RequirementContext): CompanyDeckSectionDef[] {
  const list: CompanyDeckSectionDef[] = [...CORE_DECK]
  if (ctx.buildPath === 'enterprise') list.push(...ENTERPRISE_DECK_EXTRA)
  if (ctx.projectType === 'ecommerce') list.push(...ECOMMERCE_DECK_EXTRA)
  if (ctx.projectType === 'ai-agent') list.push(...AI_DECK_EXTRA)
  const seen = new Set<string>()
  return list.filter(s => {
    if (seen.has(s.key)) return false
    seen.add(s.key)
    return true
  })
}

/**
 * `not_applicable` guard. A short deny-list of core brand items where "N/A"
 * is never valid — logo, brand colors, typography, deck, page content.
 * For everything else N/A is accepted when the operator confirms it.
 */
const NEVER_NA = new Set([
  'logo',
  'brand_colors',
  'typography',
  'company_deck',
  'required_content',
])

export function isNotApplicableAllowed(reqKey: string, _ctx: RequirementContext): boolean {
  return !NEVER_NA.has(reqKey)
}

/** Human-friendly label for an AssetReadiness value. */
export const READINESS_LABEL: Record<string, string> = {
  available: 'Available',
  missing: 'Missing',
  provide_later: 'Provide later',
  not_applicable: 'Not applicable',
  m_thryve_add_on: 'M-THRYVE add-on',
}

/** Operator-facing spiel for the add-on flow. */
export const ADD_ON_SPIEL =
  'This resource is needed for the build. M-THRYVE can prepare it as an add-on with an additional charge, subject to owner confirmation.'
