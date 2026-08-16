import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type {
  FormData,
  Tier,
  StepId,
  IntakeOutcome,
  DiscardReasonCode,
  MissingRequirement,
  OperatorNote,
  UploadedAssetRef,
} from './types/intake'
import { getFlow } from './data/flow'
import { validateStep, collectMissingRequirements, canSubmit } from './data/validation'
import { getInlineWarnings, isValidEmail, slugify, type ValidationState } from './data/field-validators'
import InlineWarning from './components/InlineWarning'
import AssetUploader from './components/AssetUploader'
import {
  submitIntakeForReview,
  saveDraft,
  discardIntake,
  toSubmissionPayload,
  generateIdempotencyKey,
  getIntakeDraft,
  rehydrateDraftState,
} from './api/intake'
import type { AssetBinding } from './api/assets'
import { TEMPLATES, type TemplateDefinition } from './data/templates'
import { filterTemplatesByIndustry } from './data/template-filter'
import { getMappingForIndustry } from './data/industry-template-map'
import {
  getRequiredResources,
  getOptionalResources,
  getCompanyDeckSections,
  isNotApplicableAllowed,
  READINESS_LABEL,
  ADD_ON_SPIEL,
  type RequirementContext,
  type ResourceRequirement,
} from './data/assets'
import type { AssetReadiness } from './types/intake'
import ClientPortal from './portal/ClientPortal'
import {
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_GROUP_ORDER,
  QUESTIONNAIRE_GROUP_LABELS,
  type QuestionnaireFieldDef,
} from './data/questionnaire'
import { CORE_FEATURES, EXTENSIONS, FEATURE_CATEGORIES } from './data/features'
import type { WebsiteQuestionnaire } from './types/intake'

const EMPTY_FORM: FormData = {
  fullName: '', company: '', email: '', phone: '', projectName: '',
  industry: '', projectType: '', businessDesc: '',
  assetQualification: '', assetStatuses: {}, selectedAssetServices: [], uploadedAssets: [],
  deckExists: '',
  deckSectionStatuses: {},
  deckSectionNotes: {},
  resourceStatuses: {},
  resourceNotes: {},
  resourceAddOnCosts: {},
  tier: '',
  templateCategory: '', templateId: '', projectVersion: '', colorPreset: '',
  customSizes: false, allSizes: false,
  projectVision: '', targetUsers: '', userRoles: '', businessWorkflows: '',
  integrations: '', existingSystems: '', dataSecurityReqs: '', scalabilityReqs: '',
  designInspiration: '', competitors: '', successCriteria: '',
  features: [], featurePriorities: {}, customFeatures: [], selectedExtensions: [],
  designStyles: [], inspirationLink: '',
  paymentPlan: '', voucherCode: '', voucherStatus: '',
  maintenanceAfterFree: '', maintenanceEndAcknowledged: false, preferredBillingDate: '',
  confirmAccurate: false, confirmReceipt: false, confirmPayment: false,
  confirmMaintenance: false, confirmBuildCard: false, confirmSubmission: false,
}


// ── Constants ──────────────────────────────────────────────────────────────────

function getProjectTypes(tier: Tier): { id: string; label: string; icon: string }[] {
  if (tier === 'custom' || tier === 'template') {
    return [
      { id: 'templated-website', label: 'Templated Website', icon: '◈' },
      { id: 'ai-assisted-website', label: 'AI-Assisted Website', icon: '◆' },
    ]
  }
  if (tier === 'enterprise') {
    return [
      { id: 'website', label: 'Website', icon: '◈' },
      { id: 'webapp', label: 'Web App', icon: '⚡' },
      { id: 'ecommerce', label: 'E-Commerce', icon: '◇' },
      { id: 'internal', label: 'Internal Tool', icon: '⊕' },
    ]
  }
  return []
}
const PROJECT_TYPES_FULL = [
  { id: 'templated-website', label: 'Templated Website', icon: '◈' },
  { id: 'ai-assisted-website', label: 'AI-Assisted Website', icon: '◆' },
  { id: 'website', label: 'Website', icon: '◈' },
  { id: 'webapp', label: 'Web App', icon: '⚡' },
  { id: 'ecommerce', label: 'E-Commerce', icon: '◇' },
  { id: 'internal', label: 'Internal Tool', icon: '⊕' },
]

const INDUSTRIES = [
  { value: 'service-commerce', label: 'Service-Based Commerce' },
  { value: 'dtc-ecommerce', label: 'Direct-to-Consumer E-Commerce' },
  { value: 'retail-multi-branch', label: 'Retail & Multi-Branch Commerce' },
  { value: 'wholesale-distribution', label: 'Wholesale & Distribution' },
  { value: 'manufacturing-fabrication', label: 'Manufacturing & Fabrication' },
  { value: 'warehousing-storage', label: 'Warehousing & Storage' },
  { value: 'logistics-transportation', label: 'Logistics & Transportation' },
]

const TEMPLATE_CATEGORIES = ['All', 'Business', 'E-Commerce', 'Portfolio', 'Restaurant', 'Real Estate', 'Booking']

interface ColorOption { id: string; name: string; color: string }
const COLOR_OPTIONS: ColorOption[] = [
  { id: 'original', name: 'Original Template', color: '#39D6C7' },
  { id: 'dark', name: 'M-THRYVE Dark', color: '#334155' },
  { id: 'ocean', name: 'Ocean Blue', color: '#0EA5E9' },
  { id: 'neutral', name: 'Modern Neutral', color: '#94A3B8' },
  { id: 'emerald', name: 'Emerald', color: '#10B981' },
  { id: 'warm', name: 'Warm Commerce', color: '#F97316' },
]

const ASSET_CHECKLIST = [
  { id: 'logo', label: 'Logo', required: true },
  { id: 'logo-vector', label: 'Logo Source / Vector File', required: true },
  { id: 'brand-colors', label: 'Brand Colors', required: false },
  { id: 'brand-fonts', label: 'Brand Fonts', required: false },
  { id: 'brand-guide', label: 'Brand Guide', required: false },
  { id: 'company-profile', label: 'Company Profile / Deck', required: true },
  { id: 'biz-desc', label: 'Business Description', required: true },
  { id: 'product-desc', label: 'Product / Service Descriptions', required: false },
  { id: 'website-copy', label: 'Website or App Copy', required: false },
  { id: 'team-info', label: 'Team Information', required: false },
  { id: 'contact-info', label: 'Contact Information', required: true },
  { id: 'photography', label: 'Photographs', required: false },
  { id: 'product-images', label: 'Product Images', required: false },
  { id: 'testimonials', label: 'Testimonials', required: false },
  { id: 'legal-policy', label: 'Legal / Policy Content', required: false },
  { id: 'social-links', label: 'Social Media Links', required: false },
  { id: 'existing-site', label: 'Existing Website / App Materials', required: false },
  { id: 'other', label: 'Other Supporting Files', required: false },
]

const ASSET_STATUS_OPTIONS = ['Available', 'Missing', 'Not Applicable', 'Provide Later']

const ASSET_SERVICES = [
  { id: 'logo-creation', name: 'Logo Creation', desc: 'Custom logo designed from scratch to match your brand identity.' },
  { id: 'brand-identity', name: 'Brand Identity Package', desc: 'Full brand guidelines including colors, fonts, and usage rules.' },
  { id: 'company-profile', name: 'Company Profile / Deck', desc: 'Professional company profile or presentation deck.' },
  { id: 'copywriting', name: 'Copywriting', desc: 'Professional website and marketing copy written for your audience.' },
  { id: 'content-org', name: 'Content Organization', desc: 'We organize, clean, and structure your existing materials.' },
  { id: 'image-sourcing', name: 'Image Sourcing', desc: 'Licensed stock photography and illustration curated for your project.' },
  { id: 'illustration', name: 'Custom Illustration', desc: 'Original digital illustrations tailored to your brand.' },
  { id: 'photo-coord', name: 'Photography Coordination', desc: 'Professional photography session coordination.' },
  { id: 'product-content', name: 'Product Content Preparation', desc: 'Product descriptions, images, and catalog organization.' },
]

// ── Page content definitions ───────────────────────────────────────────────────

interface PageField { id: string; label: string; type: 'text' | 'textarea'; placeholder: string; required?: boolean }
interface UploadSpec { id: string; label: string; required: boolean; count: string; dimensions?: string; formats: string }
interface PageDef { fields: PageField[]; uploads: UploadSpec[] }

const PAGE_DEFS: Record<string, PageDef> = {
  'Home': {
    fields: [
      { id: 'headline', label: 'Main Headline', type: 'text', placeholder: 'e.g. Built for the Bold', required: true },
      { id: 'tagline', label: 'Supporting Text', type: 'text', placeholder: 'e.g. Your trusted partner for growth' },
      { id: 'cta_label', label: 'Primary Button Text', type: 'text', placeholder: 'e.g. Get Started' },
      { id: 'intro', label: 'Short Company Introduction', type: 'textarea', placeholder: 'A brief sentence or two about your business...' },
    ],
    uploads: [
      { id: 'logo', label: 'Company Logo', required: true, count: '1 file', dimensions: '500×200px min', formats: 'PNG, SVG, PDF' },
      { id: 'hero', label: 'Hero Image', required: true, count: '1 file', dimensions: '1920×1080px', formats: 'JPG, PNG, WebP' },
      { id: 'supporting', label: 'Supporting Images', required: false, count: '2–6 files', formats: 'JPG, PNG — max 5 MB each' },
    ],
  },
  'About': {
    fields: [
      { id: 'story', label: 'Company Story', type: 'textarea', placeholder: 'How your business started and what drives it...', required: true },
      { id: 'mission', label: 'Mission', type: 'text', placeholder: 'e.g. To make great software accessible to all businesses' },
      { id: 'values', label: 'Core Values', type: 'text', placeholder: 'e.g. Integrity, Innovation, Excellence' },
    ],
    uploads: [
      { id: 'logo', label: 'Company Logo', required: true, count: '1 file', formats: 'PNG, SVG, PDF' },
      { id: 'team', label: 'Team Photos', required: false, count: '1–12 files', dimensions: '600×600px each', formats: 'JPG, PNG' },
    ],
  },
  'Services': {
    fields: [
      { id: 'service_list', label: 'Service Names (one per line)', type: 'textarea', placeholder: 'Web Design\nBranding\nSEO Optimization', required: true },
      { id: 'service_descs', label: 'Service Descriptions', type: 'textarea', placeholder: 'Brief description for each service...' },
    ],
    uploads: [
      { id: 'logo', label: 'Company Logo', required: true, count: '1 file', formats: 'PNG, SVG, PDF' },
      { id: 'service_images', label: 'Service Images', required: false, count: '1 per service', formats: 'JPG, PNG, SVG' },
    ],
  },
  'Contact': {
    fields: [
      { id: 'address', label: 'Business Address', type: 'textarea', placeholder: 'Full business address...' },
      { id: 'contact_email', label: 'Contact Email', type: 'text', placeholder: 'e.g. hello@company.com', required: true },
      { id: 'contact_phone', label: 'Contact Number', type: 'text', placeholder: 'e.g. +63 917 000 0000' },
      { id: 'hours', label: 'Business Hours', type: 'text', placeholder: 'e.g. Mon–Fri, 9am–6pm' },
    ],
    uploads: [{ id: 'logo', label: 'Company Logo', required: true, count: '1 file', formats: 'PNG, SVG, PDF' }],
  },
}

const DEFAULT_PAGE_DEF: PageDef = {
  fields: [{ id: 'content', label: 'Page Content', type: 'textarea', placeholder: 'Describe the content for this page...', required: true }],
  uploads: [
    { id: 'logo', label: 'Company Logo', required: true, count: '1 file', formats: 'PNG, SVG, PDF' },
    { id: 'page_images', label: 'Page Images', required: false, count: '1–4 files', formats: 'JPG, PNG — max 5 MB each' },
  ],
}
function getPageDef(name: string): PageDef { return PAGE_DEFS[name] ?? DEFAULT_PAGE_DEF }

// ── Pricing helpers ────────────────────────────────────────────────────────────

function calcPrice(template: TemplateDefinition | undefined, version: string) {
  if (!template) return { base: 0, total: 0, delivery: 0, versionLabel: '—' }
  const base = version === 'mobile' ? template.mobilePrice
    : version === 'both' ? template.bothPrice
    : template.desktopPrice
  const delivery = version === 'mobile' ? template.deliveryMobile
    : version === 'both' ? template.deliveryBoth
    : template.deliveryDesktop
  const versionLabel = version === 'mobile' ? 'Mobile App' : version === 'both' ? 'Website + Mobile App' : 'Website'
  return { base, total: base, delivery, versionLabel }
}

function getPreviewAccent(templateAccent: string, colorId: string): string {
  const opt = COLOR_OPTIONS.find(c => c.id === colorId)
  if (!opt || opt.id === 'original') return templateAccent
  return opt.color
}

function formatPhp(n: number) { return '₱' + n.toLocaleString('en-PH') }

function deliveryDate(workingDays: number): string {
  if (!workingDays) return '—'
  const d = new Date()
  let added = 0
  while (added < workingDays) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getMaintenanceRate(tier: Tier): number {
  // NOTE: Prototype maintenance rates — configure in production.
  if (tier === 'enterprise') return 8000
  if (tier === 'custom') return 5000
  return 3500
}

function makeClientVoucher() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let v = 'REF-'
  for (let i = 0; i < 6; i++) v += chars[Math.floor(Math.random() * chars.length)]
  return v
}

function getTechStack(projectType: string, features: string[]) {
  const hasAI = features.includes('AI Chatbot') || projectType === 'ai-agent'
  if (projectType === 'mobile') return ['React Native', 'Expo', 'Node.js', 'PostgreSQL', 'Redis']
  if (projectType === 'ai-agent') return ['Python', 'FastAPI', 'LangChain', 'PostgreSQL', 'OpenAI API']
  if (projectType === 'ecommerce') return ['Next.js', 'Stripe', 'PostgreSQL', 'Vercel', 'Sanity CMS']
  if (hasAI) return ['Next.js', 'OpenAI API', 'Node.js', 'PostgreSQL', 'Vercel']
  if (projectType === 'saas') return ['Next.js', 'TypeScript', 'PostgreSQL', 'Redis', 'AWS']
  return ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Vercel']
}

function getComplexity(features: string[], projectType: string, tier: Tier) {
  if (tier === 'template') return { label: 'Low', color: '#39D6C7', level: 18 }
  if (tier === 'custom') return { label: 'Moderate', color: '#F59E0B', level: 50 }
  const score = features.length * (['saas', 'enterprise', 'ai-agent'].includes(projectType) ? 1.4 : 1)
  if (score <= 4) return { label: 'Standard', color: '#39D6C7', level: 30 }
  if (score <= 8) return { label: 'Moderate', color: '#F59E0B', level: 58 }
  if (score <= 13) return { label: 'Complex', color: '#F97316', level: 78 }
  return { label: 'Enterprise-Grade', color: '#EF4444', level: 95 }
}

function getTeam(projectType: string, features: string[], tier: Tier) {
  if (tier === 'template') return ['Template Engineer', 'Content Specialist']
  if (tier === 'custom') return ['Lead Engineer', 'UI/UX Designer', 'Content Specialist', 'QA Engineer']
  const team = ['Lead Engineer', 'UI/UX Designer', 'Backend Engineer', 'QA Engineer']
  if (features.includes('AI Chatbot') || projectType === 'ai-agent') team.push('AI/ML Engineer')
  if (projectType === 'mobile') team.push('Mobile Engineer')
  if (features.length > 8 || tier === 'enterprise') team.push('DevOps Engineer')
  return team
}

// ── FAQ data ───────────────────────────────────────────────────────────────────

const FAQ_DATA: Record<string, Array<{ q: string; a: string }>> = {
  'intro': [
    { q: 'What is this intake for?', a: "This private intake collects everything our team needs to prepare your preliminary Build Card and project brief for owner review. Think of it as the starting point of your build journey." },
    { q: 'Has my project already been approved?', a: "Not yet. This intake is step one. After you submit, the M-THRYVE owner reviews your project and will reach out to confirm next steps." },
    { q: 'How long does this take?', a: "Most clients complete the intake in 10–20 minutes. Take your time — the more we know, the better your Build Card will be." },
    { q: 'Can I save and continue later?', a: "This is a guided session best completed in one sitting. You can navigate back to any step to make changes before submitting." },
    { q: 'What happens after I submit?', a: "Your Build Card and preliminary project receipt are sent to the M-THRYVE owner for review. The owner will reach out within 24 hours to confirm next steps." },
  ],
  'client-details': [
    { q: 'What should I use as my project name?', a: "Use a working name for your project — something descriptive that helps us and your team refer to it. You can refine the final name before launch." },
    { q: 'What if I do not have a company yet?', a: "No problem. Use your personal name or your intended business name. Many clients start before formally registering." },
    { q: 'Which project type should I select?', a: "Choose the type that best describes the primary platform you want to build. If unsure, select the closest option — you can clarify during owner review." },
    { q: 'Why do you need my industry?', a: "Your industry helps us recommend the right templates, features, and team. Different industries have different compliance requirements, UX patterns, and content needs." },
    { q: 'Can I update my contact information later?', a: "Yes. Once the intake is under review, contact your dedicated M-THRYVE representative to make any updates." },
  ],
  'company-assets': [
    { q: 'What are company assets?', a: "Company assets include your logo, brand guide, company profile, product images, website copy, and other materials that represent your business identity." },
    { q: 'Which files do I need?', a: "At minimum: your logo (PNG or vector), a company description, and contact information. The more assets you provide, the more complete your initial build will be." },
    { q: 'What if I do not have a logo?', a: "We can help. Our team offers logo creation, brand identity packages, and copywriting services to help you get started." },
    { q: 'Can M-THRYVE create my company deck?', a: "Yes. Company Profile / Deck creation is one of our available asset services. You can add it during this step." },
    { q: 'Why is Drag & Drop unavailable without assets?', a: "The Drag & Drop tier requires your prepared brand files and content to build correctly. Without them, we recommend Custom Made or Enterprise, which include asset support." },
  ],
  'build-approach': [
    { q: 'What is Drag & Drop?', a: "The Drag & Drop tier uses a pre-built M-THRYVE template with your content and brand assets replacing the placeholder material. The structure stays fixed — ideal for fast, affordable launches." },
    { q: 'What is Custom Made?', a: "Custom Made starts with a template but allows limited approved changes to content, branding, colors, and selected components while preserving the core structure." },
    { q: 'What is Enterprise?', a: "Enterprise is a fully custom product built from scratch around your vision, workflows, users, and integrations. It requires a detailed owner review before pricing and timeline are confirmed." },
    { q: 'Which tier is right for me?', a: "If speed and budget are priorities and you have prepared assets — Drag & Drop. If you need brand adjustments — Custom Made. If you need a unique, scalable product — Enterprise." },
    { q: 'Can I change tiers later?', a: "You can change your tier during this intake. After submission, tier changes may affect your project scope and require a new owner review." },
  ],
  'template-select': [
    { q: 'Can I customize this template?', a: "In Drag & Drop, the layout and structure stay fixed — only your content and brand assets are replaced. In Custom Made, limited structural changes are allowed." },
    { q: 'Why are some options unavailable?', a: "Some features and formats are restricted by tier. Upgrade to Custom Made or Enterprise if you need options outside the current tier's scope." },
    { q: 'Are colors free?', a: "Yes. All color styles are included at no additional cost. Changing your color selection will never affect your project price or delivery time." },
    { q: 'What is included in the template price?', a: "The template price includes the selected platform (Website, Mobile App, or both), your chosen color style, and all page content areas." },
    { q: 'What is the difference between Website and Mobile App?', a: "Website delivers a responsive web experience. Mobile App delivers a native iOS/Android application. Website + Mobile App delivers both." },
  ],
  'pages-features': [
    { q: 'What counts as a required feature?', a: "Required features are the ones your product cannot launch without. Nice to Have features are improvements you can defer to a later phase." },
    { q: 'What does Future Phase mean?', a: "Future Phase means the feature is on your roadmap but not needed at launch. Our team will note it for a later build cycle." },
    { q: 'What if I need help deciding?', a: "Mark the feature as 'Need Help Deciding' and our team will discuss the options with you during owner review." },
    { q: 'Can I request a feature outside my tier?', a: "You can request any feature. If it exceeds your tier's scope, we will flag it and recommend an appropriate upgrade." },
    { q: 'How do integrations affect pricing?', a: "Integrations may add to your project timeline and preliminary price. Third-party API subscriptions are separate from your build cost." },
  ],
  'design': [
    { q: 'Do colors cost extra?', a: "No. All color styles are free. Selecting a different color style will not change your project price or delivery schedule." },
    { q: 'Can I preview mobile and desktop?', a: "Yes. Use the device toggle on the template page to switch between desktop and mobile preview." },
    { q: 'Can I change the design later?', a: "Minor design adjustments during the build are possible. Significant changes after owner approval may require a scope revision." },
    { q: 'What files should I upload?', a: "Inspiration screenshots, Figma files, competitor URLs, or any reference that captures the look and feel you're going for." },
  ],
  'review': [
    { q: 'Is this the final quotation?', a: "No. This is a preliminary receipt subject to M-THRYVE owner review and final approval. Final pricing will be confirmed in your approved agreement." },
    { q: 'Can I edit my answers?', a: "Yes. Use the Edit links next to each section to return and make changes before submitting." },
    { q: 'Why is a price still pending?', a: "Enterprise projects require detailed review before a final price is confirmed. Preliminary prices are estimates only." },
    { q: 'What happens before payment?', a: "After submission, the owner reviews your intake. Final scope, pricing, and payment terms are confirmed in a separate approved agreement before billing begins." },
  ],
  'payment': [
    { q: 'Which payment plan should I choose?', a: "One-Time is simplest and includes free maintenance for the first three months. Monthly and Annual plans include mandatory ongoing maintenance. Choose based on your preferred billing structure." },
    { q: 'What does maintenance cover?', a: "Standard maintenance includes routine updates, security patches, monitoring, backups, basic support, and compatibility adjustments. It does not include major new features or redesigns." },
    { q: 'How does the voucher discount work?', a: "Enter a valid referral voucher code and click Apply. If verified, the configured discount will appear on your receipt." },
    { q: 'When will my first payment happen?', a: "Billing begins only after the owner approves your project and a final agreement is signed. Your submission today does not trigger an immediate charge." },
    { q: 'Is the payment amount final?', a: "No. All payment amounts shown here are preliminary and subject to owner review and final approval." },
  ],
  'final-confirm': [
    { q: 'What am I confirming?', a: "You are confirming that your project information is accurate, you have reviewed the preliminary receipt, and you understand that submission does not start the build or trigger a payment." },
    { q: 'Will submission start the build?', a: "No. Submission creates your preliminary Build Card and sends it to the owner for review. Development only begins after owner approval and a final signed agreement." },
    { q: 'When is the final price confirmed?', a: "Final pricing is confirmed by the owner after intake review. You will receive a formal agreement with the confirmed price before any billing begins." },
    { q: 'When do I receive my Build Reference Number?', a: "Your Build Reference Number is generated immediately after your intake is successfully submitted. It will appear on your submitted Build Card." },
  ],
  'build-card': [
    { q: 'What does Waiting for Owner Review mean?', a: "Your intake has been successfully submitted and your Build Card is in the M-THRYVE owner's review queue. The owner will evaluate your project and reach out within 24 hours." },
    { q: 'Where is my Build Reference Number?', a: "Your Build Reference Number is displayed at the top of your submitted Build Card. Copy it — you'll use it in all future communications with M-THRYVE." },
    { q: 'How does my referral voucher work?', a: "Share your unique referral code with someone who wants to build with M-THRYVE. When an eligible referral completes the required conditions, you may earn a configured discount." },
    { q: 'When does development begin?', a: "Development begins only after the owner approves your project in the Factory Console and a final agreement is signed." },
    { q: 'How will I receive updates?', a: "M-THRYVE will contact you at the email address you provided. Keep an eye on your inbox for your project review update within 24 hours." },
  ],
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputStyle: CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: '#0D1620', border: '1px solid #2A3441',
  borderRadius: '8px', color: '#E2E8F0', fontSize: '14px',
  fontFamily: "'Inter', system-ui, sans-serif", transition: 'border-color 0.15s', outline: 'none',
}

const labelStyle: CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: '#5A7A91', marginBottom: '8px', letterSpacing: '0.02em',
}

const cardStyle: CSSProperties = {
  padding: '20px', background: '#111827',
  border: '1px solid #2A3441', borderRadius: '12px',
}

const monoLabel: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
  letterSpacing: '0.1em', color: '#4B6278', textTransform: 'uppercase' as const, marginBottom: '12px',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepHeader({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ ...monoLabel, color: '#39D6C7', fontSize: '11px', marginBottom: '12px' }}>{tag}</div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.025em', color: '#F0F6FF', margin: '0 0 10px' }}>{title}</h2>
      <p style={{ fontSize: '15px', color: '#4B6278', lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: '12px', color: '#3D5468', marginTop: '6px', lineHeight: 1.5 }}>{hint}</div>}
    </div>
  )
}

function ReviewBlock({ title, children, onEdit }: { title: string; children: ReactNode; onEdit?: () => void }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={monoLabel}>{title}</div>
        {onEdit && <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39D6C7', fontSize: '12px', fontFamily: "'Inter', system-ui, sans-serif", padding: 0 }}>Edit</button>}
      </div>
      {children}
    </div>
  )
}

function ReviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', fontSize: '13px' }}>
      <span style={{ color: '#4B6278' }}>{label}</span>
      <span style={{ color: bold ? '#F0F6FF' : '#E2E8F0', fontWeight: bold ? 700 : 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

// Robot Concierge SVG
function RobotIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="20" fill="#0D2035"/>
      <rect x="13" y="22" width="14" height="11" rx="3" fill="#1A3A55" stroke="#39D6C7" strokeWidth="0.8"/>
      <rect x="18" y="19" width="4" height="4" rx="1" fill="#1A3A55"/>
      <rect x="11" y="9" width="18" height="13" rx="4" fill="#1A3A55" stroke="#39D6C7" strokeWidth="0.8"/>
      <circle cx="16" cy="15" r="2.2" fill="#39D6C7" opacity="0.9"/>
      <circle cx="24" cy="15" r="2.2" fill="#39D6C7" opacity="0.9"/>
      <circle cx="17" cy="14.2" r="0.7" fill="white" opacity="0.6"/>
      <circle cx="25" cy="14.2" r="0.7" fill="white" opacity="0.6"/>
      <line x1="20" y1="9" x2="20" y2="5" stroke="#39D6C7" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="20" cy="4" r="1.5" fill="#39D6C7"/>
      <path d="M16.5 18 Q20 20 23.5 18" stroke="#39D6C7" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <circle cx="17" cy="26" r="1.5" fill="#39D6C7" opacity="0.6"/>
      <circle cx="20" cy="26" r="1.5" fill="#39D6C7" opacity="0.3"/>
      <circle cx="23" cy="26" r="1.5" fill="#39D6C7" opacity="0.6"/>
      <rect x="7" y="22" width="5" height="8" rx="2.5" fill="#1A3A55" stroke="#39D6C7" strokeWidth="0.7"/>
      <rect x="28" y="22" width="5" height="8" rx="2.5" fill="#1A3A55" stroke="#39D6C7" strokeWidth="0.7"/>
    </svg>
  )
}

const TIER_LABELS: Record<string, string> = {
  template: 'Drag & Drop (legacy)',
  custom: 'Custom Build',
  enterprise: 'Enterprise Level',
}

// ── v2.0 Company Assets step ───────────────────────────────────────────────

const READINESS_ORDER: AssetReadiness[] = [
  'available',
  'missing',
  'provide_later',
  'not_applicable',
  'm_thryve_add_on',
]

const READINESS_COLOR: Record<AssetReadiness, string> = {
  available: '#39D6C7',
  missing: '#EF4444',
  provide_later: '#F59E0B',
  not_applicable: '#4B6278',
  m_thryve_add_on: '#B79CF9',
}

function ReadinessPills({
  reqKey,
  ctx,
  value,
  onChange,
}: {
  reqKey: string
  ctx: RequirementContext
  value: AssetReadiness | undefined
  onChange: (next: AssetReadiness) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {READINESS_ORDER.map(s => {
        const disabled = s === 'not_applicable' && !isNotApplicableAllowed(reqKey, ctx)
        const selected = value === s
        return (
          <button
            key={s}
            onClick={() => !disabled && onChange(s)}
            disabled={disabled}
            title={disabled ? '"Not applicable" is not valid for this resource' : undefined}
            style={{
              padding: '3px 9px',
              borderRadius: '100px',
              border: `1px solid ${selected ? READINESS_COLOR[s] : '#2A3441'}`,
              background: selected ? `${READINESS_COLOR[s]}18` : disabled ? '#0B0F14' : 'transparent',
              color: selected ? READINESS_COLOR[s] : disabled ? '#2A3441' : '#4B6278',
              fontSize: '10px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              whiteSpace: 'nowrap',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            {READINESS_LABEL[s]}
          </button>
        )
      })}
    </div>
  )
}

function ResourceRow({
  req,
  ctx,
  status,
  note,
  addOnCost,
  onStatus,
  onNote,
  onAddOnCost,
  fieldId,
  touchField,
  warning,
}: {
  req: ResourceRequirement
  ctx: RequirementContext
  status: AssetReadiness | undefined
  note: string
  addOnCost: number | undefined
  onStatus: (v: AssetReadiness) => void
  onNote: (v: string) => void
  onAddOnCost: (v: number | undefined) => void
  fieldId: string
  touchField: (id: string) => void
  warning: string | null
}) {
  const borderColor = status ? READINESS_COLOR[status] + '55' : '#2A3441'
  const rowBorder = warning ? '#F59E0B' : borderColor
  const showNote =
    status === 'missing' ||
    status === 'provide_later' ||
    status === 'm_thryve_add_on' ||
    status === 'not_applicable'
  return (
    <div id={fieldId} aria-describedby={`${fieldId}-warning`} onBlur={() => touchField(fieldId)} style={{ padding: '12px 14px', background: '#111827', border: `1px solid ${rowBorder}`, borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#D4E4F0' }}>{req.label}</span>
            {req.severity === 'required' && (
              <span style={{ fontSize: '9px', color: '#EF4444', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>REQUIRED</span>
            )}
          </div>
          {req.description && (
            <div style={{ fontSize: '11px', color: '#3D5468', marginTop: '2px', lineHeight: 1.5 }}>{req.description}</div>
          )}
        </div>
        <ReadinessPills reqKey={req.key} ctx={ctx} value={status} onChange={onStatus} />
      </div>

      {status === 'm_thryve_add_on' && (
        <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(183,156,249,0.08)', border: '1px solid rgba(183,156,249,0.25)', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#B79CF9', lineHeight: 1.55, marginBottom: '8px' }}>“{ADD_ON_SPIEL}”</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#4B6278', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>Preliminary cost ₱</span>
            <input
              type="number"
              value={addOnCost ?? req.preliminaryAddOnCost ?? ''}
              onChange={e => onAddOnCost(e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="TBD"
              style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', maxWidth: '140px', background: '#0D1620' }}
            />
            <span style={{ fontSize: '10px', color: '#3D5468' }}>Preliminary · subject to owner review</span>
          </div>
        </div>
      )}

      {showNote && (
        <div style={{ marginTop: '10px' }}>
          <input
            value={note}
            onChange={e => onNote(e.target.value)}
            placeholder={
              status === 'provide_later'
                ? 'Follow-up owner / expected date…'
                : status === 'not_applicable'
                  ? 'Why is this not applicable?'
                  : status === 'm_thryve_add_on'
                    ? 'Scope of the add-on request…'
                    : 'Operator note (why missing, next action)…'
            }
            style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', background: '#0D1620' }}
          />
        </div>
      )}

      <InlineWarning fieldId={fieldId} message={warning} />
    </div>
  )
}

function CompanyAssetsStep({
  form,
  setForm,
  getWarning,
  touchField,
  assetBinding,
  ensureAssetBinding,
}: {
  form: FormData
  setForm: (updater: (prev: FormData) => FormData) => void
  getWarning: (fieldId: string) => string | null
  touchField: (fieldId: string) => void
  assetBinding?: AssetBinding
  ensureAssetBinding: () => Promise<AssetBinding>
}) {
  const ctx: RequirementContext = {
    buildPath: form.tier === 'enterprise' ? 'enterprise' : form.tier ? 'custom' : '',
    projectType: form.projectType,
    templateId: form.templateId,
    features: [...form.features, ...form.customFeatures],
  }

  const required = getRequiredResources(ctx)
  const optional = getOptionalResources(ctx)
  const deckSections = getCompanyDeckSections(ctx)

  const setResourceStatus = (key: string, next: AssetReadiness) =>
    setForm(prev => ({ ...prev, resourceStatuses: { ...prev.resourceStatuses, [key]: next } }))
  const setResourceNote = (key: string, next: string) =>
    setForm(prev => ({ ...prev, resourceNotes: { ...prev.resourceNotes, [key]: next } }))
  const setAddOnCost = (key: string, next: number | undefined) =>
    setForm(prev => {
      const nextMap = { ...prev.resourceAddOnCosts }
      if (next === undefined) delete nextMap[key]
      else nextMap[key] = next
      return { ...prev, resourceAddOnCosts: nextMap }
    })
  const setDeckStatus = (key: string, next: AssetReadiness) =>
    setForm(prev => ({
      ...prev,
      deckSectionStatuses: { ...prev.deckSectionStatuses, [key]: next },
    }))
  const setDeckNote = (key: string, next: string) =>
    setForm(prev => ({
      ...prev,
      deckSectionNotes: { ...prev.deckSectionNotes, [key]: next },
    }))
  const setDeckExists = (v: string) =>
    setForm(prev => ({
      ...prev,
      deckExists: v,
      // The active v3 discovery step supersedes the legacy qualification
      // cards, but the canonical API still requires this summary value.
      assetQualification: v === 'yes' ? 'provided' : 'incomplete',
    }))

  return (
    <div>
      <StepHeader
        tag="Step 3 — Company Assets & Resources"
        title="What's ready, what's missing?"
        desc={`Requirements below are derived from the ${ctx.buildPath === 'enterprise' ? 'Enterprise Level' : 'Custom Build'} path${ctx.projectType ? ` and a ${ctx.projectType} project` : ''}. Missing items don't block a draft — they're recorded as follow-ups or M-THRYVE add-ons.`}
      />
      <OperatorSpiel text={SPIELS.missingResource} tone="warning" />

      {/* ── Company deck existence ──────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...monoLabel, color: '#39D6C7', marginBottom: '10px' }}>Company Deck</div>
        <div style={{ fontSize: '13px', color: '#C4D8EA', marginBottom: '10px', lineHeight: 1.55 }}>
          Does the client have a company deck we can reference?
        </div>
        <div id="field-deckExists" aria-describedby="field-deckExists-warning" onBlur={() => touchField('field-deckExists')} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', ...(getWarning('field-deckExists') ? { outline: '1px solid rgba(245,158,11,0.45)', borderRadius: '10px' } : {}) }}>
          {[
            { id: 'yes', label: 'Yes — full deck available', desc: 'We\'ll review section coverage below. Every section must be confirmed before submission.' },
            { id: 'partial', label: 'Partial — some sections available', desc: 'Mark each section\'s status below. Unconfirmed sections become follow-ups.' },
          ].map(opt => {
            const sel = form.deckExists === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => { setDeckExists(opt.id); touchField('field-deckExists') }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`,
                  background: sel ? 'rgba(57,214,199,0.06)' : '#111827',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: sel ? '#F0F6FF' : '#C4D8EA', marginBottom: '3px' }}>{opt.label}</div>
                <div style={{ fontSize: '12px', color: '#4B6278', lineHeight: 1.5 }}>{opt.desc}</div>
              </button>
            )
          })}
        </div>
        <InlineWarning fieldId="field-deckExists" message={getWarning('field-deckExists')} />

        {(form.deckExists === 'yes' || form.deckExists === 'partial') && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ ...monoLabel, marginBottom: '8px' }}>
              Deck Sections · required vs optional
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {deckSections.map(sec => {
                const sectionFieldId = `field-deckSection-${sec.key}`
                return (
                  <ResourceRow
                    key={sec.key}
                    req={{ key: sec.key, label: sec.label, category: 'company_deck', severity: sec.severity, description: sec.description }}
                    ctx={ctx}
                    status={form.deckSectionStatuses[sec.key]}
                    note={form.deckSectionNotes[sec.key] ?? ''}
                    addOnCost={undefined}
                    onStatus={next => { setDeckStatus(sec.key, next); touchField(sectionFieldId) }}
                    onNote={next => { setDeckNote(sec.key, next); touchField(sectionFieldId) }}
                    onAddOnCost={() => {}}
                    fieldId={sectionFieldId}
                    touchField={touchField}
                    warning={getWarning(sectionFieldId)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Required resources ──────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...monoLabel, color: '#EF4444', marginBottom: '10px' }}>Required Resources · {required.length}</div>
        <div style={{ fontSize: '12px', color: '#4B6278', marginBottom: '10px', lineHeight: 1.55 }}>
          These resources are needed to complete the build accurately for this path and project type.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {required.map(r => {
            const resourceFieldId = `field-resource-${r.key}`
            return (
              <ResourceRow
                key={r.key}
                req={r}
                ctx={ctx}
                status={form.resourceStatuses[r.key]}
                note={form.resourceNotes[r.key] ?? ''}
                addOnCost={form.resourceAddOnCosts[r.key]}
                onStatus={next => { setResourceStatus(r.key, next); touchField(resourceFieldId) }}
                onNote={next => { setResourceNote(r.key, next); touchField(resourceFieldId) }}
                onAddOnCost={next => { setAddOnCost(r.key, next); touchField(resourceFieldId) }}
                fieldId={resourceFieldId}
                touchField={touchField}
                warning={getWarning(resourceFieldId)}
              />
            )
          })}
        </div>
      </div>

      {/* ── Optional resources ──────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...monoLabel, color: '#F59E0B', marginBottom: '10px' }}>Optional / Improvement Resources · {optional.length}</div>
        <div style={{ fontSize: '12px', color: '#4B6278', marginBottom: '10px', lineHeight: 1.55 }}>
          Nice-to-have items. Missing entries here do not block submission but improve the resulting build.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {optional.map(r => {
            const resourceFieldId = `field-resource-${r.key}`
            return (
              <ResourceRow
                key={r.key}
                req={r}
                ctx={ctx}
                status={form.resourceStatuses[r.key]}
                note={form.resourceNotes[r.key] ?? ''}
                addOnCost={form.resourceAddOnCosts[r.key]}
                onStatus={next => { setResourceStatus(r.key, next); touchField(resourceFieldId) }}
                onNote={next => { setResourceNote(r.key, next); touchField(resourceFieldId) }}
                onAddOnCost={next => { setAddOnCost(r.key, next); touchField(resourceFieldId) }}
                fieldId={resourceFieldId}
                touchField={touchField}
                warning={getWarning(resourceFieldId)}
              />
            )
          })}
        </div>
      </div>

      <AssetUploader
        assets={form.uploadedAssets}
        binding={assetBinding}
        ensureBinding={ensureAssetBinding}
        onAssetsChange={(uploadedAssets: UploadedAssetRef[]) => setForm(prev => ({ ...prev, uploadedAssets }))}
        label="Company assets"
        hint="Upload brand, deck, content, and reference files. The first file automatically saves this intake as a draft."
      />

      <div style={{ padding: '10px 14px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '8px', fontSize: '11px', color: '#3D5468', lineHeight: 1.6 }}>
        Files upload directly to secure storage and are scanned separately. Intake JSON stores metadata references only. Do not upload credentials, secrets, or private keys.
      </div>
    </div>
  )
}

// ── v2.0 Review — resource bucket summary ──────────────────────────────────

function ResourceReviewBlock({ form, onEdit }: { form: FormData; onEdit: () => void }) {
  const ctx: RequirementContext = {
    buildPath: form.tier === 'enterprise' ? 'enterprise' : form.tier ? 'custom' : '',
    projectType: form.projectType,
    templateId: form.templateId,
    features: [...form.features, ...form.customFeatures],
  }
  const required = getRequiredResources(ctx)
  const optional = getOptionalResources(ctx)
  const allResources = [...required, ...optional]

  type Bucket = { key: string; label: string; status: AssetReadiness | undefined; severity: string; category: string }
  const buckets: Record<string, Bucket[]> = {
    available: [],
    missing: [],
    provide_later: [],
    m_thryve_add_on: [],
    not_applicable: [],
    unset: [],
  }
  for (const r of allResources) {
    const s = form.resourceStatuses[r.key]
    const b: Bucket = { key: r.key, label: r.label, status: s, severity: r.severity, category: r.category }
    buckets[s ?? 'unset'].push(b)
  }

  const deckSections = getCompanyDeckSections(ctx)
  const deckSummary: Record<string, string[]> = {
    available: [],
    missing: [],
    provide_later: [],
    m_thryve_add_on: [],
    not_applicable: [],
    unset: [],
  }
  if (form.deckExists === 'yes' || form.deckExists === 'partial') {
    for (const s of deckSections) {
      const st = form.deckSectionStatuses[s.key] ?? 'unset'
      deckSummary[st].push(s.label)
    }
  }

  const bucketMeta = [
    { key: 'available', label: 'Available', color: '#39D6C7' },
    { key: 'missing', label: 'Missing', color: '#EF4444' },
    { key: 'provide_later', label: 'Provide later (follow-up)', color: '#F59E0B' },
    { key: 'm_thryve_add_on', label: 'M-THRYVE add-on requested', color: '#B79CF9' },
    { key: 'not_applicable', label: 'Not applicable', color: '#4B6278' },
    { key: 'unset', label: 'Not yet reviewed', color: '#4B6278' },
  ] as const

  const deckLabel: Record<string, string> = {
    yes: 'Full deck available',
    partial: 'Partial deck available',
    '': 'Not confirmed',
  }

  return (
    <div style={{ padding: '20px', background: '#111827', border: '1px solid #2A3441', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ ...monoLabel, margin: 0 }}>Assets & Resources</div>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39D6C7', fontSize: '12px', fontFamily: "'Inter', system-ui, sans-serif", padding: 0 }}>Edit</button>
      </div>

      <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#4B6278', letterSpacing: '0.06em' }}>COMPANY DECK</span>
          <span style={{ fontSize: '13px', color: '#D4E4F0' }}>{deckLabel[form.deckExists] || 'Not confirmed'}</span>
        </div>
        {(form.deckExists === 'yes' || form.deckExists === 'partial') && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#3D5468', lineHeight: 1.55 }}>
            {deckSummary.available.length > 0 && <div><strong style={{ color: '#39D6C7' }}>Available:</strong> {deckSummary.available.join(', ')}</div>}
            {deckSummary.missing.length > 0 && <div><strong style={{ color: '#EF4444' }}>Missing:</strong> {deckSummary.missing.join(', ')}</div>}
            {deckSummary.provide_later.length > 0 && <div><strong style={{ color: '#F59E0B' }}>Provide later:</strong> {deckSummary.provide_later.join(', ')}</div>}
            {deckSummary.m_thryve_add_on.length > 0 && <div><strong style={{ color: '#B79CF9' }}>Add-on:</strong> {deckSummary.m_thryve_add_on.join(', ')}</div>}
            {deckSummary.not_applicable.length > 0 && <div><strong style={{ color: '#4B6278' }}>N/A:</strong> {deckSummary.not_applicable.join(', ')}</div>}
            {deckSummary.unset.length > 0 && <div><strong style={{ color: '#4B6278' }}>Not yet reviewed:</strong> {deckSummary.unset.join(', ')}</div>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {bucketMeta.map(({ key, label, color }) => {
          const items = buckets[key]
          if (!items || items.length === 0) return null
          return (
            <div key={key} style={{ padding: '10px 12px', background: '#0D1620', border: `1px solid ${color}40`, borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color, letterSpacing: '0.06em' }}>{label.toUpperCase()}</span>
                <span style={{ fontSize: '11px', color: '#4B6278' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {items.map(item => (
                  <span
                    key={item.key}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '100px',
                      background: item.severity === 'required' ? `${color}12` : 'transparent',
                      border: `1px solid ${color}30`,
                      fontSize: '11px',
                      color: '#C4D8EA',
                    }}
                  >
                    {item.label}
                    {item.severity === 'required' && (
                      <span style={{ marginLeft: '4px', fontSize: '9px', color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>REQ</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Operator-facing discovery-call spiels ──────────────────────────────────

const SPIELS = {
  clientDetails:
    "I'll start by confirming the project and contact details so the notes and follow-ups are connected to the right company and opportunity.",
  customBuild:
    "Custom Build starts from an existing template, which lets us move faster. We can add features that are already supported for this template. Anything outside the listed options will need to be reviewed separately.",
  enterprise:
    "Enterprise Level is for a from-scratch product or a solution that needs a wider range of features. We'll document the product experience, design direction, and technical requirements before final scope is confirmed.",
  missingResource:
    "This resource is needed to complete the build accurately. We can continue documenting the project today and save this as a draft. M-THRYVE can also prepare it as an add-on, subject to owner confirmation.",
  followUp:
    "If you do not have that information today, I can mark it for follow-up and save the intake as a draft.",
} as const

const DISCARD_REASON_OPTIONS: Array<{ code: DiscardReasonCode; label: string }> = [
  { code: 'not_proceeding', label: 'Client is not proceeding' },
  { code: 'out_of_scope', label: 'Out of scope for M-THRYVE' },
  { code: 'budget', label: 'Budget mismatch' },
  { code: 'timing', label: 'Timing / not the right time' },
  { code: 'duplicate', label: 'Duplicate or superseded intake' },
  { code: 'other', label: 'Other' },
]

function OperatorSpiel({ text, tone = 'default' }: { text: string; tone?: 'default' | 'warning' | 'accent' }) {
  const palette =
    tone === 'warning'
      ? { border: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.06)', accent: '#F59E0B' }
      : tone === 'accent'
        ? { border: 'rgba(139,92,246,0.28)', bg: 'rgba(139,92,246,0.06)', accent: '#B79CF9' }
        : { border: 'rgba(57,214,199,0.22)', bg: 'rgba(57,214,199,0.04)', accent: '#39D6C7' }
  return (
    <div
      style={{
        padding: '14px 16px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: '10px',
        marginBottom: '22px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          letterSpacing: '0.14em',
          color: palette.accent,
          textTransform: 'uppercase',
          padding: '3px 8px',
          borderRadius: '4px',
          border: `1px solid ${palette.border}`,
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        Say to client
      </span>
      <span
        style={{
          fontSize: '13px',
          color: '#C4D8EA',
          lineHeight: 1.65,
          fontStyle: 'italic',
        }}
      >
        “{text}”
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')) {
    return <ClientPortal />
  }

  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [customInput, setCustomInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [buildRef, setBuildRef] = useState('')
  const [clientVoucher, setClientVoucher] = useState('')
  const [savedIntakeId, setSavedIntakeId] = useState('')
  const [savedClientId, setSavedClientId] = useState('')
  const [savedReferenceNumber, setSavedReferenceNumber] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const lifecycleKeys = useRef<Record<'draft' | 'submit' | 'discard', string>>({
    draft: '',
    submit: '',
    discard: '',
  })
  const [showTierWarning, setShowTierWarning] = useState(false)
  const [pendingTier, setPendingTier] = useState<Tier>('')
  const [extensionCategoryFilter, setExtensionCategoryFilter] = useState<string>('all')
  const [templateCatFilter, setTemplateCatFilter] = useState('All')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [pageContents, setPageContents] = useState<Record<string, Record<string, string>>>({})
  const [previewVersion, setPreviewVersion] = useState<'desktop' | 'mobile'>('desktop')
  const [copiedRef, setCopiedRef] = useState(false)
  const [copiedVoucher, setCopiedVoucher] = useState(false)
  const [conciergeOpen, setConciergeOpen] = useState(false)
  const [conciergeQ, setConciergeQ] = useState<string | null>(null)
  const [voucherChecking, setVoucherChecking] = useState(false)

  // ── REV-03: industry template filter state (ephemeral, UI-only) ─────────
  const [templateFilterOverride, setTemplateFilterOverride] = useState(false)

  // ── REV-01: inline validation tracker (ephemeral, UI-only) ──────────────
  const [validationState, setValidationState] = useState<ValidationState>({})

  // ── Phase 2 outcome / discard state ─────────────────────────────────────
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [discardReasonCode, setDiscardReasonCode] = useState<DiscardReasonCode>('not_proceeding')
  const [discardNote, setDiscardNote] = useState('')
  const [outcomeFinalized, setOutcomeFinalized] = useState<IntakeOutcome | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [resumeState, setResumeState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [resumeError, setResumeError] = useState('')
  const [resumeAttempt, setResumeAttempt] = useState(0)
  const [resumeEditingStep, setResumeEditingStep] = useState<StepId>('review')
  const lastEditedStep = useRef<StepId>('client-details')
  const assetBindingPromise = useRef<Promise<AssetBinding> | null>(null)

  const getLifecycleKey = (operation: 'draft' | 'submit' | 'discard') => {
    const existing = lifecycleKeys.current[operation]
    if (existing) return existing
    const next = generateIdempotencyKey()
    lifecycleKeys.current[operation] = next
    return next
  }

  const flow = getFlow(form.tier, form.projectType)
  const currentStep: StepId = (flow[stepIndex] ?? 'intro') as StepId
  const progressTotal = flow.length - 2
  const progressPct = (currentStep === 'intro' || currentStep === 'build-card') ? 0 : Math.min((stepIndex / progressTotal) * 100, 100)

  const set = (field: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (!['intro', 'draft-saved', 'build-card', 'outcome'].includes(currentStep)) {
      lastEditedStep.current = currentStep
    }
  }, [currentStep])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const pathMatch = window.location.pathname.match(/^\/resume\/([0-9a-f-]{36})$/i)
    const intakeId = params.get('resume') || params.get('intakeId') || pathMatch?.[1]
    if (!intakeId) return

    let cancelled = false
    setResumeState('loading')
    setResumeError('')
    void getIntakeDraft(intakeId).then(response => {
      if (cancelled) return
      const record = response.intake
      if (!response.success || !record) {
        setResumeState('error')
        setResumeError(response.error || 'The intake could not be reopened. Your current form was not changed.')
        return
      }
      if (!record.intakeId || !record.clientId || !record.referenceNumber) {
        setResumeState('error')
        setResumeError('The intake was returned without stable identifiers. Your current form was not changed.')
        return
      }
      if (record.outcome === 'submitted' && !record.hasBuildCard) {
        setResumeState('error')
        setResumeError('The submitted intake has no Build Card. Your current form was not changed; contact an administrator.')
        return
      }

      const restored = rehydrateDraftState(record)
      const nextForm = { ...EMPTY_FORM, ...restored.form }
      const restoredFlow = getFlow(nextForm.tier, nextForm.projectType)
      const requestedStep = restored.lastEditedStep && restoredFlow.includes(restored.lastEditedStep)
        ? restored.lastEditedStep
        : 'review'

      setForm(nextForm)
      setPageContents(restored.pageContents)
      setSavedIntakeId(record.intakeId)
      setSavedClientId(record.clientId)
      setClientVoucher(record.clientId)
      setSavedReferenceNumber(record.referenceNumber)
      setBuildRef(record.referenceNumber)
      setResumeEditingStep(requestedStep)
      lastEditedStep.current = requestedStep
      setOutcomeFinalized(record.outcome)
      setSubmitted(record.outcome === 'submitted')
      if (record.outcome === 'draft') {
        setStepIndex(Math.max(0, restoredFlow.indexOf('draft-saved')))
      } else if (record.outcome === 'submitted') {
        setStepIndex(Math.max(0, restoredFlow.indexOf('build-card')))
      } else {
        setStepIndex(Math.max(0, restoredFlow.indexOf('outcome')))
      }
      setResumeState('ready')
    })

    return () => { cancelled = true }
  }, [resumeAttempt])

  const toggleArr = (field: 'features', val: string) =>
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(val)
        ? (prev[field] as string[]).filter(v => v !== val)
        : [...(prev[field] as string[]), val],
    }))

  const setQField = (key: string, value: string | string[]) =>
    setForm(prev => ({
      ...prev,
      websiteQuestionnaire: { ...(prev.websiteQuestionnaire ?? {}), [key]: value } as WebsiteQuestionnaire,
    }))

  const toggleQMulti = (key: string, val: string) => {
    const current = (form.websiteQuestionnaire?.[key as keyof WebsiteQuestionnaire] ?? []) as string[]
    setQField(key, current.includes(val) ? current.filter(v => v !== val) : [...current, val])
  }

  const handleProjectTypeChange = (newType: string) => {
    setForm(prev => {
      const updates: Partial<FormData> = { projectType: newType }
      if (prev.projectType === 'templated-website' && newType !== 'templated-website') {
        updates.templateId = ''
        updates.templateCategory = ''
        updates.projectVersion = ''
        updates.colorPreset = ''
      }
      if (prev.projectType === 'ai-assisted-website' && newType !== 'ai-assisted-website') {
        updates.websiteQuestionnaire = undefined
      }
      return { ...prev, ...updates }
    })
  }

  const setPageField = (page: string, fieldId: string, val: string) =>
    setPageContents(prev => ({ ...prev, [page]: { ...(prev[page] ?? {}), [fieldId]: val } }))
  const getPageField = (page: string, fieldId: string) => pageContents[page]?.[fieldId] ?? ''
  const assetsBlocked = (form.assetQualification === 'incomplete' || form.assetQualification === 'no-assets')

  const hasTierData = () => !!(form.templateId || form.projectVision || form.features.length > 0)

  const handleTierSelect = (newTier: Tier) => {
    if (form.tier && form.tier !== newTier && hasTierData()) {
      setPendingTier(newTier); setShowTierWarning(true)
    } else {
      set('tier', newTier)
    }
  }

  const confirmTierChange = () => {
    const t = pendingTier
    const validTypes = getProjectTypes(t).map(pt => pt.id)
    const currentType = form.projectType
    const typeCleared = currentType && !validTypes.includes(currentType)
    setForm(prev => ({
      ...prev, tier: t,
      // Clear project type if it's not valid for the new tier
      projectType: typeCleared ? '' : prev.projectType,
      templateId: '', templateCategory: '', projectVersion: '', colorPreset: '',
      projectVision: '', features: [], customFeatures: [], designStyles: [], inspirationLink: '',
      targetUsers: '', userRoles: '', businessWorkflows: '', integrations: '',
      existingSystems: '', dataSecurityReqs: '', scalabilityReqs: '',
    }))
    setPageContents({}); setCurrentPageIndex(0)
    setShowTierWarning(false); setPendingTier('')
  }

  const applyVoucher = () => {
    if (!form.voucherCode.trim()) return
    setVoucherChecking(true)
    set('voucherStatus', 'checking')
    setTimeout(() => {
      setVoucherChecking(false)
      const code = form.voucherCode.trim().toUpperCase()
      if (code === 'MTH-DEMO' || code.startsWith('REF-')) {
        set('voucherStatus', 'valid')
      } else {
        set('voucherStatus', 'invalid')
      }
    }, 1200)
  }

  // ── REV-01: inline validation trigger strategy ───────────────────────────
  // Fields appear clean on arrival; warnings appear only after the operator
  // blurs an input (or interacts with a discrete choice control). Warnings
  // are derived live from the current form + touched flags, so corrections
  // clear the warning on the next keystroke.
  useEffect(() => {
    setValidationState({})
  }, [currentStep])

  // REV-03: reset industry filter override when the selected industry changes.
  useEffect(() => {
    setTemplateFilterOverride(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.industry])

  const stepWarnings = getInlineWarnings(currentStep, form)

  const getWarning = (fieldId: string): string | null => {
    if (fieldId.startsWith('field-priority-')) {
      // Feature-priority warnings are gated on the features group being touched.
      if (!validationState['field-features']?.touched) return null
    } else if (!validationState[fieldId]?.touched) {
      return null
    }
    return stepWarnings[fieldId] ?? null
  }

  const touchField = (fieldId: string) =>
    setValidationState(prev => ({ ...prev, [fieldId]: { touched: true, warning: null } }))

  const fieldStyle = (fieldId: string): CSSProperties => ({
    ...inputStyle,
    border: getWarning(fieldId) ? `1px solid #F59E0B` : inputStyle.border,
  })

  const groupWarningStyle = (fieldId: string): CSSProperties =>
    getWarning(fieldId)
      ? { outline: '1px solid rgba(245,158,11,0.45)', borderRadius: '10px' }
      : { outline: 'none' }

  // Snapshot of current gaps used by review, outcome, and draft flows.
  const missingReqSnapshot: MissingRequirement[] = collectMissingRequirements(form)

  const handleNext = async () => {
    // Validate the current step. Outcome step is driven by its own action
    // buttons, so we never advance from it via the primary "Continue" button.
    if (currentStep === 'outcome') return

    const errors = validateStep(currentStep, form)
    if (errors.length > 0) return

    setStepIndex(i => Math.min(i + 1, flow.length - 1))
  }

  const persistDraft = async (navigateToConfirmation: boolean): Promise<AssetBinding | null> => {
    setSubmitting(true)
    setSubmissionError('')
    try {
      const payload = toSubmissionPayload(
        { ...form, missingRequirements: missingReqSnapshot },
        pageContents,
        'draft',
        lastEditedStep.current,
      )
      const response = await saveDraft(payload, getLifecycleKey('draft'), savedIntakeId || undefined)

      const referenceNumber = response.buildReferenceNumber ?? response.referenceNumber
      if (response.success && response.intakeId && response.clientId && referenceNumber) {
        // A completed save gets a fresh key; uncertain/failed requests retain
        // their key so a retry receives the original idempotent result.
        lifecycleKeys.current.draft = generateIdempotencyKey()
        setSavedIntakeId(response.intakeId)
        setClientVoucher(response.clientId)
        setSavedClientId(response.clientId)
        setSavedReferenceNumber(referenceNumber)

        setForm(prev => ({
          ...prev,
          outcome: 'draft',
          missingRequirements: response.missingRequirements ?? missingReqSnapshot,
          intakeId: response.intakeId,
          clientId: response.clientId,
          referenceNumber,
        }))
        setOutcomeFinalized('draft')
        setResumeEditingStep(lastEditedStep.current)
        if (navigateToConfirmation) setStepIndex(flow.indexOf('draft-saved'))
        return {
          intakeId: response.intakeId,
          clientId: response.clientId,
          referenceNumber,
        }
      } else {
        setSubmissionError(response.error || (response.success
          ? 'Draft saved without stable server identifiers. Please retry; no navigation was performed.'
          : 'Draft save failed. Please try again.'))
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
    return null
  }

  const handleSaveDraft = async () => {
    await persistDraft(true)
  }

  const ensureAssetBinding = async (): Promise<AssetBinding> => {
    if (savedIntakeId && savedClientId && savedReferenceNumber) {
      return { intakeId: savedIntakeId, clientId: savedClientId, referenceNumber: savedReferenceNumber }
    }
    if (!isValidEmail(form.email)) {
      throw new Error('Save the draft first — this attaches your files to the intake reference.')
    }
    if (!assetBindingPromise.current) {
      assetBindingPromise.current = persistDraft(false).then(binding => {
        if (!binding) throw new Error('The draft could not be saved, so the file was not uploaded.')
        return binding
      }).finally(() => {
        assetBindingPromise.current = null
      })
    }
    return assetBindingPromise.current
  }

  const assetBinding: AssetBinding | undefined = savedIntakeId && savedClientId && savedReferenceNumber
    ? { intakeId: savedIntakeId, clientId: savedClientId, referenceNumber: savedReferenceNumber }
    : undefined

  const handleSubmitIntake = async () => {
    setSubmitAttempted(true)
    const { ok, missing } = canSubmit(form)
    if (!ok) {
      // Persist the gap set so review/outcome can display it. Stay on
      // outcome so operator can jump to the failing section.
      setForm(prev => ({ ...prev, missingRequirements: missing }))
      return
    }

    setSubmitting(true)
    setSubmissionError('')
    try {
      const payload = toSubmissionPayload(form, pageContents, 'submitted', lastEditedStep.current)
      const response = await submitIntakeForReview(payload, getLifecycleKey('submit'), savedIntakeId || undefined)

      const referenceNumber = response.buildReferenceNumber ?? response.referenceNumber
      if (response.success && response.intakeId && response.clientId && referenceNumber) {
        lifecycleKeys.current.submit = generateIdempotencyKey()
        setBuildRef(referenceNumber)
        if (response.clientId) setClientVoucher(response.clientId)
        setSavedClientId(response.clientId)
        if (response.intakeId) setSavedIntakeId(response.intakeId)
        setSubmitted(true)
        setForm(prev => ({ ...prev, outcome: 'submitted', missingRequirements: [] }))
        setOutcomeFinalized('submitted')
        setStepIndex(flow.indexOf('build-card'))
      } else {
        setSubmissionError(response.error || (response.success
          ? 'Submission returned incomplete server identifiers. Please retry; the current page was preserved.'
          : 'Submission failed. Please try again.'))
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const openDiscardModal = () => {
    setDiscardReasonCode('not_proceeding')
    setDiscardNote('')
    setShowDiscardModal(true)
  }

  const confirmDiscard = async () => {
    const reason = { code: discardReasonCode, note: discardNote.trim() || undefined }
    setSubmitting(true)
    setSubmissionError('')
    try {
      const payload = toSubmissionPayload(form, pageContents, 'discarded', lastEditedStep.current)
      const response = await discardIntake(payload, reason, getLifecycleKey('discard'), savedIntakeId || undefined)

      if (!response.success) {
        setSubmissionError(response.error || 'Discard failed. Please try again.')
        return
      }
      lifecycleKeys.current.discard = generateIdempotencyKey()

      setForm(prev => ({
        ...prev,
        outcome: 'discarded',
        discardReason: reason,
        missingRequirements: missingReqSnapshot,
      }))
      setOutcomeFinalized('discarded')
      setShowDiscardModal(false)
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Discard failed')
      setShowDiscardModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => setStepIndex(i => Math.max(i - 1, 0))

  const goToStep = (s: StepId) => {
    const idx = flow.indexOf(s)
    if (idx >= 0) setStepIndex(idx)
  }

  const resetAll = () => {
    setForm(EMPTY_FORM); setStepIndex(0); setSubmitting(false); setSubmitted(false)
    lifecycleKeys.current = { draft: generateIdempotencyKey(), submit: generateIdempotencyKey(), discard: generateIdempotencyKey() }
    setBuildRef(''); setClientVoucher(''); setSavedIntakeId(''); setSavedClientId(''); setSavedReferenceNumber(''); setPageContents({})
    setCurrentPageIndex(0); setTemplateCatFilter('All')
    setCopiedRef(false); setCopiedVoucher(false)
    setOutcomeFinalized(null); setSubmitAttempted(false)
    setShowDiscardModal(false); setDiscardNote(''); setDiscardReasonCode('not_proceeding')
    setValidationState({})
    setTemplateFilterOverride(false)
    setResumeState('idle'); setResumeError(''); setResumeEditingStep('review')
    lastEditedStep.current = 'client-details'; assetBindingPromise.current = null
    if (typeof window !== 'undefined' && (window.location.search || window.location.pathname.startsWith('/resume/'))) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  const copyToClipboard = (text: string, which: 'ref' | 'voucher') => {
    navigator.clipboard.writeText(text).catch(() => {})
    if (which === 'ref') { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000) }
    else { setCopiedVoucher(true); setTimeout(() => setCopiedVoucher(false), 2000) }
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === form.templateId)
  const pricing = calcPrice(selectedTemplate, form.projectVersion)
  const allFeatures = [...form.features, ...form.customFeatures]
  const complexity = getComplexity(form.selectedExtensions, form.projectType, form.tier)
  const techStack = form.tier !== 'enterprise'
    ? (form.tier === 'custom' ? ['Next.js', 'TypeScript', 'M-THRYVE CMS', 'Vercel'] : ['HTML/CSS', 'M-THRYVE CMS', 'Image CDN', 'Netlify'])
    : getTechStack(form.projectType, form.features)
  const team = getTeam(form.projectType, form.features, form.tier)
  const maintenanceRate = getMaintenanceRate(form.tier)
  const maintenanceAnnual = maintenanceRate * 12

  // ── REV-03: industry-driven template filtering ─────────────────────────
  const industryFilter = filterTemplatesByIndustry(TEMPLATES, form.industry)
  const byCategory = (list: TemplateDefinition[]) =>
    templateCatFilter === 'All' ? list : list.filter(t => t.category === templateCatFilter)

  const filterMapping = getMappingForIndustry(form.industry)
  const industryActive = !!form.industry.trim() && filterMapping.compatibleTags.length > 0
  const hasPrimary = industryFilter.primary.length > 0
  const hasRecommended = industryFilter.recommended.length > 0
  const override = templateFilterOverride

  /** Whether the selected template is a primary match for the current industry. */
  const isPrimaryTemplateMatch = (t: TemplateDefinition): boolean => {
    const m = getMappingForIndustry(form.industry)
    if (m.compatibleTags.length === 0) return true
    return t.tags.some(tag => m.compatibleTags.includes(tag))
  }

  const handleTemplateSelect = (t: TemplateDefinition) => {
    set('templateId', t.id)
    set('templateCategory', t.category)
    setCurrentPageIndex(0)
    touchField('field-templateId')
    touchField('field-projectVersion')

    if (
      form.industry &&
      form.industry !== 'Other' &&
      filterMapping.compatibleTags.length > 0 &&
      !isPrimaryTemplateMatch(t)
    ) {
      const mapping = getMappingForIndustry(form.industry)
      const note: OperatorNote = {
        kind: 'assumption',
        section: 'template-select',
        note: `Template "${t.name}" selected outside the default "${mapping.label}" industry filter. Override was explicit.`,
        createdAt: new Date().toISOString(),
      }
      setForm(prev => ({
        ...prev,
        operatorNotes: [...(prev.operatorNotes ?? []), note],
      }))
    }
  }

  const _filteredAll = byCategory(TEMPLATES)
  const templatePages = selectedTemplate?.pages ?? []
  const currentPageName = templatePages[currentPageIndex] ?? ''
  const pageDef = getPageDef(currentPageName)

  const canContinue = !(
    (currentStep === 'build-approach' && !form.tier) ||
    currentStep === 'outcome' ||
    submitting
  )

  const primaryBtn: CSSProperties = {
    padding: '12px 24px', background: canContinue ? '#39D6C7' : '#1A2E3A',
    border: 'none', borderRadius: '8px', color: canContinue ? '#060C10' : '#2A4455',
    fontWeight: 700, fontSize: '14px', cursor: canContinue ? 'pointer' : 'not-allowed',
    letterSpacing: '-0.01em', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s',
  }

  const ghostBtn: CSSProperties = {
    padding: '12px 20px', background: 'transparent', border: '1px solid #2A3441', borderRadius: '8px',
    color: '#4B6278', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  const versionBtn = (v: string): CSSProperties => ({
    padding: '10px 18px', borderRadius: '8px',
    border: `1px solid ${form.projectVersion === v ? '#39D6C7' : '#2A3441'}`,
    background: form.projectVersion === v ? 'rgba(57,214,199,0.08)' : '#0D1620',
    color: form.projectVersion === v ? '#39D6C7' : '#4B6278',
    fontWeight: form.projectVersion === v ? 600 : 400,
    fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s',
  })

  const faqs = FAQ_DATA[currentStep] ?? FAQ_DATA['intro']
  const conciergeAnswer = conciergeQ ? (faqs.find(f => f.q === conciergeQ)?.a ?? null) : null

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', fontFamily: "'Inter', system-ui, sans-serif", color: '#E2E8F0' }}>

      {/* ── Top bar ── */}
      <div style={{ height: '56px', borderBottom: '1px solid #161F2B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50, background: '#0B0F14' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: '#39D6C7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#060C10', fontWeight: 800, fontSize: '14px' }}>M</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>M-THRYVE</span>
        </div>
        {currentStep !== 'intro' && currentStep !== 'build-card' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ ...monoLabel, margin: 0, fontSize: '11px' }}>Step {stepIndex} of {progressTotal}</div>
            <button
              onClick={openDiscardModal}
              title="Discard intake (available throughout the call)"
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'transparent',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {currentStep !== 'intro' && currentStep !== 'build-card' && (
        <div style={{ height: '2px', background: '#161F2B' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: '#39D6C7', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
      )}

      {/* ── Main content ── */}
      <div data-testid={`wizard-step-${currentStep}`} style={{ maxWidth: currentStep === 'build-card' ? '860px' : '680px', margin: '0 auto', padding: '52px 28px 160px', transition: 'max-width 0.3s' }}>

        {resumeState === 'loading' && (
          <div role="status" aria-live="polite" style={{ ...cardStyle, border: '1px solid rgba(57,214,199,0.25)', marginBottom: '20px', color: '#39D6C7', fontSize: '13px' }}>
            Reopening the saved intakeâ€¦ The current form will change only after the complete draft is loaded.
          </div>
        )}
        {resumeState === 'error' && (
          <div role="alert" style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.35)', marginBottom: '20px' }}>
            <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: '6px' }}>Draft could not be reopened</div>
            <div style={{ color: '#C4D8EA', fontSize: '13px', lineHeight: 1.55 }}>{resumeError}</div>
            <button type="button" onClick={() => setResumeAttempt(value => value + 1)} style={{ marginTop: '10px', padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.35)', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}>
              Retry reopen
            </button>
          </div>
        )}

        {/* ══ INTRO ══ */}
        {currentStep === 'intro' && (
          <div>
            <div style={{ marginBottom: '48px' }}>
              <div style={{ ...monoLabel, color: '#39D6C7', fontSize: '11px', marginBottom: '20px' }}>Private intake authorized by M-THRYVE</div>
              <h1 style={{ fontSize: '46px', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.035em', color: '#F0F6FF', margin: '0 0 20px' }}>
                {"Let's Build Your"}<br />Software.
              </h1>
              <p style={{ fontSize: '17px', color: '#4B6278', lineHeight: 1.7, maxWidth: '480px', margin: 0 }}>
                This private intake helps us understand your project, calculate a preliminary price and timeline, and prepare your Build Card for owner review.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '48px' }}>
              {[
                { icon: '◈', title: 'Discovery complete — you were invited', desc: 'This intake is the next step after your discovery appointment. We use your answers to prepare a preliminary Build Card and project brief.' },
                { icon: '◉', title: 'Your preliminary Build Card', desc: "We generate a tailored project brief — recommended stack, team, timeline, and budget in one document, ready for owner review." },
                { icon: '◆', title: 'Owner review before build begins', desc: "Your Build Card goes to the M-THRYVE owner for review and approval. Development begins only after the final agreement is confirmed." },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', background: '#0D1620', border: '1px solid #1A2535', borderRadius: '10px' }}>
                  <span style={{ color: '#39D6C7', fontSize: '15px', marginTop: '2px', flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: '#D4E4F0' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#3D5468' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
              <span style={{ fontSize: '13px', color: '#3D5468' }}>Takes about 10–15 minutes</span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#2A3441', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', color: '#3D5468' }}>Private & confidential</span>
            </div>
          </div>
        )}

        {/* ══ CLIENT & PROJECT DETAILS ══ */}
        {currentStep === 'client-details' && (
          <div>
            <StepHeader
              tag="Step 2 — Client & Project Details"
              title="Who are we building for?"
              desc="Confirm the contact and project basics for this discovery call so notes, follow-ups, and the owner-review record stay tied to the right company and opportunity."
            />
            <OperatorSpiel text={SPIELS.clientDetails} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Full Name">
                  <input id="field-fullName" aria-describedby="field-fullName-warning" value={form.fullName} onChange={e => set('fullName', e.target.value)} onBlur={() => touchField('field-fullName')} placeholder="Alex Johnson" style={fieldStyle('field-fullName')} />
                  <InlineWarning fieldId="field-fullName" message={getWarning('field-fullName')} />
                </Field>
                <Field label="Company or Organization Name">
                  <input id="field-company" aria-describedby="field-company-warning" value={form.company} onChange={e => set('company', e.target.value)} onBlur={() => touchField('field-company')} placeholder="Acme Corp" style={fieldStyle('field-company')} />
                  <InlineWarning fieldId="field-company" message={getWarning('field-company')} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Business Email">
                  <input id="field-email" aria-describedby="field-email-warning" value={form.email} onChange={e => set('email', e.target.value)} onBlur={() => touchField('field-email')} placeholder="alex@acmecorp.com" type="email" style={fieldStyle('field-email')} />
                  <InlineWarning fieldId="field-email" message={getWarning('field-email')} />
                </Field>
                <Field label="Contact Number">
                  <input id="field-phone" aria-describedby="field-phone-warning" value={form.phone} onChange={e => set('phone', e.target.value)} onBlur={() => touchField('field-phone')} placeholder="+63 917 000 0000" type="tel" style={fieldStyle('field-phone')} />
                  <InlineWarning fieldId="field-phone" message={getWarning('field-phone')} />
                </Field>
              </div>
              <Field label="Project Name" hint="A working name for your project. You can refine this before launch.">
                <input id="field-projectName" aria-describedby="field-projectName-warning" value={form.projectName} onChange={e => set('projectName', e.target.value)} onBlur={() => touchField('field-projectName')} placeholder="e.g. Acme Client Portal" style={fieldStyle('field-projectName')} />
                <InlineWarning fieldId="field-projectName" message={getWarning('field-projectName')} />
              </Field>
              <div id="field-projectType" aria-describedby="field-projectType-warning" onBlur={() => touchField('field-projectType')} style={groupWarningStyle('field-projectType')}>
                <div style={labelStyle}>Project Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {getProjectTypes(form.tier).map(type => {
                    const sel = form.projectType === type.id
                    return (
                      <button key={type.id} onClick={() => handleProjectTypeChange(type.id)} style={{ padding: '14px 8px', borderRadius: '10px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.07)' : '#111827', cursor: 'pointer', color: sel ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: sel ? 600 : 400, textAlign: 'center', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{type.icon}</span>{type.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <InlineWarning fieldId="field-projectType" message={getWarning('field-projectType')} />
              <Field label="Industry">
                <select id="field-industry" aria-describedby="field-industry-warning" value={form.industry} onChange={e => set('industry', e.target.value)} onBlur={() => touchField('field-industry')} style={{ ...fieldStyle('field-industry'), cursor: 'pointer' }}>
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(ind => <option key={ind.value} value={ind.value}>{ind.label}</option>)}
                </select>
                <InlineWarning fieldId="field-industry" message={getWarning('field-industry')} />
              </Field>
              <Field label="Brief Business Description" hint="A sentence or two describing what your business does and who it serves.">
                <textarea id="field-businessDesc" aria-describedby="field-businessDesc-warning" value={form.businessDesc} onChange={e => set('businessDesc', e.target.value)} onBlur={() => touchField('field-businessDesc')} placeholder="e.g. We are a logistics company helping SMEs across Metro Manila track and manage their deliveries in real time..." rows={3} style={{ ...fieldStyle('field-businessDesc'), resize: 'vertical', lineHeight: 1.7 }} />
                <InlineWarning fieldId="field-businessDesc" message={getWarning('field-businessDesc')} />
              </Field>
            </div>
          </div>
        )}

        {/* ══ COMPANY ASSETS QUESTIONNAIRE (v2.0 structured) ══ */}
        {currentStep === 'company-assets' && (
          <CompanyAssetsStep
            form={form}
            setForm={setForm}
            getWarning={getWarning}
            touchField={touchField}
            assetBinding={assetBinding}
            ensureAssetBinding={ensureAssetBinding}
          />
        )}

        {/* Legacy assetQualification renderer — kept out of flow, deprecated in v2. */}
        {false && (
          <div>
            <div style={{ marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#D4E4F0' }}>Are your company deck and complete brand materials already available?</div>
            <div style={{ fontSize: '13px', color: '#4B6278', marginBottom: '16px', lineHeight: 1.55 }}>This helps us determine what we need from you now. You can always provide additional assets later if needed.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'provided', title: 'Yes — already provided during discovery', desc: "We have received your materials. They will be used throughout your project. You can replace or update files at any time.", icon: '✓', iconBg: 'rgba(57,214,199,0.15)', iconColor: '#39D6C7' },
                { id: 'ready', title: 'Yes — available, but not yet provided', desc: "You have everything ready. We will ask you to upload your files in the checklist below.", icon: '↑', iconBg: 'rgba(57,214,199,0.1)', iconColor: '#39D6C7' },
                { id: 'incomplete', title: 'Yes — but some materials are incomplete', desc: "No problem. Tell us which assets you have and which are still missing. We can continue with what is available now.", icon: '◑', iconBg: 'rgba(245,158,11,0.12)', iconColor: '#F59E0B' },
                { id: 'no-assets', title: 'No — we need help creating them', desc: "Many great projects start with just an idea. We offer branding and content services to get you ready.", icon: '○', iconBg: 'rgba(75,98,120,0.15)', iconColor: '#4B6278' },
              ].map(opt => {
                const sel = form.assetQualification === opt.id
                return (
                  <button key={opt.id} onClick={() => set('assetQualification', opt.id)} style={{ padding: '18px 20px', borderRadius: '12px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.05)' : '#111827', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: sel ? opt.iconBg : '#0D1620', border: `1px solid ${sel ? opt.iconColor + '30' : '#1E2E3D'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? opt.iconColor : '#3D5468', fontSize: '14px', flexShrink: 0, transition: 'all 0.15s' }}>{opt.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: sel ? '#F0F6FF' : '#C4D8EA', marginBottom: '4px' }}>{opt.title}</div>
                      <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.55 }}>{opt.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {form.assetQualification === 'provided' && (
              <div style={{ padding: '16px 18px', background: 'rgba(57,214,199,0.05)', border: '1px solid rgba(57,214,199,0.2)', borderRadius: '10px', fontSize: '13px', color: '#39D6C7', lineHeight: 1.6 }}>
                Great — we already have your materials. They will be used throughout your project. You can still upload updated files at any stage.
              </div>
            )}

            {(form.assetQualification === 'ready' || form.assetQualification === 'incomplete') && (
              <div>
                <div style={{ ...monoLabel, color: '#39D6C7', marginBottom: '14px' }}>Company Asset Checklist</div>
                {form.assetQualification === 'incomplete' && (
                  <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#F59E0B', lineHeight: 1.6 }}>
                    Mark each item status. Our team can continue reviewing while you gather remaining materials.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {ASSET_CHECKLIST.map(item => {
                    const status = form.assetStatuses[item.id] || ''
                    return (
                      <div key={item.id} style={{ padding: '12px 16px', background: '#111827', border: `1px solid ${status === 'Available' ? '#39D6C740' : '#2A3441'}`, borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#D4E4F0' }}>{item.label}</span>
                            {item.required && <span style={{ fontSize: '10px', color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>Required</span>}
                          </div>
                          {form.assetQualification === 'incomplete' ? (
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {ASSET_STATUS_OPTIONS.map(s => (
                                <button key={s} onClick={() => set('assetStatuses', { ...form.assetStatuses, [item.id]: s })} style={{ padding: '3px 8px', borderRadius: '100px', border: `1px solid ${status === s ? '#39D6C7' : '#2A3441'}`, background: status === s ? 'rgba(57,214,199,0.1)' : 'transparent', color: status === s ? '#39D6C7' : '#4B6278', fontSize: '10px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.12s', whiteSpace: 'nowrap' }}>{s}</button>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {['Available', 'N/A'].map(s => (
                                <button key={s} onClick={() => set('assetStatuses', { ...form.assetStatuses, [item.id]: s })} style={{ padding: '3px 8px', borderRadius: '100px', border: `1px solid ${status === s ? '#39D6C7' : '#2A3441'}`, background: status === s ? 'rgba(57,214,199,0.1)' : 'transparent', color: status === s ? '#39D6C7' : '#4B6278', fontSize: '10px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.12s' }}>{s}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(form.assetQualification === 'no-assets' || form.assetQualification === 'incomplete') && (
              <div>
                {form.assetQualification === 'no-assets' && (
                  <div style={{ padding: '18px 20px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '12px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#D4E4F0', marginBottom: '8px' }}>{"Don't worry — you're in good company."}</div>
                    <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.65, marginBottom: '8px' }}>Many successful projects begin with only an idea. Our team can help you build your branding alongside your software. Template builds require prepared content — we recommend starting with Custom Made or Enterprise, which include asset support.</div>
                    <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px' }}>Drag & Drop unavailable without brand materials.</div>
                  </div>
                )}
                <div style={{ ...monoLabel, color: '#39D6C7', marginBottom: '12px' }}>Add Asset Services (Optional)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ASSET_SERVICES.map(svc => {
                    const added = form.selectedAssetServices.includes(svc.id)
                    return (
                      <div key={svc.id} style={{ padding: '14px 16px', background: '#111827', border: `1px solid ${added ? '#39D6C740' : '#2A3441'}`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#D4E4F0', marginBottom: '2px' }}>{svc.name}</div>
                          <div style={{ fontSize: '12px', color: '#4B6278' }}>{svc.desc}</div>
                          <div style={{ fontSize: '11px', color: '#3D5468', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>Price pending configuration · Timeline pending analysis</div>
                        </div>
                        <button onClick={() => set('selectedAssetServices', added ? form.selectedAssetServices.filter(s => s !== svc.id) : [...form.selectedAssetServices, svc.id])} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${added ? '#39D6C7' : '#2A3441'}`, background: added ? 'rgba(57,214,199,0.1)' : 'transparent', cursor: 'pointer', color: added ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s', flexShrink: 0 }}>
                          {added ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ BUILD APPROACH ══ */}
        {currentStep === 'build-approach' && (
          <div>
            <StepHeader
              tag="Step 1 — Choose Build Approach"
              title="How would you like to build?"
              desc="Two active build paths: Custom Build starts from an existing template and adds supported extensions; Enterprise Level is a from-scratch product with wider scope. Prices remain preliminary until owner review."
            />
            <OperatorSpiel text={SPIELS.customBuild} />
            <OperatorSpiel text={SPIELS.enterprise} tone="accent" />
            <div id="field-tier" aria-describedby="field-tier-warning" onBlur={() => touchField('field-tier')} style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...groupWarningStyle('field-tier') }}>
              {[
                {
                  id: 'custom' as Tier,
                  name: 'Custom Build',
                  badge: 'Template-based',
                  badgeColor: '#39D6C7',
                  desc: 'Start from an existing template and layer in the features and content the template already supports. Requests outside the supported catalog are flagged for owner review.',
                  price: 'Preliminary — configured per template',
                  priceNote: 'Base template price plus supported extensions',
                  bullets: ['Template foundation', 'Supported extensions only', 'Preliminary cost per feature', 'Faster path to delivery'],
                  disabled: false,
                },
                {
                  id: 'enterprise' as Tier,
                  name: 'Enterprise Level',
                  badge: 'From scratch',
                  badgeColor: '#8B5CF6',
                  desc: 'Full discovery of vision, workflows, roles, integrations, and design direction for a from-scratch product. Preliminary scope and cost are confirmed only after owner review.',
                  price: 'Preliminary — confirmed after owner review',
                  priceNote: 'Depends on scope, integrations, and design discovery',
                  bullets: ['Built from scratch', 'Custom architecture', 'Custom workflows & features', 'Requires detailed review'],
                  disabled: false,
                },
              ].map(tier => {
                const sel = form.tier === tier.id
                return (
                  <button key={tier.id} onClick={() => !tier.disabled && handleTierSelect(tier.id)} style={{ padding: '20px', borderRadius: '12px', border: `1px solid ${sel ? '#39D6C7' : tier.disabled ? '#161F2B' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.06)' : tier.disabled ? '#0D1115' : '#111827', cursor: tier.disabled ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.18s', width: '100%', opacity: tier.disabled ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: sel ? 'none' : '1px solid #2A3441', background: sel ? '#39D6C7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#060C10', fontWeight: 800, flexShrink: 0 }}>{sel ? '✓' : ''}</div>
                        <div style={{ fontWeight: 700, fontSize: '16px', color: sel ? '#39D6C7' : '#D4E4F0', letterSpacing: '-0.01em' }}>{tier.name}</div>
                        {tier.disabled && <span style={{ fontSize: '11px', color: '#EF4444', padding: '2px 8px', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>Assets required</span>}
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', background: `${tier.badgeColor}18`, border: `1px solid ${tier.badgeColor}40`, fontSize: '11px', fontWeight: 600, color: tier.badgeColor, whiteSpace: 'nowrap', flexShrink: 0 }}>{tier.badge}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.6, marginBottom: '14px', marginLeft: '28px' }}>{tier.desc}</div>
                    <div style={{ marginLeft: '28px', padding: '14px 16px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#4B6278', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>Starting Price</span>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: tier.badgeColor, letterSpacing: '-0.02em' }}>{tier.price}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#3D5468', marginBottom: '10px' }}>{tier.priceNote}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {tier.bullets.map(b => <span key={b} style={{ fontSize: '11px', color: '#3D5468', padding: '2px 8px', borderRadius: '100px', background: '#111827', border: '1px solid #1E2E3D' }}>{b}</span>)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <InlineWarning fieldId="field-tier" message={getWarning('field-tier')} />
          </div>
        )}

        {/* ══ TEMPLATE SELECTION / AI QUESTIONNAIRE ══ */}
        {currentStep === 'template-select' && (
          <div>
            {/* ── Factory Core Features panel (both Custom Build types) ── */}
            {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && (
              <div style={{ padding: '16px 18px', background: 'rgba(57,214,199,0.03)', border: '1px solid rgba(57,214,199,0.18)', borderRadius: '10px', marginBottom: '24px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#39D6C7', marginBottom: '6px' }}>Factory Core Features</div>
                <div style={{ fontSize: '13px', color: '#4B6278', marginBottom: '12px' }}>Every M-THRYVE website includes these — no selection needed.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {CORE_FEATURES.map(cf => (
                    <div key={cf.code} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#39D6C7', paddingTop: '3px', minWidth: '52px' }}>{cf.code}</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#D4E4F0' }}>{cf.name}</div>
                        <div style={{ fontSize: '11px', color: '#3D5468', lineHeight: 1.5 }}>{cf.operatorExplanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.projectType === 'ai-assisted-website' ? (() => {
              const q: Partial<WebsiteQuestionnaire> = form.websiteQuestionnaire ?? {}
              const isVisible = (f: QuestionnaireFieldDef): boolean => {
                if (!f.conditionalOn) return true
                const { field: dep, value, notValue } = f.conditionalOn
                const depVal = q[dep as keyof WebsiteQuestionnaire]
                if (value !== undefined) return Array.isArray(depVal) ? (depVal as string[]).includes(value) : depVal === value
                if (notValue !== undefined) return Array.isArray(depVal) ? !(depVal as string[]).includes(notValue) : depVal !== notValue
                return true
              }
              return (
                <>
                  <StepHeader tag="Step 4 — Website Questionnaire" title="Tell us about the website." desc="Answer these questions to help the M-THRYVE AI engine propose the right design direction, layout, and visual system for your project." />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {QUESTIONNAIRE_GROUP_ORDER.map(group => {
                      const groupFields = QUESTIONNAIRE_FIELDS.filter(f => f.group === group && isVisible(f))
                      if (groupFields.length === 0) return null
                      return (
                        <div key={group}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#39D6C7', marginBottom: '12px' }}>{QUESTIONNAIRE_GROUP_LABELS[group]}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {groupFields.map(field => {
                              const raw = q[field.key as keyof WebsiteQuestionnaire]
                              const qInputStyle = { width: '100%', background: '#111827', border: '1px solid #2A3441', borderRadius: '8px', padding: '10px 12px', color: '#D4E4F0', fontSize: '13px', fontFamily: "'Inter', system-ui, sans-serif", boxSizing: 'border-box' as const }
                              if (field.control === 'textarea') {
                                return (
                                  <Field key={field.key} label={field.question}>
                                    <textarea value={(raw as string) ?? ''} onChange={e => setQField(field.key, e.target.value)} rows={3} style={{ ...qInputStyle, resize: 'vertical' as const, lineHeight: 1.7 }} />
                                  </Field>
                                )
                              }
                              if (field.control === 'text') {
                                return (
                                  <Field key={field.key} label={field.question}>
                                    <input value={(raw as string) ?? ''} onChange={e => setQField(field.key, e.target.value)} style={qInputStyle} />
                                  </Field>
                                )
                              }
                              if (field.control === 'radio' || field.control === 'multi-select') {
                                const isMulti = field.control === 'multi-select'
                                const selected: string[] = isMulti ? ((raw as string[]) ?? []) : (raw ? [raw as string] : [])
                                return (
                                  <div key={field.key}>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#D4E4F0', marginBottom: '8px' }}>{field.question}</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                                      {field.options?.map(opt => {
                                        const sel = selected.includes(opt.value)
                                        return (
                                          <button key={opt.value} onClick={() => isMulti ? toggleQMulti(field.key, opt.value) : setQField(field.key, opt.value)} style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.08)' : 'transparent', color: sel ? '#39D6C7' : '#4B6278', fontSize: '12px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s' }}>{opt.label}</button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }
                              if (field.control === 'select') {
                                return (
                                  <Field key={field.key} label={field.question}>
                                    <select value={(raw as string) ?? ''} onChange={e => setQField(field.key, e.target.value)} style={{ ...qInputStyle, cursor: 'pointer', color: (raw as string) ? '#D4E4F0' : '#4B6278' }}>
                                      <option value="">Select...</option>
                                      {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                  </Field>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })() : (
            <>
            <StepHeader
              tag="Step 4 — Base Template"
              title="Choose your starting point."
              desc="Custom Build uses a template as its foundation. Select the template whose supported structure best matches the project; the template catalog defines available colorways, sizes, platforms, and extension points."
            />
            <OperatorSpiel text={SPIELS.customBuild} />
            <OperatorSpiel text={SPIELS.followUp} tone="warning" />
            {/* ── REV-03: industry filter indicator ─────────────────────── */}
            {industryActive && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: '#4B6278', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {override
                    ? 'Showing all starting points'
                    : hasPrimary
                      ? `Showing starting points for: ${filterMapping.label}`
                      : hasRecommended
                        ? `Recommended alternatives for ${filterMapping.label}`
                        : `No templates are specifically designed for ${filterMapping.label} yet. Showing all available templates.`}
                </div>
                <button
                  onClick={() => setTemplateFilterOverride(!override)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '100px',
                    border: '1px solid #2A3441',
                    background: 'transparent',
                    color: override ? '#F59E0B' : '#39D6C7',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {override
                    ? `Reset to ${filterMapping.label}`
                    : 'Show all templates'}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setTemplateCatFilter(cat)} style={{ padding: '6px 14px', borderRadius: '100px', border: `1px solid ${templateCatFilter === cat ? '#39D6C7' : '#2A3441'}`, background: templateCatFilter === cat ? 'rgba(57,214,199,0.09)' : 'transparent', cursor: 'pointer', color: templateCatFilter === cat ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: templateCatFilter === cat ? 600 : 400, transition: 'all 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }}>{cat}</button>
              ))}
            </div>

            {(() => {
              const sectionHeader: CSSProperties = {
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.08em',
                color: '#4B6278',
                textTransform: 'uppercase',
                marginBottom: '8px',
                marginTop: '8px',
              }
              const isOverrideView = industryActive && override
              const isOverrideOrRecommendedView = isOverrideView || (industryActive && !override && !hasPrimary && hasRecommended)

              const renderGrid = (list: TemplateDefinition[], showBadge?: boolean) => (
                <div id="field-templateId" aria-describedby="field-templateId-warning" onBlur={() => touchField('field-templateId')} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {list.map(t => {
                    const sel = form.templateId === t.id
                    return (
                      <button key={t.id} onClick={() => handleTemplateSelect(t)} style={{ borderRadius: '10px', border: `1.5px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.06)' : '#111827', cursor: 'pointer', padding: 0, overflow: 'hidden', textAlign: 'left', transition: 'all 0.15s', position: 'relative' }}>
                        {showBadge && (
                          <span style={{
                            position: 'absolute', top: '6px', right: '6px', zIndex: 2,
                            padding: '1px 7px', borderRadius: '100px',
                            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                            fontSize: '9px', color: '#F59E0B', fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            Recommended alternative
                          </span>
                        )}
                        <div style={{ height: '64px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <div style={{ width: '48px', height: '4px', borderRadius: '2px', background: t.accent, opacity: 0.7 }} />
                          <div style={{ position: 'absolute', top: '10px', left: '10px', width: '16px', height: '3px', borderRadius: '2px', background: t.accent }} />
                          <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '24px', height: '2px', borderRadius: '1px', background: `${t.accent}50` }} />
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: sel ? '#39D6C7' : '#D4E4F0', marginBottom: '2px' }}>{t.name}</div>
                          <div style={{ fontSize: '10px', color: '#3D5468', marginBottom: '5px' }}>{t.purpose}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: sel ? '#39D6C7' : '#6B8099' }}>{formatPhp(t.desktopPrice)}</span>
                            <span style={{ fontSize: '10px', color: '#3D5468' }}>{t.deliveryDesktop}d</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )

              // Not overriding, not in override-or-recommended mode → render filtered primary (no sections).
              if (!isOverrideView && !isOverrideOrRecommendedView) {
                const list = industryActive ? byCategory(industryFilter.primary) : _filteredAll
                return renderGrid(list)
              }

              // Override mode with sections.
              const primaryByCat = byCategory(industryFilter.primary)
              const recommendedByCat = byCategory(industryFilter.recommended)
              const otherByCat = byCategory(industryFilter.other)

              // No-match: industry active, recommended active, override off, no primary, has recommended
              if (isOverrideOrRecommendedView && !isOverrideView && !hasPrimary && hasRecommended) {
                return renderGrid(recommendedByCat, true)
              }

              // No-match fallback: no primary, no recommended, override off → show all with note
              if (industryActive && !isOverrideView && !hasPrimary && !hasRecommended) {
                return renderGrid(_filteredAll)
              }

              // Override view: all three sections.
              return (
                <>
                  {primaryByCat.length > 0 && (
                    <>
                      <div style={sectionHeader}>Recommended for {filterMapping.label}</div>
                      {renderGrid(primaryByCat)}
                    </>
                  )}
                  {recommendedByCat.length > 0 && (
                    <>
                      <div style={sectionHeader}>Related templates</div>
                      {renderGrid(recommendedByCat, true)}
                    </>
                  )}
                  {otherByCat.length > 0 && (
                    <>
                      <div style={sectionHeader}>All other templates</div>
                      {renderGrid(otherByCat)}
                    </>
                  )}
                  {/* If all lists empty (shouldn't happen), show all unfiltered. */}
                  {primaryByCat.length === 0 && recommendedByCat.length === 0 && otherByCat.length === 0 && (
                    renderGrid(_filteredAll)
                  )}
                </>
              )
            })()}

            {selectedTemplate && (
              <div>
                <div style={{ height: '1px', background: '#1E2E3D', marginBottom: '24px' }} />

                <div style={{ marginBottom: '20px' }}>
                  <div style={labelStyle}>Choose Your Platform</div>
                  <div id="field-projectVersion" aria-describedby="field-projectVersion-warning" onBlur={() => touchField('field-projectVersion')} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', ...groupWarningStyle('field-projectVersion') }}>
                    {[['desktop', 'Website'], ['mobile', 'Mobile App'], ['both', 'Website + Mobile App']].map(([v, label]) => (
                      <button key={v} onClick={() => { set('projectVersion', v); touchField('field-projectVersion') }} style={versionBtn(v)}>{label}</button>
                    ))}
                  </div>
                  <InlineWarning fieldId="field-projectVersion" message={getWarning('field-projectVersion')} />

                  {form.tier === 'template' && (
                    <div style={{ padding: '14px 16px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '10px', marginBottom: '12px' }}>
                      <div style={{ ...monoLabel, marginBottom: '10px', color: '#4B6278' }}>Optional Add-Ons</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { field: 'customSizes' as const, label: 'Custom Sizes', desc: 'Appropriate when your content requires non-standard breakpoints or device targets beyond the default responsive template.' },
                          { field: 'allSizes' as const, label: 'All Sizes', desc: 'Includes custom builds for every major device class. Recommended for brands with strict multi-platform consistency requirements.' },
                        ].map(addon => {
                          const active = form[addon.field]
                          return (
                            <button key={addon.field} onClick={() => set(addon.field, !active)} style={{ padding: '12px 14px', borderRadius: '8px', border: `1px solid ${active ? '#39D6C7' : '#1E2E3D'}`, background: active ? 'rgba(57,214,199,0.05)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', gap: '12px', alignItems: 'flex-start', transition: 'all 0.15s' }}>
                              <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `1px solid ${active ? '#39D6C7' : '#2A3441'}`, background: active ? '#39D6C7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060C10', fontSize: '10px', fontWeight: 800, flexShrink: 0, marginTop: '1px', transition: 'all 0.15s' }}>{active ? '✓' : ''}</div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: active ? '#39D6C7' : '#D4E4F0', marginBottom: '2px' }}>{addon.label}</div>
                                <div style={{ fontSize: '12px', color: '#4B6278', lineHeight: 1.5 }}>{addon.desc}</div>
                                <div style={{ fontSize: '11px', color: '#3D5468', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>Price pending configuration</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {form.projectVersion && (
                    <div style={{ padding: '10px 14px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#4B6278' }}>{pricing.versionLabel} · {pricing.delivery} working days</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#39D6C7' }}>{formatPhp(pricing.base)}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <div style={labelStyle}>Color Style</div>
                    <span style={{ fontSize: '11px', color: '#39D6C7', fontFamily: "'JetBrains Mono', monospace" }}>All styles included at no additional cost</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COLOR_OPTIONS.map(c => {
                      const sel = form.colorPreset === c.id
                      return (
                        <button key={c.id} onClick={() => set('colorPreset', c.id)} aria-label={c.name} aria-pressed={sel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '100px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.08)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }}>
                          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: c.color, flexShrink: 0, boxShadow: sel ? `0 0 0 2px rgba(57,214,199,0.4)` : 'none', transition: 'box-shadow 0.15s' }} />
                          <span style={{ fontSize: '12px', color: sel ? '#39D6C7' : '#4B6278', fontWeight: sel ? 600 : 400 }}>{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {(() => {
                  const multiPage = templatePages.length > 1
                  const accent = getPreviewAccent(selectedTemplate.accent, form.colorPreset)
                  const showMobile = form.projectVersion === 'mobile' || (form.projectVersion === 'both' && previewVersion === 'mobile')
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <div style={{ ...monoLabel, margin: 0, fontSize: '10px' }}>Page {currentPageIndex + 1} of {templatePages.length}</div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#D4E4F0', marginTop: '2px' }}>{currentPageName}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button onClick={() => setCurrentPageIndex(i => (i - 1 + templatePages.length) % templatePages.length)} disabled={!multiPage} style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid #2A3441', background: '#0D1620', cursor: multiPage ? 'pointer' : 'not-allowed', color: multiPage ? '#6B8099' : '#2A3441', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {templatePages.map((_, i) => <button key={i} onClick={() => setCurrentPageIndex(i)} style={{ width: '6px', height: '6px', borderRadius: '50%', border: 'none', background: i === currentPageIndex ? '#39D6C7' : '#2A3441', cursor: 'pointer', padding: 0, transition: 'background 0.15s' }} />)}
                          </div>
                          <button onClick={() => setCurrentPageIndex(i => (i + 1) % templatePages.length)} disabled={!multiPage} style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid #2A3441', background: '#0D1620', cursor: multiPage ? 'pointer' : 'not-allowed', color: multiPage ? '#6B8099' : '#2A3441', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
                        </div>
                      </div>
                      {form.projectVersion === 'both' && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          {['desktop', 'mobile'].map(v => <button key={v} onClick={() => setPreviewVersion(v as 'desktop' | 'mobile')} style={{ padding: '4px 12px', borderRadius: '6px', border: `1px solid ${previewVersion === v ? '#39D6C7' : '#2A3441'}`, background: previewVersion === v ? 'rgba(57,214,199,0.08)' : 'transparent', color: previewVersion === v ? '#39D6C7' : '#4B6278', fontSize: '11px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", textTransform: 'capitalize' }}>{v} Preview</button>)}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: showMobile ? 'center' : 'stretch', marginBottom: '20px' }}>
                        {showMobile ? (
                          <>
                            <div style={{ width: '160px', height: '347px', background: '#0D1825', borderRadius: '24px', border: '2px solid #2A3441', boxShadow: '0 0 0 6px #111827, 0 8px 24px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.3s' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px', paddingBottom: '4px' }}>
                                <div style={{ width: '40px', height: '5px', background: '#1E2E3D', borderRadius: '3px' }} />
                              </div>
                              <div style={{ flex: 1, background: selectedTemplate.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${accent}18` }}>
                                  <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: accent, transition: 'background 0.3s' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '12px', gap: '6px' }}>
                                  <div style={{ width: '75%', height: '5px', borderRadius: '3px', background: accent, opacity: 0.85, transition: 'background 0.3s' }} />
                                  <div style={{ width: '58%', height: '3px', borderRadius: '2px', background: `${accent}60`, transition: 'background 0.3s' }} />
                                  <div style={{ width: '38%', height: '7px', borderRadius: '4px', background: accent, marginTop: '4px', opacity: 0.7, transition: 'background 0.3s' }} />
                                </div>
                                <div style={{ padding: '5px 10px', borderTop: `1px solid ${accent}15` }}>
                                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '7px', color: '#3D5468', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{currentPageName} · Mobile App</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '5px 0' }}>
                                <div style={{ width: '32px', height: '3px', background: '#2A3441', borderRadius: '2px' }} />
                              </div>
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#3D5468', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '6px' }}>Mobile preview · 390 × 844</div>
                          </>
                        ) : (
                          <div style={{ width: '100%', height: '130px', background: selectedTemplate.bg, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${accent}30`, display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
                            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${accent}20` }}>
                              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: accent, transition: 'background 0.3s' }} />
                              <div style={{ display: 'flex', gap: '10px' }}>{templatePages.slice(0, 4).map(p => <div key={p} style={{ width: '24px', height: '3px', borderRadius: '1px', background: `${accent}50`, transition: 'background 0.3s' }} />)}</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '12px', gap: '7px' }}>
                              <div style={{ width: '40%', height: '5px', borderRadius: '3px', background: accent, opacity: 0.8, transition: 'background 0.3s' }} />
                              <div style={{ width: '30%', height: '3px', borderRadius: '2px', background: `${accent}60`, transition: 'background 0.3s' }} />
                              <div style={{ width: '18%', height: '8px', borderRadius: '4px', background: accent, marginTop: '4px', opacity: 0.7, transition: 'background 0.3s' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
})()}
            <InlineWarning fieldId="field-templateId" message={getWarning('field-templateId')} />

                <div style={{ padding: '20px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ ...monoLabel, color: '#39D6C7', marginBottom: '14px' }}>Content & Asset Notes — {currentPageName}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                    {pageDef.fields.map(f => (
                      <div key={f.id}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ ...labelStyle, margin: 0 }}>{f.label}</label>
                          {f.required && <span style={{ fontSize: '10px', color: '#EF4444' }}>Required</span>}
                        </div>
                        {f.type === 'textarea'
                          ? <textarea value={getPageField(currentPageName, f.id)} onChange={e => setPageField(currentPageName, f.id, e.target.value)} placeholder={f.placeholder} rows={3} style={{ ...inputStyle, background: '#111827', resize: 'vertical', lineHeight: 1.7 }} />
                          : <input value={getPageField(currentPageName, f.id)} onChange={e => setPageField(currentPageName, f.id, e.target.value)} placeholder={f.placeholder} style={{ ...inputStyle, background: '#111827' }} />
                        }
                      </div>
                    ))}
                  </div>
                  <div style={{ ...monoLabel, marginBottom: '10px' }}>Required Uploads</div>
                  {pageDef.uploads.map(u => (
                    <AssetUploader
                      key={`${currentPageName}-${u.id}`}
                      assets={form.uploadedAssets}
                      binding={assetBinding}
                      ensureBinding={ensureAssetBinding}
                      onAssetsChange={(uploadedAssets: UploadedAssetRef[]) => setForm(prev => ({ ...prev, uploadedAssets }))}
                      requirementKey={`page.${slugify(currentPageName)}.${u.id}`}
                      label={`${u.label}${u.required ? ' · Required' : ''}`}
                      hint={`${u.count}${u.dimensions ? ` · ${u.dimensions}` : ''} · ${u.formats}`}
                      compact
                    />
                  ))}
                  <div style={{ marginTop: '14px' }}>
                    <div style={labelStyle}>Additional Notes for this Page</div>
                    <textarea value={getPageField(currentPageName, '_notes')} onChange={e => setPageField(currentPageName, '_notes', e.target.value)} placeholder="Any additional context or instructions for this page..." rows={2} style={{ ...inputStyle, background: '#111827', resize: 'vertical', lineHeight: 1.7 }} />
                  </div>
                </div>

                {form.projectVersion && (
                  <div style={{ padding: '14px 18px', background: 'rgba(57,214,199,0.04)', border: '1px solid rgba(57,214,199,0.18)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ ...monoLabel, margin: 0 }}>Preliminary Total</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: 700, color: '#39D6C7' }}>{formatPhp(pricing.total)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#3D5468' }}>{selectedTemplate.name} · {pricing.versionLabel} · {pricing.delivery} working days · Subject to owner review</div>
                  </div>
                )}
              </div>
            )}
            </>
            )}
          </div>
        )}

        {/* ══ ENTERPRISE VISION ══ */}
        {currentStep === 'enterprise-vision' && (
          <div>
            <StepHeader
              tag="Step 4 — Enterprise Vision"
              title="Tell us what you're building."
              desc="Enterprise Level is a from-scratch build. Capture the product experience, target users, workflows, integrations, and design direction so the owner review has the full discovery record."
            />
            <OperatorSpiel text={SPIELS.enterprise} tone="accent" />
            <OperatorSpiel text={SPIELS.followUp} tone="warning" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Product Vision" hint="What are you building and why? What problem does it solve?">
                <textarea id="field-projectVision" aria-describedby="field-projectVision-warning" value={form.projectVision} onChange={e => set('projectVision', e.target.value)} onBlur={() => touchField('field-projectVision')} placeholder="We are building a platform that helps logistics companies track shipments in real time. Our target users are operations managers who need instant visibility into delivery status and exception handling..." rows={5} style={{ ...fieldStyle('field-projectVision'), resize: 'vertical', lineHeight: 1.7 }} />
                <InlineWarning fieldId="field-projectVision" message={getWarning('field-projectVision')} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Target Users">
                  <input id="field-targetUsers" aria-describedby="field-targetUsers-warning" value={form.targetUsers} onChange={e => set('targetUsers', e.target.value)} onBlur={() => touchField('field-targetUsers')} placeholder="e.g. Operations managers, field technicians" style={fieldStyle('field-targetUsers')} />
                  <InlineWarning fieldId="field-targetUsers" message={getWarning('field-targetUsers')} />
                </Field>
                <Field label="User Roles">
                  <input id="field-userRoles" aria-describedby="field-userRoles-warning" value={form.userRoles} onChange={e => set('userRoles', e.target.value)} onBlur={() => touchField('field-userRoles')} placeholder="e.g. Admin, Manager, Viewer, Agent" style={fieldStyle('field-userRoles')} />
                  <InlineWarning fieldId="field-userRoles" message={getWarning('field-userRoles')} />
                </Field>
              </div>
              <Field label="Key Business Workflows">
                <textarea id="field-businessWorkflows" aria-describedby="field-businessWorkflows-warning" value={form.businessWorkflows} onChange={e => set('businessWorkflows', e.target.value)} onBlur={() => touchField('field-businessWorkflows')} placeholder="Walk us through how a user would accomplish the most important task in the system..." rows={4} style={{ ...fieldStyle('field-businessWorkflows'), resize: 'vertical', lineHeight: 1.7 }} />
                <InlineWarning fieldId="field-businessWorkflows" message={getWarning('field-businessWorkflows')} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Required Integrations">
                  <input id="field-integrations" aria-describedby="field-integrations-warning" value={form.integrations} onChange={e => set('integrations', e.target.value)} onBlur={() => touchField('field-integrations')} placeholder="e.g. Salesforce, QuickBooks, Twilio" style={fieldStyle('field-integrations')} />
                  <InlineWarning fieldId="field-integrations" message={getWarning('field-integrations')} />
                </Field>
                <Field label="Existing Systems to Connect">
                  <input id="field-existingSystems" aria-describedby="field-existingSystems-warning" value={form.existingSystems} onChange={e => set('existingSystems', e.target.value)} onBlur={() => touchField('field-existingSystems')} placeholder="e.g. SAP ERP, legacy SQL database" style={fieldStyle('field-existingSystems')} />
                  <InlineWarning fieldId="field-existingSystems" message={getWarning('field-existingSystems')} />
                </Field>
              </div>
              <Field label="Data & Security Requirements">
                <textarea id="field-dataSecurityReqs" aria-describedby="field-dataSecurityReqs-warning" value={form.dataSecurityReqs} onChange={e => set('dataSecurityReqs', e.target.value)} onBlur={() => touchField('field-dataSecurityReqs')} placeholder="SOC 2, HIPAA, GDPR compliance, SSO, end-to-end encryption, data residency requirements..." rows={3} style={{ ...fieldStyle('field-dataSecurityReqs'), resize: 'vertical', lineHeight: 1.7 }} />
                <InlineWarning fieldId="field-dataSecurityReqs" message={getWarning('field-dataSecurityReqs')} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Scalability Requirements">
                  <input id="field-scalabilityReqs" aria-describedby="field-scalabilityReqs-warning" value={form.scalabilityReqs} onChange={e => set('scalabilityReqs', e.target.value)} onBlur={() => touchField('field-scalabilityReqs')} placeholder="e.g. 10,000 DAU, 1M records, multi-region" style={fieldStyle('field-scalabilityReqs')} />
                  <InlineWarning fieldId="field-scalabilityReqs" message={getWarning('field-scalabilityReqs')} />
                </Field>
                <Field label="Design Inspiration">
                  <input id="field-designInspiration" aria-describedby="field-designInspiration-warning" value={form.designInspiration} onChange={e => set('designInspiration', e.target.value)} onBlur={() => touchField('field-designInspiration')} placeholder="URLs or Figma references" style={fieldStyle('field-designInspiration')} />
                  <InlineWarning fieldId="field-designInspiration" message={getWarning('field-designInspiration')} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Comparable Products">
                  <input id="field-competitors" aria-describedby="field-competitors-warning" value={form.competitors} onChange={e => set('competitors', e.target.value)} onBlur={() => touchField('field-competitors')} placeholder="e.g. Linear, Notion, Airtable" style={fieldStyle('field-competitors')} />
                  <InlineWarning fieldId="field-competitors" message={getWarning('field-competitors')} />
                </Field>
                <Field label="Success Criteria">
                  <input id="field-successCriteria" aria-describedby="field-successCriteria-warning" value={form.successCriteria} onChange={e => set('successCriteria', e.target.value)} onBlur={() => touchField('field-successCriteria')} placeholder="e.g. 1,000 active users in 3 months" style={fieldStyle('field-successCriteria')} />
                  <InlineWarning fieldId="field-successCriteria" message={getWarning('field-successCriteria')} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ══ PAGES, FEATURES & CONTENT ══ */}
        {currentStep === 'pages-features' && form.tier === 'custom' && (
          <div>
            <StepHeader
              tag="Step 5 — Optional Extensions"
              title="Add optional extensions."
              desc="Every M-THRYVE website includes all 8 core features. Select any optional extensions below — or continue without adding any."
            />

            {/* ── Category filter ── */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...monoLabel, marginBottom: '8px' }}>Browse by category</div>
              <select
                value={extensionCategoryFilter}
                onChange={e => setExtensionCategoryFilter(e.target.value)}
                style={{ width: '100%', background: '#111827', border: '1px solid #2A3441', borderRadius: '8px', padding: '10px 12px', color: '#D4E4F0', fontSize: '13px', fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer' }}
              >
                <option value="all">All categories</option>
                {FEATURE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* ── Extension cards ── */}
            {(() => {
              const filtered = EXTENSIONS.filter(e => extensionCategoryFilter === 'all' || e.category === extensionCategoryFilter)
              if (filtered.length === 0) {
                return (
                  <div style={{ padding: '20px', background: '#111827', border: '1px solid #2A3441', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', fontSize: '13px', color: '#4B6278' }}>
                    No extensions available for this category.
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {filtered.map(ext => {
                    const sel = form.selectedExtensions.includes(ext.code)
                    return (
                      <div key={ext.code} onClick={() => setForm(prev => ({ ...prev, selectedExtensions: sel ? prev.selectedExtensions.filter(c => c !== ext.code) : [...prev.selectedExtensions, ext.code] }))} style={{ padding: '14px 16px', background: sel ? 'rgba(57,214,199,0.04)' : '#111827', border: `1px solid ${sel ? 'rgba(57,214,199,0.35)' : '#2A3441'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? '#39D6C7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', color: '#0D1620' }}>{sel ? '✓' : ''}</div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: sel ? '#39D6C7' : '#D4E4F0' }}>{ext.name}</span>
                          </div>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.06em', color: '#3D5468', whiteSpace: 'nowrap', paddingTop: '2px' }}>{ext.code}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#4B6278', lineHeight: 1.55, marginLeft: '26px', marginBottom: '4px' }}>{ext.description}</div>
                        <div style={{ fontSize: '11px', color: '#3D5468', fontFamily: "'JetBrains Mono', monospace", marginLeft: '26px' }}>{ext.includedCapabilities}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* ── Custom requests (always visible for Custom Build) ── */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...monoLabel, marginBottom: '6px' }}>Custom Requests</div>
              <div style={{ fontSize: '12px', color: '#4B6278', marginBottom: '10px' }}>Describe any requests not covered by the extension catalog. These are <span style={{ color: '#F59E0B' }}>unconfirmed</span> — routed to owner review before scope is finalized.</div>
              {form.customFeatures.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
                  {form.customFeatures.map((f, i) => (
                    <div key={i} style={{ padding: '7px 13px', borderRadius: '100px', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)', color: '#F59E0B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {f}<button onClick={() => setForm(prev => ({ ...prev, customFeatures: prev.customFeatures.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', padding: 0, fontSize: '16px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { setForm(prev => ({ ...prev, customFeatures: [...prev.customFeatures, customInput.trim()] })); setCustomInput('') } }} placeholder="Describe a custom request..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => { if (customInput.trim()) { setForm(prev => ({ ...prev, customFeatures: [...prev.customFeatures, customInput.trim()] })); setCustomInput('') } }} style={{ padding: '0 18px', borderRadius: '8px', border: '1px solid #2A3441', background: '#111827', cursor: 'pointer', color: '#E2E8F0', fontSize: '13px', fontFamily: "'Inter', system-ui, sans-serif" }}>Add</button>
              </div>
            </div>

            {form.selectedExtensions.length > 0 && (
              <div style={{ padding: '10px 16px', background: 'rgba(57,214,199,0.05)', border: '1px solid rgba(57,214,199,0.18)', borderRadius: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#39D6C7' }}>
                {form.selectedExtensions.length} extension{form.selectedExtensions.length !== 1 ? 's' : ''} selected — included in your preliminary Build Card
              </div>
            )}
          </div>
        )}

        {/* ══ PROJECT REVIEW ══ */}
        {currentStep === 'review' && (
          <div>
            <StepHeader tag="Step 6 — Project Review" title="Review your project." desc="Take a moment to confirm everything looks right. Each section has an Edit link if you need to make changes. This review is based on your selected options so far." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ReviewBlock title="Client & Contact" onEdit={() => goToStep('client-details')}>
                <ReviewRow label="Name" value={form.fullName || '—'} />
                <ReviewRow label="Company" value={form.company || '—'} />
                <ReviewRow label="Email" value={form.email || '—'} />
                <ReviewRow label="Project Name" value={form.projectName || '—'} />
                {form.industry && <ReviewRow label="Industry" value={INDUSTRIES.find(i => i.value === form.industry)?.label || form.industry} />}
              </ReviewBlock>

              <ResourceReviewBlock form={form} onEdit={() => goToStep('company-assets')} />

              <ReviewBlock title="Build Path" onEdit={() => goToStep('build-approach')}>
                <ReviewRow label="Path" value={TIER_LABELS[form.tier] || '—'} />
                {form.projectType && <ReviewRow label="Project Type" value={PROJECT_TYPES_FULL.find(t => t.id === form.projectType)?.label || '—'} />}
                {form.projectType === 'templated-website' && selectedTemplate && <ReviewRow label="Template" value={selectedTemplate.name} />}
                {form.projectType === 'templated-website' && form.projectVersion && <ReviewRow label="Platform" value={pricing.versionLabel} />}
                {form.projectType === 'templated-website' && form.colorPreset && <ReviewRow label="Color Style" value={COLOR_OPTIONS.find(c => c.id === form.colorPreset)?.name || '—'} />}
              </ReviewBlock>

              {/* ── AI-Assisted Website questionnaire review (all 7 groups) ── */}
              {form.projectType === 'ai-assisted-website' && form.websiteQuestionnaire && (() => {
                const q = form.websiteQuestionnaire
                const isVisible = (f: QuestionnaireFieldDef): boolean => {
                  if (!f.conditionalOn) return true
                  const depVal = q[f.conditionalOn.field as keyof WebsiteQuestionnaire]
                  if (f.conditionalOn.value !== undefined) {
                    return Array.isArray(depVal)
                      ? depVal.includes(f.conditionalOn.value)
                      : depVal === f.conditionalOn.value
                  }
                  if (f.conditionalOn.notValue !== undefined) {
                    return Array.isArray(depVal)
                      ? !depVal.includes(f.conditionalOn.notValue)
                      : depVal !== f.conditionalOn.notValue
                  }
                  return true
                }
                const displayValue = (field: QuestionnaireFieldDef, value: unknown): string => {
                  const values = Array.isArray(value) ? value : [value]
                  return values
                    .map(item => field.options?.find(option => option.value === item)?.label ?? String(item))
                    .join(', ')
                }
                const hasAnyAnswer = QUESTIONNAIRE_FIELDS.some(f => {
                  const v = q[f.key as keyof WebsiteQuestionnaire]
                  return isVisible(f) && (Array.isArray(v) ? v.length > 0 : Boolean(v))
                })
                if (!hasAnyAnswer) return null
                return (
                  <ReviewBlock title="Website Questionnaire" onEdit={() => goToStep('template-select')}>
                    {QUESTIONNAIRE_GROUP_ORDER.map(group => {
                      const groupFields = QUESTIONNAIRE_FIELDS.filter(f => f.group === group && isVisible(f))
                      const answeredFields = groupFields.filter(f => {
                        const v = q[f.key as keyof WebsiteQuestionnaire]
                        return Array.isArray(v) ? v.length > 0 : Boolean(v)
                      })
                      if (answeredFields.length === 0) return null
                      return (
                        <div key={group} style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: '#39D6C7', marginBottom: '6px' }}>{QUESTIONNAIRE_GROUP_LABELS[group]}</div>
                          {answeredFields.map(f => {
                            const v = q[f.key as keyof WebsiteQuestionnaire]
                             const display = displayValue(f, v)
                            return <ReviewRow key={f.key} label={f.question} value={display} />
                          })}
                        </div>
                      )
                    })}
                  </ReviewBlock>
                )
              })()}

              {/* ── Core Features (always included for Custom Build) ── */}
              {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && (
                <ReviewBlock title="Factory Core Features · 8 Included" onEdit={() => goToStep('template-select')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {CORE_FEATURES.map(cf => (
                      <div key={cf.code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#39D6C7', minWidth: '52px' }}>{cf.code}</span>
                        <span style={{ fontSize: '12px', color: '#D4E4F0' }}>{cf.name}</span>
                      </div>
                    ))}
                  </div>
                </ReviewBlock>
              )}

              {/* ── Optional extensions ── */}
              {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && form.selectedExtensions.length > 0 && (
                <ReviewBlock title={`Optional Extensions · ${form.selectedExtensions.length}`} onEdit={() => goToStep('pages-features')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {form.selectedExtensions.map(code => {
                      const ext = EXTENSIONS.find(e => e.code === code)
                      return (
                        <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#39D6C7', minWidth: '52px' }}>{code}</span>
                          <span style={{ fontSize: '12px', color: '#D4E4F0' }}>{ext?.name || code}</span>
                        </div>
                      )
                    })}
                  </div>
                </ReviewBlock>
              )}

              {/* ── Custom requests ── */}
              {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && form.customFeatures.length > 0 && (
                <ReviewBlock title={`Custom Requests · ${form.customFeatures.length} Unconfirmed`} onEdit={() => goToStep('pages-features')}>
                  <div style={{ fontSize: '11px', color: '#F59E0B', marginBottom: '8px' }}>Routed to owner review — not confirmed scope</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {form.customFeatures.map((f, i) => <span key={i} style={{ padding: '3px 9px', borderRadius: '100px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.28)', fontSize: '11px', color: '#F59E0B' }}>{f}</span>)}
                  </div>
                </ReviewBlock>
              )}

              {missingReqSnapshot.length > 0 && (
                <div style={{ ...cardStyle, border: '1px solid rgba(245,158,11,0.28)' }}>
                  <div style={{ ...monoLabel, color: '#F59E0B' }}>Missing / Incomplete — {missingReqSnapshot.length}</div>
                  <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.55, marginBottom: '12px' }}>
                    These items are not blocking a draft. Submission requires the items marked <strong style={{ color: '#EF4444' }}>required</strong>.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {missingReqSnapshot.map(req => (
                      <div key={req.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#D4E4F0' }}>{req.label}</span>
                        <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: req.severity === 'required' ? '#EF4444' : req.severity === 'recommended' ? '#F59E0B' : '#4B6278' }}>{req.severity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.projectType === 'templated-website' && selectedTemplate && form.projectVersion && (
                <div style={{ ...cardStyle, border: '1px solid rgba(57,214,199,0.25)' }}>
                  <div style={{ ...monoLabel, color: '#39D6C7' }}>Preliminary Project Receipt</div>
                  <ReviewRow label="Base template" value={formatPhp(pricing.base)} />
                  <ReviewRow label="Platform" value={`${pricing.versionLabel} — Included`} />
                  {form.colorPreset && <ReviewRow label="Color style" value={`${COLOR_OPTIONS.find(c => c.id === form.colorPreset)?.name || '—'} — Included`} />}
                  {form.selectedAssetServices.length > 0 && <ReviewRow label="Asset services" value="Price pending configuration" />}
                  <div style={{ height: '1px', background: '#2A3441', margin: '12px 0' }} />
                  <ReviewRow label="Preliminary Total" value={formatPhp(pricing.total)} bold />
                  <div style={{ height: '1px', background: '#2A3441', margin: '12px 0' }} />
                  <ReviewRow label="Build duration" value={`${pricing.delivery} working days`} />
                  <ReviewRow label="Est. completion" value={deliveryDate(pricing.delivery)} />
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#3D5468', lineHeight: 1.6 }}>Subject to M-THRYVE owner review and final approval. Delivery begins after approval, payment, and receipt of all required assets.</div>
                </div>
              )}

              {form.tier === 'enterprise' && (
                <div style={{ ...cardStyle, border: '1px solid rgba(139,92,246,0.25)' }}>
                  <div style={{ ...monoLabel, color: '#8B5CF6' }}>Enterprise Preliminary Estimate</div>
                  <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.6 }}>Your preliminary price and timeline will be confirmed by the M-THRYVE owner after intake analysis. A formal agreement will be prepared before any billing begins.</div>
                </div>
              )}

              <div style={{ padding: '14px 18px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '10px', fontSize: '12px', color: '#3D5468', lineHeight: 1.7 }}>
                Your unique Build Reference Number is generated only after successful submission. It will appear on your submitted Build Card.
              </div>
            </div>
          </div>
        )}

        {/* ══ OUTCOME (v2.0) ══ */}
        {currentStep === 'outcome' && (
          <div>
            <StepHeader
              tag="Step 7 — Outcome"
              title="How does this call end?"
              desc="Every discovery call ends in one of three operator-controlled outcomes. Discard archives the record with a reason. Draft preserves everything you've captured — missing requirements are stored, not lost. Submitted requires the discovery contract to be complete and creates a preliminary Build Card for owner review."
            />

            {submitAttempted && !canSubmit(form).ok && (
              <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: '10px', marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, marginBottom: '6px' }}>Cannot submit — required information is missing</div>
                <div style={{ fontSize: '12px', color: '#9B6A6A', lineHeight: 1.6, marginBottom: '10px' }}>
                  Save as Draft to preserve what's captured, or return to the flagged section to fill it in.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {canSubmit(form).missing.filter(r => r.severity === 'required').map(req => (
                    <button
                      key={req.key}
                      onClick={() => goToStep(req.section as StepId)}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: '#0D1620', border: '1px solid #2A3441', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: "'Inter', system-ui, sans-serif" }}
                    >
                      <span style={{ fontSize: '12px', color: '#D4E4F0' }}>{req.label}</span>
                      <span style={{ fontSize: '11px', color: '#39D6C7' }}>Open {req.section} →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  id: 'submitted' as IntakeOutcome,
                  title: 'Submitted',
                  badge: 'Ready for owner review',
                  badgeColor: '#39D6C7',
                  desc: 'Discovery is complete. Validates against the discovery contract, generates a preliminary Build Card, and places the intake in the owner-review queue.',
                  action: 'Submit intake',
                  onClick: handleSubmitIntake,
                },
                {
                  id: 'draft' as IntakeOutcome,
                  title: 'Draft',
                  badge: 'Save without submitting',
                  badgeColor: '#F59E0B',
                  desc: 'Preserves everything captured so far. Missing requirements are recorded as follow-ups. Not placed in the owner-review queue and no Build Card is generated.',
                  action: 'Save as draft',
                  onClick: handleSaveDraft,
                },
                {
                  id: 'discarded' as IntakeOutcome,
                  title: 'Discard',
                  badge: 'Client not proceeding',
                  badgeColor: '#EF4444',
                  desc: 'Archives the record with a reason and an audit event. Not routed to owner review. Captured state is preserved for the future persistence layer.',
                  action: 'Discard intake…',
                  onClick: openDiscardModal,
                },
              ].map(opt => (
                <div key={opt.id} style={{ padding: '20px', borderRadius: '12px', border: `1px solid ${opt.badgeColor}40`, background: '#111827' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#F0F6FF', letterSpacing: '-0.01em' }}>{opt.title}</div>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', background: `${opt.badgeColor}18`, border: `1px solid ${opt.badgeColor}40`, fontSize: '11px', fontWeight: 600, color: opt.badgeColor, whiteSpace: 'nowrap' }}>{opt.badge}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.6, marginBottom: '14px' }}>{opt.desc}</div>
                  <button
                    onClick={opt.onClick}
                    disabled={submitting}
                    data-testid={`outcome-${opt.id}`}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: `1px solid ${opt.badgeColor}`,
                      background: submitting ? 'transparent' : `${opt.badgeColor}18`,
                      color: opt.badgeColor,
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {opt.action}
                  </button>
                </div>
              ))}
            </div>

            {outcomeFinalized === 'draft' && (
              <div style={{ marginTop: '20px', padding: '18px 20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B', marginBottom: '4px' }}>Draft saved. Review warnings before submit.</div>
                <div style={{ fontSize: '13px', color: '#C4D8EA', lineHeight: 1.6 }}>
                  All captured discovery information is preserved. {missingReqSnapshot.length > 0 && `${missingReqSnapshot.length} follow-up item${missingReqSnapshot.length === 1 ? ' is' : 's are'} recorded on the intake.`} No Build Card was generated and the intake is not in the owner-review queue.
                </div>
                <div style={{ fontSize: '11px', color: '#3D5468', marginTop: '10px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                  Draft saved to the server.
                </div>
              </div>
            )}

            {submitting && (
              <div style={{ marginTop: '20px', padding: '18px', background: '#0D1620', border: '1px solid rgba(57,214,199,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid #1A2535', borderTop: '2px solid #39D6C7', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#39D6C7' }}>Submitting your intake…</span>
              </div>
            )}

            {submissionError && (
              <div style={{ marginTop: '20px', padding: '18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', color: '#EF4444', lineHeight: 1.5 }}>
                  <strong>Submission Error:</strong> {submissionError}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ DRAFT SAVED CONFIRMATION ══ */}
        {currentStep === 'draft-saved' && outcomeFinalized === 'draft' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '100px', marginBottom: '20px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>Draft Saved</span>
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.025em', color: '#F0F6FF', margin: '0 0 10px' }}>Intake Saved as Draft</h1>
              <p style={{ fontSize: '15px', color: '#4B6278', lineHeight: 1.65 }}>Your discovery information has been preserved. No Build Card was generated and this intake is not yet in the owner-review queue.</p>
            </div>

            {/* Client ID */}
            {(savedIntakeId || savedReferenceNumber) && (
              <div style={{ ...cardStyle, border: '1px solid rgba(245,158,11,0.3)', marginBottom: '12px' }}>
                <div style={{ ...monoLabel, color: '#F59E0B', marginBottom: '12px' }}>Draft Identifiers</div>
                {savedReferenceNumber && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#3D5468', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>REFERENCE NUMBER</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em' }}>{savedReferenceNumber}</div>
                      <button onClick={() => copyToClipboard(savedReferenceNumber, 'ref')} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(245,158,11,0.3)', background: copiedRef ? 'rgba(245,158,11,0.15)' : 'transparent', cursor: 'pointer', color: copiedRef ? '#F59E0B' : '#4B6278', fontSize: '12px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {copiedRef ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                {savedClientId && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#3D5468', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>CLIENT ID</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#C4D8EA', wordBreak: 'break-all' }}>{savedClientId}</div>
                  </div>
                )}
                {savedIntakeId && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#3D5468', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>INTAKE ID</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#4B6278', wordBreak: 'break-all' }}>{savedIntakeId}</div>
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#3D5468', marginTop: '12px', lineHeight: 1.5 }}>Use this reference when contacting M-THRYVE about this draft. No Build Card has been generated yet.</div>
              </div>
            )}

            <div style={{ ...cardStyle, marginBottom: '12px' }}>
              <div style={{ ...monoLabel, color: '#39D6C7', marginBottom: '10px' }}>Captured Data & Assets</div>
              <div style={{ fontSize: '13px', color: '#C4D8EA', lineHeight: 1.6 }}>
                Client, project, path, scope, questionnaire/template details, resource notes, and page contents were captured with this draft.
              </div>
              <div role="status" style={{ fontSize: '12px', color: '#7F95A8', marginTop: '8px' }}>
                {form.uploadedAssets.length} uploaded asset{form.uploadedAssets.length === 1 ? '' : 's'} ·{' '}
                {form.uploadedAssets.filter(asset => asset.assetStatus === 'ready').length} ready ·{' '}
                {form.uploadedAssets.filter(asset => ['pending', 'uploaded', 'scanning'].includes(asset.assetStatus)).length} processing ·{' '}
                {form.uploadedAssets.filter(asset => ['rejected', 'failed'].includes(asset.assetStatus)).length} need attention
              </div>
            </div>

            {/* Missing requirements */}
            {missingReqSnapshot.length > 0 && (
              <div style={{ ...cardStyle, border: '1px solid rgba(245,158,11,0.2)', marginBottom: '12px' }}>
                <div style={{ ...monoLabel, color: '#F59E0B', marginBottom: '10px' }}>{missingReqSnapshot.length} Item{missingReqSnapshot.length === 1 ? '' : 's'} Required Before Submission</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {missingReqSnapshot.slice(0, 8).map((req, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#C4D8EA', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: '1px' }}>◦</span>
                      <span>{req.label}</span>
                    </div>
                  ))}
                  {missingReqSnapshot.length > 8 && (
                    <div style={{ fontSize: '12px', color: '#3D5468' }}>+{missingReqSnapshot.length - 8} more items</div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  const resumeIndex = flow.indexOf(resumeEditingStep)
                  setOutcomeFinalized(null)
                  setStepIndex(resumeIndex >= 0 ? resumeIndex : flow.indexOf('review'))
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid rgba(57,214,199,0.3)', background: 'rgba(57,214,199,0.06)', cursor: 'pointer', color: '#39D6C7', fontSize: '14px', fontWeight: 600 }}
              >
                Continue Editing
              </button>
              <button
                onClick={handleSubmitIntake}
                disabled={submitting || missingReqSnapshot.length > 0}
                style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: missingReqSnapshot.length > 0 ? '#1A2535' : '#39D6C7', cursor: missingReqSnapshot.length > 0 ? 'not-allowed' : 'pointer', color: missingReqSnapshot.length > 0 ? '#3D5468' : '#060E18', fontSize: '14px', fontWeight: 700 }}
              >
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </div>
            <button
              onClick={resetAll}
              style={{ width: '100%', marginTop: '10px', padding: '11px', borderRadius: '10px', border: '1px solid #2A3441', background: 'transparent', cursor: 'pointer', color: '#7F95A8', fontSize: '13px', fontWeight: 600 }}
            >
              Return to intake list / start a new intake
            </button>
            {submissionError && (
              <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '13px', color: '#EF4444' }}>
                {submissionError}
              </div>
            )}
          </div>
        )}

        {/* ══ SUBMITTED BUILD CARD (only for submitted outcome) ══ */}
        {currentStep === 'build-card' && submitted && outcomeFinalized === 'submitted' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(57,214,199,0.08)', border: '1px solid rgba(57,214,199,0.25)', borderRadius: '100px', marginBottom: '20px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#39D6C7' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#39D6C7', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>Waiting for Owner Review</span>
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.025em', color: '#F0F6FF', margin: '0 0 10px' }}>Intake Submitted</h1>
              <p style={{ fontSize: '15px', color: '#4B6278', lineHeight: 1.65 }}>Your preliminary Build Card has been created and sent to M-THRYVE for owner review.</p>
            </div>

            {/* Build Reference Number — first and only appearance */}
            <div style={{ ...cardStyle, border: '1px solid rgba(57,214,199,0.3)', marginBottom: '12px' }}>
              <div style={{ ...monoLabel, color: '#39D6C7' }}>Build Reference Number</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '26px', fontWeight: 700, color: '#39D6C7', letterSpacing: '0.08em' }}>{buildRef}</div>
                <button onClick={() => copyToClipboard(buildRef, 'ref')} style={{ padding: '8px 16px', borderRadius: '7px', border: '1px solid rgba(57,214,199,0.3)', background: copiedRef ? 'rgba(57,214,199,0.15)' : 'transparent', cursor: 'pointer', color: copiedRef ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s' }}>
                  {copiedRef ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '13px', color: '#3D5468', lineHeight: 1.55 }}>Use this reference when contacting M-THRYVE about your project. Do not share it publicly.</div>
            </div>

            {/* Preliminary Build Card */}
            <div style={{ ...cardStyle, marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ ...monoLabel, color: '#F59E0B', marginBottom: '6px' }}>Preliminary Build Card — Subject to Owner Review</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: '#F0F6FF' }}>{form.projectName || 'Your Project'}</div>
                  <div style={{ fontSize: '13px', color: '#4B6278', marginTop: '2px' }}>{form.company || 'M-THRYVE Client'} · {TIER_LABELS[form.tier]}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                  <div style={{ ...monoLabel, marginBottom: '6px', fontSize: '9px' }}>Complexity</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: complexity.color, marginBottom: '6px' }}>{complexity.label}</div>
                  <div style={{ height: '3px', background: '#1A2535', borderRadius: '100px' }}>
                    <div style={{ height: '100%', width: `${complexity.level}%`, background: complexity.color, borderRadius: '100px' }} />
                  </div>
                </div>
                {(form.tier === 'template' || form.tier === 'custom') && pricing.total > 0 && (
                  <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                    <div style={{ ...monoLabel, marginBottom: '6px', fontSize: '9px' }}>Preliminary Total</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, color: '#39D6C7' }}>{formatPhp(pricing.total)}</div>
                    <div style={{ fontSize: '11px', color: '#3D5468', marginTop: '2px' }}>Subject to owner review</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                  <div style={{ ...monoLabel, marginBottom: '8px', fontSize: '9px' }}>Recommended Stack</div>
                  {techStack.map(t => <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#D4E4F0', marginBottom: '6px' }}><div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#39D6C7', flexShrink: 0 }} />{t}</div>)}
                </div>
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                  <div style={{ ...monoLabel, marginBottom: '8px', fontSize: '9px' }}>Development Team</div>
                  {team.map(m => <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#D4E4F0', marginBottom: '6px' }}><div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#4B6278', flexShrink: 0 }} />{m}</div>)}
                </div>
              </div>

              {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && (
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D', marginBottom: '10px' }}>
                  <div style={{ ...monoLabel, marginBottom: '8px', fontSize: '9px' }}>Factory Core Features · 8 Included</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {CORE_FEATURES.map(cf => (
                      <div key={cf.code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#39D6C7', minWidth: '52px' }}>{cf.code}</span>
                        <span style={{ fontSize: '11px', color: '#D4E4F0' }}>{cf.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && form.selectedExtensions.length > 0 && (
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D', marginBottom: '10px' }}>
                  <div style={{ ...monoLabel, marginBottom: '8px', fontSize: '9px' }}>Optional Extensions · {form.selectedExtensions.length}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {form.selectedExtensions.map(code => {
                      const ext = EXTENSIONS.find(e => e.code === code)
                      return (
                        <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#39D6C7', minWidth: '52px' }}>{code}</span>
                          <span style={{ fontSize: '11px', color: '#D4E4F0' }}>{ext?.name || code}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {(form.projectType === 'templated-website' || form.projectType === 'ai-assisted-website') && form.customFeatures.length > 0 && (
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.18)', marginBottom: '10px' }}>
                  <div style={{ ...monoLabel, marginBottom: '4px', fontSize: '9px', color: '#F59E0B' }}>Custom Requests · Unconfirmed Assumptions</div>
                  <div style={{ fontSize: '11px', color: '#4B6278', marginBottom: '8px' }}>Pending owner review — not confirmed scope</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {form.customFeatures.map((f, i) => <span key={i} style={{ padding: '3px 9px', borderRadius: '100px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '11px', color: '#F59E0B' }}>{f}</span>)}
                  </div>
                </div>
              )}

              <div style={{ padding: '12px 14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                <ReviewRow label="Submission date" value={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                <ReviewRow label="Status" value="Waiting for Owner Review" bold />
                <div style={{ marginTop: '10px', padding: '10px 12px', background: '#111827', border: '1px solid #1E2E3D', borderRadius: '6px', fontSize: '11px', color: '#3D5468', lineHeight: 1.6 }}>
                  Payment, agreement, and billing are handled in a separate workflow after owner approval. This intake does not capture or authorize any charge.
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
              <div style={{ ...monoLabel, marginBottom: '14px' }}>What Happens Next</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'M-THRYVE reviews your intake and evaluates your preliminary Build Card.',
                  'M-THRYVE may request clarification or revisions to your project details.',
                  'Final scope, price, timeline, maintenance, and payment terms are prepared by the owner.',
                  'The owner approves or declines the project in the Factory Console.',
                  'Billing and development begin only under the final approved agreement.',
                  "You'll hear from us within 24 hours at the email address you provided.",
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', fontSize: '13px', color: '#4B6278', lineHeight: 1.6 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0D1620', border: '1px solid #2A3441', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#39D6C7', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {!submitting && currentStep !== 'outcome' && (
          <div style={{ display: 'flex', justifyContent: currentStep === 'intro' ? 'flex-end' : 'space-between', alignItems: 'center', marginTop: '48px' }}>
            {currentStep !== 'intro' && currentStep !== 'build-card' && (
              <button onClick={handleBack} data-testid="wizard-back" style={ghostBtn}>← Back</button>
            )}
            {currentStep === 'build-card' && (
              <button onClick={resetAll} style={ghostBtn}>← Start New Intake</button>
            )}
            {currentStep !== 'build-card' && (
              <button onClick={handleNext} data-testid="wizard-next" style={primaryBtn} disabled={!canContinue}>
                {currentStep === 'intro' ? 'Start Project Intake →'
                  : currentStep === 'review' ? 'Continue →'
                    : 'Continue →'}
              </button>
            )}
          </div>
        )}

        {currentStep === 'outcome' && !submitting && (
          <div style={{ marginTop: '32px' }}>
            <button onClick={handleBack} style={ghostBtn}>← Back to Review</button>
          </div>
        )}
      </div>

      {/* ══ DISCARDED terminal view (Phase 2) ══ */}
      {outcomeFinalized === 'discarded' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,16,0.96)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '32px' }}>
            <div style={{ ...monoLabel, color: '#EF4444', marginBottom: '10px' }}>Intake Discarded</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#F0F6FF', marginBottom: '10px' }}>Archived with reason</div>
            <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.65, marginBottom: '18px' }}>
              This intake has been marked <strong style={{ color: '#EF4444' }}>discarded</strong>. It is not routed to the owner-review queue and no Build Card was generated. Captured discovery state is preserved for the future persistence layer.
            </div>
            <div style={{ padding: '14px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#4B6278', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', marginBottom: '6px' }}>Reason</div>
              <div style={{ fontSize: '14px', color: '#D4E4F0', marginBottom: '6px' }}>
                {DISCARD_REASON_OPTIONS.find(r => r.code === form.discardReason?.code)?.label || '—'}
              </div>
              {form.discardReason?.note && (
                <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.55 }}>{form.discardReason.note}</div>
              )}
            </div>
            <button onClick={resetAll} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#39D6C7', color: '#060C10', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Start new intake
            </button>
          </div>
        </div>
      )}

      {/* ══ DISCARD CONFIRMATION MODAL (Phase 2) ══ */}
      {showDiscardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,16,0.92)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '28px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F0F6FF', marginBottom: '8px' }}>Discard this intake?</div>
            <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.65, marginBottom: '20px' }}>
              The record will be archived with the reason below. It will not be sent to owner review and no Build Card will be generated.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>Reason</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DISCARD_REASON_OPTIONS.map(opt => {
                  const sel = discardReasonCode === opt.code
                  return (
                    <button
                      key={opt.code}
                      onClick={() => setDiscardReasonCode(opt.code)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${sel ? '#EF4444' : '#2A3441'}`,
                        background: sel ? 'rgba(239,68,68,0.08)' : '#0D1620',
                        color: sel ? '#F0F6FF' : '#4B6278',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={labelStyle}>Operator note (optional)</div>
              <textarea
                value={discardNote}
                onChange={e => setDiscardNote(e.target.value)}
                placeholder="Context, next steps, or verbatim client statement…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDiscardModal(false)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #2A3441', background: 'transparent', color: '#4B6278', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Keep intake
              </button>
              <button
                onClick={confirmDiscard}
                data-testid="discard-confirm"
                style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#EF4444', color: '#F0F6FF', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Discard intake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TIER CHANGE WARNING ══ */}
      {showTierWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,16,0.92)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#111827', border: '1px solid #2A3441', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '28px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F0F6FF', marginBottom: '10px' }}>Switch to {TIER_LABELS[pendingTier] || pendingTier}?</div>
            <div style={{ fontSize: '14px', color: '#4B6278', lineHeight: 1.65, marginBottom: '16px' }}>
              Switching tiers will clear your template selection, questionnaire answers, features, and vision fields. Your contact details, project name, and company assets will be preserved.
            </div>
            {(() => {
              const validTypes = getProjectTypes(pendingTier).map(pt => pt.id)
              const currentLabel = PROJECT_TYPES_FULL.find(t => t.id === form.projectType)?.label
              if (form.projectType && currentLabel && !validTypes.includes(form.projectType)) {
                return (
                  <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: '10px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', marginBottom: '6px' }}>INCOMPATIBLE SELECTION</div>
                    <div style={{ fontSize: '13px', color: '#C4D8EA', lineHeight: 1.6 }}>
                      You selected <strong style={{ color: '#F59E0B' }}>{currentLabel}</strong> as the project type. <strong style={{ color: '#EF4444' }}>{currentLabel} is not available on the {TIER_LABELS[pendingTier] || pendingTier} path.</strong> This selection will be cleared if you continue.
                    </div>
                  </div>
                )
              }
              return null
            })()}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowTierWarning(false); setPendingTier('') }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #2A3441', background: 'transparent', cursor: 'pointer', color: '#4B6278', fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif" }}>Keep current tier</button>
              <button onClick={confirmTierChange} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#39D6C7', cursor: 'pointer', color: '#060C10', fontSize: '14px', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>Switch to {TIER_LABELS[pendingTier] || pendingTier}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FLOATING AI CONCIERGE ══ */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200 }}>
        {conciergeOpen ? (
          <div style={{ width: '360px', background: '#111827', border: '1px solid #2A3441', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '520px' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #1E2E3D', display: 'flex', alignItems: 'center', gap: '12px', background: '#0D1620' }}>
              <RobotIcon size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#D4E4F0', letterSpacing: '-0.01em' }}>M-THRYVE AI Concierge</div>
                <div style={{ fontSize: '11px', color: '#4B6278' }}>Help for this step</div>
              </div>
              <button onClick={() => { setConciergeOpen(false); setConciergeQ(null) }} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #2A3441', background: 'transparent', cursor: 'pointer', color: '#4B6278', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!conciergeQ ? (
                <>
                  <div style={{ padding: '12px 14px', background: '#0D1620', borderRadius: '10px', fontSize: '13px', color: '#C4D8EA', lineHeight: 1.65 }}>
                    Hello — I am here to help you complete this step. Select a question below or type your own.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {faqs.map(faq => (
                      <button key={faq.q} onClick={() => setConciergeQ(faq.q)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #2A3441', background: '#0D1620', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: '#4B6278', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.12s', lineHeight: 1.45 }}>
                        {faq.q}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: '10px 14px', background: 'rgba(57,214,199,0.06)', borderRadius: '8px', border: '1px solid rgba(57,214,199,0.15)', fontSize: '13px', color: '#39D6C7' }}>{conciergeQ}</div>
                  {conciergeAnswer && (
                    <div style={{ padding: '12px 14px', background: '#0D1620', borderRadius: '10px', fontSize: '13px', color: '#C4D8EA', lineHeight: 1.65 }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <RobotIcon size={24} />
                        <span>{conciergeAnswer}</span>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setConciergeQ(null)} style={{ alignSelf: 'flex-start', padding: '6px 12px', borderRadius: '6px', border: '1px solid #2A3441', background: 'transparent', cursor: 'pointer', color: '#4B6278', fontSize: '12px', fontFamily: "'Inter', system-ui, sans-serif" }}>← Back to questions</button>
                </>
              )}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #1E2E3D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#3D5468' }}>Need more help?</span>
              <button style={{ fontSize: '12px', color: '#39D6C7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Contact M-THRYVE →</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setConciergeOpen(true); setConciergeQ(null) }}
            title="Ask the M-THRYVE AI Concierge"
            style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0D2035', border: '1.5px solid #39D6C7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(57,214,199,0.2)', transition: 'all 0.2s', padding: 0 }}
          >
            <RobotIcon size={40} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: #2A3C4E; }
        input:focus, textarea:focus, select:focus { border-color: #39D6C7 !important; box-shadow: 0 0 0 3px rgba(57,214,199,0.08); }
        select option { background: #111827; color: #E2E8F0; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
      `}</style>
    </div>
  )
}
