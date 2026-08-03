import { useState, type CSSProperties, type ReactNode } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tier = 'template' | 'custom' | 'enterprise' | ''
type StepId =
  | 'intro' | 'client-details' | 'company-assets' | 'build-approach'
  | 'template-select' | 'enterprise-vision' | 'pages-features'
  | 'design' | 'review' | 'payment' | 'final-confirm' | 'build-card'

interface FormData {
  // Client
  fullName: string; company: string; email: string; phone: string
  projectName: string; industry: string; projectType: string; businessDesc: string
  // Company assets
  assetQualification: string
  assetStatuses: Record<string, string>
  selectedAssetServices: string[]
  // Build approach
  tier: Tier
  // Template
  templateCategory: string; templateId: string; projectVersion: string; colorPreset: string
  customSizes: boolean; allSizes: boolean
  // Enterprise vision
  projectVision: string; targetUsers: string; userRoles: string
  businessWorkflows: string; integrations: string; existingSystems: string
  dataSecurityReqs: string; scalabilityReqs: string; designInspiration: string
  competitors: string; successCriteria: string
  // Features
  features: string[]; featurePriorities: Record<string, string>
  customFeatures: string[]
  // Design
  designStyles: string[]; inspirationLink: string
  // Payment
  paymentPlan: string; voucherCode: string; voucherStatus: string
  maintenanceAfterFree: string
  maintenanceEndAcknowledged: boolean
  preferredBillingDate: string
  // Final confirm checkboxes
  confirmAccurate: boolean; confirmReceipt: boolean; confirmPayment: boolean
  confirmMaintenance: boolean; confirmBuildCard: boolean; confirmSubmission: boolean
}

const EMPTY_FORM: FormData = {
  fullName: '', company: '', email: '', phone: '', projectName: '',
  industry: '', projectType: '', businessDesc: '',
  assetQualification: '', assetStatuses: {}, selectedAssetServices: [],
  tier: '',
  templateCategory: '', templateId: '', projectVersion: '', colorPreset: '',
  customSizes: false, allSizes: false,
  projectVision: '', targetUsers: '', userRoles: '', businessWorkflows: '',
  integrations: '', existingSystems: '', dataSecurityReqs: '', scalabilityReqs: '',
  designInspiration: '', competitors: '', successCriteria: '',
  features: [], featurePriorities: {}, customFeatures: [],
  designStyles: [], inspirationLink: '',
  paymentPlan: '', voucherCode: '', voucherStatus: '',
  maintenanceAfterFree: '', maintenanceEndAcknowledged: false, preferredBillingDate: '',
  confirmAccurate: false, confirmReceipt: false, confirmPayment: false,
  confirmMaintenance: false, confirmBuildCard: false, confirmSubmission: false,
}

// ── Flow ───────────────────────────────────────────────────────────────────────

function getFlow(tier: Tier): StepId[] {
  const base: StepId[] = ['intro', 'client-details', 'company-assets', 'build-approach']
  if (!tier) return base
  if (tier === 'template' || tier === 'custom') {
    return [...base, 'template-select', 'pages-features', 'design', 'review', 'payment', 'final-confirm', 'build-card']
  }
  return [...base, 'enterprise-vision', 'pages-features', 'design', 'review', 'payment', 'final-confirm', 'build-card']
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { id: 'website', label: 'Website', icon: '◈' },
  { id: 'webapp', label: 'Web App', icon: '⚡' },
  { id: 'mobile', label: 'Mobile App', icon: '◉' },
  { id: 'ai-agent', label: 'AI Agent', icon: '◆' },
  { id: 'saas', label: 'SaaS', icon: '☁' },
  { id: 'ecommerce', label: 'E-Commerce', icon: '◇' },
  { id: 'internal', label: 'Internal Tool', icon: '⊕' },
  { id: 'custom', label: 'Custom Build', icon: '✦' },
]

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'E-Commerce', 'Education',
  'Real Estate', 'Legal', 'Marketing', 'Logistics', 'Entertainment',
  'Food & Beverage', 'Non-Profit', 'Government', 'Other',
]

const TEMPLATE_CATEGORIES = ['All', 'Business', 'E-Commerce', 'Portfolio', 'Restaurant', 'Real Estate', 'Booking']

interface Template {
  id: string; name: string; category: string; accent: string; bg: string
  pages: string[]; features: string[]; purpose: string
  desktopPrice: number; mobilePrice: number; bothPrice: number
  deliveryDesktop: number; deliveryMobile: number; deliveryBoth: number
}

// NOTE: All prices in PHP. Prototype/demonstration values only.
const TEMPLATES: Template[] = [
  { id: 'apex', name: 'Apex Business', category: 'Business', accent: '#39D6C7', bg: '#0D2035', purpose: 'Professional corporate website', pages: ['Home', 'About', 'Services', 'Contact'], features: ['Contact Form', 'Blog', 'Team Page', 'Newsletter'], desktopPrice: 25000, mobilePrice: 20000, bothPrice: 32000, deliveryDesktop: 7, deliveryMobile: 5, deliveryBoth: 10 },
  { id: 'vertex', name: 'Vertex Pro', category: 'Business', accent: '#7C6FCD', bg: '#1A0F2E', purpose: 'Agency and portfolio showcase', pages: ['Home', 'About', 'Services', 'Portfolio', 'Contact'], features: ['Portfolio Gallery', 'Contact Form', 'Testimonials'], desktopPrice: 28000, mobilePrice: 22000, bothPrice: 36000, deliveryDesktop: 8, deliveryMobile: 6, deliveryBoth: 12 },
  { id: 'meridian', name: 'Meridian', category: 'Business', accent: '#22C55E', bg: '#051A0E', purpose: 'Consulting and service firm', pages: ['Home', 'Services', 'Pricing', 'Contact'], features: ['Pricing Table', 'Lead Form', 'Newsletter', 'FAQ'], desktopPrice: 22000, mobilePrice: 18000, bothPrice: 28000, deliveryDesktop: 6, deliveryMobile: 5, deliveryBoth: 9 },
  { id: 'storex', name: 'StoreX', category: 'E-Commerce', accent: '#F97316', bg: '#1C0800', purpose: 'Full-featured online store', pages: ['Home', 'Shop', 'Product', 'Cart', 'Checkout'], features: ['Product Catalog', 'Shopping Cart', 'Stripe Payments', 'Order Tracking'], desktopPrice: 38000, mobilePrice: 32000, bothPrice: 48000, deliveryDesktop: 10, deliveryMobile: 8, deliveryBoth: 14 },
  { id: 'boutique', name: 'Boutique', category: 'E-Commerce', accent: '#EC4899', bg: '#200A1E', purpose: 'Elegant fashion and lifestyle store', pages: ['Home', 'Collections', 'Product', 'Cart', 'Checkout'], features: ['Collections', 'Wishlist', 'Stripe Payments', 'Reviews'], desktopPrice: 35000, mobilePrice: 30000, bothPrice: 44000, deliveryDesktop: 9, deliveryMobile: 7, deliveryBoth: 13 },
  { id: 'marketpro', name: 'MarketPro', category: 'E-Commerce', accent: '#EAB308', bg: '#1A1200', purpose: 'Multi-category marketplace', pages: ['Home', 'Categories', 'Product', 'Cart', 'Checkout'], features: ['Multi-category', 'Search', 'Payments', 'Promo Codes'], desktopPrice: 40000, mobilePrice: 34000, bothPrice: 50000, deliveryDesktop: 11, deliveryMobile: 9, deliveryBoth: 15 },
  { id: 'folio', name: 'Nexus Portfolio', category: 'Portfolio', accent: '#94A3B8', bg: '#080E16', purpose: 'Minimal creative portfolio', pages: ['Home', 'Work', 'About', 'Contact'], features: ['Project Gallery', 'Case Studies', 'Contact Form'], desktopPrice: 18000, mobilePrice: 15000, bothPrice: 24000, deliveryDesktop: 5, deliveryMobile: 4, deliveryBoth: 7 },
  { id: 'studio', name: 'Studio', category: 'Portfolio', accent: '#F59E0B', bg: '#180E00', purpose: 'Creative studio showcase', pages: ['Home', 'Projects', 'Process', 'Contact'], features: ['Project Gallery', 'Video Reel', 'Client Logos'], desktopPrice: 20000, mobilePrice: 16000, bothPrice: 26000, deliveryDesktop: 6, deliveryMobile: 5, deliveryBoth: 8 },
  { id: 'dine', name: 'Dine', category: 'Restaurant', accent: '#EF4444', bg: '#1A0500', purpose: 'Premium dining experience', pages: ['Home', 'Menu', 'Reservations', 'About', 'Contact'], features: ['Online Menu', 'Table Reservations', 'Hours & Location', 'Gallery'], desktopPrice: 30000, mobilePrice: 25000, bothPrice: 38000, deliveryDesktop: 8, deliveryMobile: 6, deliveryBoth: 11 },
  { id: 'saveur', name: 'Saveur', category: 'Restaurant', accent: '#D97706', bg: '#1A0D00', purpose: 'Restaurant with events and gift cards', pages: ['Home', 'Menu', 'Events', 'Reservations', 'Contact'], features: ['Online Menu', 'Event Booking', 'Gift Cards', 'Newsletter'], desktopPrice: 32000, mobilePrice: 27000, bothPrice: 40000, deliveryDesktop: 9, deliveryMobile: 7, deliveryBoth: 12 },
  { id: 'property', name: 'Property Pro', category: 'Real Estate', accent: '#10B981', bg: '#051A10', purpose: 'Real estate agency listings', pages: ['Home', 'Listings', 'Property Detail', 'About', 'Contact'], features: ['Property Listings', 'Search & Filter', 'Map View', 'Lead Capture'], desktopPrice: 35000, mobilePrice: 29000, bothPrice: 44000, deliveryDesktop: 9, deliveryMobile: 7, deliveryBoth: 13 },
  { id: 'reserve', name: 'Commerce Starter', category: 'Booking', accent: '#0EA5E9', bg: '#021018', purpose: 'Service business booking system', pages: ['Home', 'Services', 'Book', 'Confirmation', 'Contact'], features: ['Online Booking', 'Calendar', 'Service Selection', 'SMS Notifications'], desktopPrice: 38000, mobilePrice: 32000, bothPrice: 48000, deliveryDesktop: 10, deliveryMobile: 8, deliveryBoth: 14 },
]

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

const FEATURE_CHIPS = [
  'Authentication', 'Dashboard', 'Payments', 'AI Chatbot', 'Admin Panel',
  'CMS', 'Booking System', 'Analytics', 'API Integration', 'Notifications',
  'Multi-tenant', 'Real-time Updates', 'Search', 'File Storage', 'Reporting',
  'Workflow Automation', 'User Roles', 'Audit Logs',
]

const FEATURE_PRIORITY_OPTIONS = ['Required', 'Nice to Have', 'Future Phase', 'Need Help Deciding']

const DESIGN_STYLES = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, focused, whitespace-led' },
  { id: 'bold', label: 'Bold & Modern', desc: 'Strong type, high contrast' },
  { id: 'enterprise', label: 'Enterprise', desc: 'Structured, data-dense' },
  { id: 'playful', label: 'Playful', desc: 'Vibrant and expressive' },
  { id: 'dark', label: 'Dark Mode', desc: 'Premium dark interface' },
  { id: 'branded', label: 'Brand-Led', desc: 'Identity-first design' },
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

function calcPrice(template: Template | undefined, version: string) {
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

function makeRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = 'MTH-'
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return ref
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

function UploadZone({ spec, done, onToggle }: { spec: UploadSpec; done: boolean; onToggle: () => void }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#D4E4F0' }}>{spec.label}</span>
        {spec.required && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>Required</span>}
      </div>
      <div style={{ fontSize: '11px', color: '#3D5468', marginBottom: '7px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>
        {spec.count}{spec.dimensions ? ` · ${spec.dimensions}` : ''} · {spec.formats}
      </div>
      <div onClick={onToggle} style={{ border: `1.5px dashed ${done ? '#39D6C7' : '#2A3441'}`, borderRadius: '8px', padding: '12px', cursor: 'pointer', background: done ? 'rgba(57,214,199,0.05)' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: done ? 'rgba(57,214,199,0.15)' : '#0D1620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? '#39D6C7' : '#4B6278', fontSize: '13px', flexShrink: 0 }}>{done ? '✓' : '↑'}</div>
        <span style={{ fontSize: '12px', color: done ? '#39D6C7' : '#4B6278' }}>{done ? 'File uploaded — click to replace' : 'Click to upload or drag and drop'}</span>
      </div>
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
  template: 'Drag & Drop',
  custom: 'Custom Made',
  enterprise: 'Enterprise',
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function App() {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [customInput, setCustomInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [buildRef, setBuildRef] = useState('')
  const [clientVoucher, setClientVoucher] = useState('')
  const [showTierWarning, setShowTierWarning] = useState(false)
  const [pendingTier, setPendingTier] = useState<Tier>('')
  const [templateCatFilter, setTemplateCatFilter] = useState('All')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [pageContents, setPageContents] = useState<Record<string, Record<string, string>>>({})
  const [uploads, setUploads] = useState<Record<string, boolean>>({})
  const [previewVersion, setPreviewVersion] = useState<'desktop' | 'mobile'>('desktop')
  const [copiedRef, setCopiedRef] = useState(false)
  const [copiedVoucher, setCopiedVoucher] = useState(false)
  const [conciergeOpen, setConciergeOpen] = useState(false)
  const [conciergeQ, setConciergeQ] = useState<string | null>(null)
  const [voucherChecking, setVoucherChecking] = useState(false)

  const flow = getFlow(form.tier)
  const currentStep: StepId = (flow[stepIndex] ?? 'intro') as StepId
  const progressTotal = flow.length - 2
  const progressPct = (currentStep === 'intro' || currentStep === 'build-card') ? 0 : Math.min((stepIndex / progressTotal) * 100, 100)

  const set = (field: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleArr = (field: 'features' | 'designStyles', val: string) =>
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(val)
        ? (prev[field] as string[]).filter(v => v !== val)
        : [...(prev[field] as string[]), val],
    }))

  const setPageField = (page: string, fieldId: string, val: string) =>
    setPageContents(prev => ({ ...prev, [page]: { ...(prev[page] ?? {}), [fieldId]: val } }))
  const getPageField = (page: string, fieldId: string) => pageContents[page]?.[fieldId] ?? ''
  const toggleUpload = (key: string) => setUploads(prev => ({ ...prev, [key]: !prev[key] }))

  const assetsBlocked = (form.assetQualification === 'incomplete' || form.assetQualification === 'no-assets')

  const hasTierData = () => !!(form.templateId || form.projectVision || form.features.length > 0)

  const handleTierSelect = (newTier: Tier) => {
    if (assetsBlocked && newTier === 'template') return
    if (form.tier && form.tier !== newTier && hasTierData()) {
      setPendingTier(newTier); setShowTierWarning(true)
    } else {
      set('tier', newTier)
    }
  }

  const confirmTierChange = () => {
    const t = pendingTier
    setForm(prev => ({
      ...prev, tier: t,
      templateId: '', templateCategory: '', projectVersion: '', colorPreset: '',
      projectVision: '', features: [], customFeatures: [], designStyles: [], inspirationLink: '',
      targetUsers: '', userRoles: '', businessWorkflows: '', integrations: '',
      existingSystems: '', dataSecurityReqs: '', scalabilityReqs: '',
    }))
    setPageContents({}); setUploads({}); setCurrentPageIndex(0)
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

  const allConfirmed = form.confirmAccurate && form.confirmReceipt && form.confirmPayment
    && form.confirmMaintenance && form.confirmBuildCard && form.confirmSubmission

  const handleNext = () => {
    if (currentStep === 'build-approach' && !form.tier) return
    if (currentStep === 'company-assets' && !form.assetQualification) return
    if (currentStep === 'payment' && !form.paymentPlan) return
    if (currentStep === 'final-confirm') {
      if (!allConfirmed) return
      setSubmitting(true)
      setTimeout(() => {
        setBuildRef(makeRef())
        setClientVoucher(makeClientVoucher())
        setSubmitting(false)
        setSubmitted(true)
        setStepIndex(flow.indexOf('build-card'))
      }, 2400)
      return
    }
    setStepIndex(i => Math.min(i + 1, flow.length - 1))
  }

  const handleBack = () => setStepIndex(i => Math.max(i - 1, 0))

  const goToStep = (s: StepId) => {
    const idx = flow.indexOf(s)
    if (idx >= 0) setStepIndex(idx)
  }

  const resetAll = () => {
    setForm(EMPTY_FORM); setStepIndex(0); setSubmitting(false); setSubmitted(false)
    setBuildRef(''); setClientVoucher(''); setPageContents({}); setUploads({})
    setCurrentPageIndex(0); setTemplateCatFilter('All')
    setCopiedRef(false); setCopiedVoucher(false)
  }

  const copyToClipboard = (text: string, which: 'ref' | 'voucher') => {
    navigator.clipboard.writeText(text).catch(() => {})
    if (which === 'ref') { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000) }
    else { setCopiedVoucher(true); setTimeout(() => setCopiedVoucher(false), 2000) }
  }

  const selectedTemplate = TEMPLATES.find(t => t.id === form.templateId)
  const pricing = calcPrice(selectedTemplate, form.projectVersion)
  const allFeatures = [...form.features, ...form.customFeatures]
  const complexity = getComplexity(form.features, form.projectType, form.tier)
  const techStack = form.tier !== 'enterprise'
    ? (form.tier === 'custom' ? ['Next.js', 'TypeScript', 'M-THRYVE CMS', 'Vercel'] : ['HTML/CSS', 'M-THRYVE CMS', 'Image CDN', 'Netlify'])
    : getTechStack(form.projectType, form.features)
  const team = getTeam(form.projectType, form.features, form.tier)
  const maintenanceRate = getMaintenanceRate(form.tier)
  const maintenanceAnnual = maintenanceRate * 12

  const filteredTemplates = templateCatFilter === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === templateCatFilter)
  const templatePages = selectedTemplate?.pages ?? []
  const currentPageName = templatePages[currentPageIndex] ?? ''
  const pageDef = getPageDef(currentPageName)

  const canContinue = !(
    (currentStep === 'build-approach' && !form.tier) ||
    (currentStep === 'company-assets' && !form.assetQualification) ||
    (currentStep === 'payment' && !form.paymentPlan) ||
    (currentStep === 'final-confirm' && !allConfirmed) ||
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
          <div style={{ ...monoLabel, margin: 0, fontSize: '11px' }}>Step {stepIndex} of {progressTotal}</div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {currentStep !== 'intro' && currentStep !== 'build-card' && (
        <div style={{ height: '2px', background: '#161F2B' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: '#39D6C7', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ maxWidth: currentStep === 'build-card' ? '860px' : '680px', margin: '0 auto', padding: '52px 28px 160px', transition: 'max-width 0.3s' }}>

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
              tag="Step 1 — Client & Project Details"
              title="Who are we building for?"
              desc="Your contact details and project basics help us personalize your Build Card and connect you with the right team. All information stays private within M-THRYVE."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Full Name"><input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Alex Johnson" style={inputStyle} /></Field>
                <Field label="Company or Organization Name"><input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp" style={inputStyle} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Business Email"><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="alex@acmecorp.com" type="email" style={inputStyle} /></Field>
                <Field label="Contact Number"><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+63 917 000 0000" type="tel" style={inputStyle} /></Field>
              </div>
              <Field label="Project Name" hint="A working name for your project. You can refine this before launch.">
                <input value={form.projectName} onChange={e => set('projectName', e.target.value)} placeholder="e.g. Acme Client Portal" style={inputStyle} />
              </Field>
              <div>
                <div style={labelStyle}>Project Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {PROJECT_TYPES.map(type => {
                    const sel = form.projectType === type.id
                    return (
                      <button key={type.id} onClick={() => set('projectType', type.id)} style={{ padding: '14px 8px', borderRadius: '10px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.07)' : '#111827', cursor: 'pointer', color: sel ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: sel ? 600 : 400, textAlign: 'center', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{type.icon}</span>{type.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Field label="Industry">
                <select value={form.industry} onChange={e => set('industry', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Brief Business Description" hint="A sentence or two describing what your business does and who it serves.">
                <textarea value={form.businessDesc} onChange={e => set('businessDesc', e.target.value)} placeholder="e.g. We are a logistics company helping SMEs across Metro Manila track and manage their deliveries in real time..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
              </Field>
            </div>
          </div>
        )}

        {/* ══ COMPANY ASSETS QUESTIONNAIRE ══ */}
        {currentStep === 'company-assets' && (
          <div>
            <StepHeader
              tag="Step 2 — Company Assets"
              title="Check your company assets."
              desc="Your build may require brand files, written content, images, and company information. Tell us what is already available so we can guide you to the right build option."
            />
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
              tag="Step 3 — Choose Build Approach"
              title="How would you like to build?"
              desc="Select the approach that best fits your project, budget, and timeline. Each tier has different levels of customization, required assets, and investment."
            />
            {assetsBlocked && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#EF4444', lineHeight: 1.6 }}>
                Drag & Drop requires complete brand assets and prepared content. Based on your asset status, this tier is currently unavailable. Consider upgrading your assets first or choosing Custom Made or Enterprise.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  id: 'template' as Tier,
                  name: 'Drag & Drop',
                  badge: 'Most Affordable',
                  badgeColor: '#22C55E',
                  desc: 'Choose a ready-made M-THRYVE template with fixed structure and content areas. Add your prepared brand assets and content without layout or feature customization.',
                  price: '₱15,000–₱40,000',
                  priceNote: 'Configured template price',
                  bullets: ['Fixed template structure', 'Complete assets required', 'No custom features', 'Fastest delivery'],
                  disabled: assetsBlocked,
                },
                {
                  id: 'custom' as Tier,
                  name: 'Custom Made',
                  badge: 'Limited Customization',
                  badgeColor: '#39D6C7',
                  desc: 'Start with an M-THRYVE template and make limited approved changes to its content, branding, colors, and selected components while preserving its core structure.',
                  price: '₱50,000–₱150,000',
                  priceNote: 'Based on template and selected modifications',
                  bullets: ['Template foundation', 'Branding & layout changes', 'Predefined feature set', 'Moderate delivery'],
                  disabled: false,
                },
                {
                  id: 'enterprise' as Tier,
                  name: 'Enterprise',
                  badge: 'Fully Custom',
                  badgeColor: '#8B5CF6',
                  desc: 'A fully custom product designed and built from scratch around your vision, workflows, users, integrations, and business requirements.',
                  price: 'Starting at ₱200,000',
                  priceNote: 'Confirmed after owner review and intake analysis',
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
          </div>
        )}

        {/* ══ TEMPLATE SELECTION ══ */}
        {currentStep === 'template-select' && (
          <div>
            <StepHeader
              tag={form.tier === 'custom' ? 'Step 4 — Base Template' : 'Step 4 — Template Selection'}
              title="Choose your starting point."
              desc={form.tier === 'custom'
                ? 'Select the template that best reflects the direction of your project. We will customize it for your brand in the next steps.'
                : 'Each template is a complete website or app structure. Your content, brand, and assets replace everything inside.'}
            />
            {form.tier === 'template' && (
              <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#F97316', lineHeight: 1.5 }}>
                Drag & Drop: structural customization is not available. Select Custom Made if you need layout or branding modifications beyond content replacement.
              </div>
            )}
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setTemplateCatFilter(cat)} style={{ padding: '6px 14px', borderRadius: '100px', border: `1px solid ${templateCatFilter === cat ? '#39D6C7' : '#2A3441'}`, background: templateCatFilter === cat ? 'rgba(57,214,199,0.09)' : 'transparent', cursor: 'pointer', color: templateCatFilter === cat ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: templateCatFilter === cat ? 600 : 400, transition: 'all 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }}>{cat}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
              {filteredTemplates.map(t => {
                const sel = form.templateId === t.id
                return (
                  <button key={t.id} onClick={() => { set('templateId', t.id); set('templateCategory', t.category); setCurrentPageIndex(0) }} style={{ borderRadius: '10px', border: `1.5px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.06)' : '#111827', cursor: 'pointer', padding: 0, overflow: 'hidden', textAlign: 'left', transition: 'all 0.15s' }}>
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

            {selectedTemplate && (
              <div>
                <div style={{ height: '1px', background: '#1E2E3D', marginBottom: '24px' }} />

                <div style={{ marginBottom: '20px' }}>
                  <div style={labelStyle}>Choose Your Platform</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[['desktop', 'Website'], ['mobile', 'Mobile App'], ['both', 'Website + Mobile App']].map(([v, label]) => (
                      <button key={v} onClick={() => set('projectVersion', v)} style={versionBtn(v)}>{label}</button>
                    ))}
                  </div>

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
                  {pageDef.uploads.map(u => <UploadZone key={`${currentPageName}-${u.id}`} spec={u} done={!!uploads[`${currentPageName}-${u.id}`]} onToggle={() => toggleUpload(`${currentPageName}-${u.id}`)} />)}
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
          </div>
        )}

        {/* ══ ENTERPRISE VISION ══ */}
        {currentStep === 'enterprise-vision' && (
          <div>
            <StepHeader
              tag="Step 4 — Enterprise Vision"
              title="Tell us what you're building."
              desc="Enterprise projects are designed from scratch. The more detail you provide, the more accurate your preliminary Build Card will be — and the smoother your owner review will go."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Product Vision" hint="What are you building and why? What problem does it solve?">
                <textarea value={form.projectVision} onChange={e => set('projectVision', e.target.value)} placeholder="We are building a platform that helps logistics companies track shipments in real time. Our target users are operations managers who need instant visibility into delivery status and exception handling..." rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Target Users"><input value={form.targetUsers} onChange={e => set('targetUsers', e.target.value)} placeholder="e.g. Operations managers, field technicians" style={inputStyle} /></Field>
                <Field label="User Roles"><input value={form.userRoles} onChange={e => set('userRoles', e.target.value)} placeholder="e.g. Admin, Manager, Viewer, Agent" style={inputStyle} /></Field>
              </div>
              <Field label="Key Business Workflows">
                <textarea value={form.businessWorkflows} onChange={e => set('businessWorkflows', e.target.value)} placeholder="Walk us through how a user would accomplish the most important task in the system..." rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Required Integrations"><input value={form.integrations} onChange={e => set('integrations', e.target.value)} placeholder="e.g. Salesforce, QuickBooks, Twilio" style={inputStyle} /></Field>
                <Field label="Existing Systems to Connect"><input value={form.existingSystems} onChange={e => set('existingSystems', e.target.value)} placeholder="e.g. SAP ERP, legacy SQL database" style={inputStyle} /></Field>
              </div>
              <Field label="Data & Security Requirements">
                <textarea value={form.dataSecurityReqs} onChange={e => set('dataSecurityReqs', e.target.value)} placeholder="SOC 2, HIPAA, GDPR compliance, SSO, end-to-end encryption, data residency requirements..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Scalability Requirements"><input value={form.scalabilityReqs} onChange={e => set('scalabilityReqs', e.target.value)} placeholder="e.g. 10,000 DAU, 1M records, multi-region" style={inputStyle} /></Field>
                <Field label="Design Inspiration"><input value={form.designInspiration} onChange={e => set('designInspiration', e.target.value)} placeholder="URLs or Figma references" style={inputStyle} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Comparable Products"><input value={form.competitors} onChange={e => set('competitors', e.target.value)} placeholder="e.g. Linear, Notion, Airtable" style={inputStyle} /></Field>
                <Field label="Success Criteria"><input value={form.successCriteria} onChange={e => set('successCriteria', e.target.value)} placeholder="e.g. 1,000 active users in 3 months" style={inputStyle} /></Field>
              </div>
            </div>
          </div>
        )}

        {/* ══ PAGES, FEATURES & CONTENT ══ */}
        {currentStep === 'pages-features' && (
          <div>
            <StepHeader
              tag="Step 5 — Features & Requirements"
              title="What should your software do?"
              desc="Select the features and capabilities your project needs. Mark each by priority so we know what matters most at launch."
            />
            {form.tier === 'template' && (
              <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#F97316' }}>
                Drag & Drop includes fixed template features only. Requests outside this scope will be flagged for Custom Made or Enterprise.
              </div>
            )}
            {form.tier === 'custom' && (
              <div style={{ padding: '12px 16px', background: 'rgba(57,214,199,0.04)', border: '1px solid rgba(57,214,199,0.15)', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#39D6C7' }}>
                Custom Made supports limited predefined feature adjustments. Requests exceeding this scope will be flagged and may recommend an Enterprise upgrade.
              </div>
            )}

            <div style={{ ...monoLabel, marginBottom: '12px' }}>Select Features</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '20px' }}>
              {FEATURE_CHIPS.map(f => {
                const sel = form.features.includes(f)
                return (
                  <button key={f} onClick={() => toggleArr('features', f)} style={{ padding: '7px 13px', borderRadius: '100px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.09)' : '#111827', cursor: 'pointer', color: sel ? '#39D6C7' : '#4B6278', fontSize: '13px', fontWeight: sel ? 500 : 400, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {sel && <span style={{ fontSize: '9px', fontWeight: 700 }}>✓</span>}{f}
                  </button>
                )
              })}
            </div>

            {form.features.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ ...monoLabel, marginBottom: '12px' }}>Set Priorities</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.features.map(f => {
                    const priority = form.featurePriorities[f] || ''
                    return (
                      <div key={f} style={{ padding: '12px 14px', background: '#111827', border: '1px solid #2A3441', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#D4E4F0' }}>{f}</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {FEATURE_PRIORITY_OPTIONS.map(opt => (
                            <button key={opt} onClick={() => set('featurePriorities', { ...form.featurePriorities, [f]: opt })} style={{ padding: '3px 9px', borderRadius: '100px', border: `1px solid ${priority === opt ? '#39D6C7' : '#2A3441'}`, background: priority === opt ? 'rgba(57,214,199,0.1)' : 'transparent', color: priority === opt ? '#39D6C7' : '#4B6278', fontSize: '11px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.12s', whiteSpace: 'nowrap' }}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {form.tier === 'enterprise' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ ...monoLabel, marginBottom: '10px' }}>Custom Features</div>
                {form.customFeatures.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
                    {form.customFeatures.map((f, i) => (
                      <div key={i} style={{ padding: '7px 13px', borderRadius: '100px', border: '1px solid #39D6C7', background: 'rgba(57,214,199,0.09)', color: '#39D6C7', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {f}<button onClick={() => setForm(prev => ({ ...prev, customFeatures: prev.customFeatures.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39D6C7', padding: 0, fontSize: '16px', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { setForm(prev => ({ ...prev, customFeatures: [...prev.customFeatures, customInput.trim()] })); setCustomInput('') } }} placeholder="Describe a custom feature..." style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => { if (customInput.trim()) { setForm(prev => ({ ...prev, customFeatures: [...prev.customFeatures, customInput.trim()] })); setCustomInput('') } }} style={{ padding: '0 18px', borderRadius: '8px', border: '1px solid #2A3441', background: '#111827', cursor: 'pointer', color: '#E2E8F0', fontSize: '13px', fontFamily: "'Inter', system-ui, sans-serif" }}>Add</button>
                </div>
              </div>
            )}

            {allFeatures.length > 0 && (
              <div style={{ padding: '10px 16px', background: 'rgba(57,214,199,0.05)', border: '1px solid rgba(57,214,199,0.18)', borderRadius: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#39D6C7' }}>
                {allFeatures.length} feature{allFeatures.length !== 1 ? 's' : ''} selected — these will appear in your preliminary Build Card
              </div>
            )}
          </div>
        )}

        {/* ══ DESIGN ══ */}
        {currentStep === 'design' && (
          <div>
            <StepHeader tag="Step 6 — Design Preferences" title="How should it feel?" desc="These selections guide our designers on the visual direction for your project. Choose everything that resonates — you can refine these during the build." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {DESIGN_STYLES.map(s => {
                const sel = form.designStyles.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleArr('designStyles', s.id)} style={{ padding: '20px 16px', borderRadius: '12px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.06)' : '#111827', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: sel ? '#39D6C7' : 'transparent', border: sel ? 'none' : '1px solid #2A3441', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#060C10', fontWeight: 800 }}>{sel ? '✓' : ''}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: sel ? '#39D6C7' : '#D4E4F0', marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: '12px', color: '#3D5468' }}>{s.desc}</div>
                  </button>
                )
              })}
            </div>
            <Field label="Inspiration References" hint="Links to Figma files, competitor websites, or screenshots that capture the look and feel you're going for.">
              <input value={form.inspirationLink} onChange={e => set('inspirationLink', e.target.value)} placeholder="figma.com/file/... or https://example.com" style={inputStyle} />
            </Field>
          </div>
        )}

        {/* ══ PROJECT REVIEW ══ */}
        {currentStep === 'review' && (
          <div>
            <StepHeader tag="Step 7 — Project Review" title="Review your project." desc="Take a moment to confirm everything looks right. Each section has an Edit link if you need to make changes. This review is based on your selected options so far." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ReviewBlock title="Client & Contact" onEdit={() => goToStep('client-details')}>
                <ReviewRow label="Name" value={form.fullName || '—'} />
                <ReviewRow label="Company" value={form.company || '—'} />
                <ReviewRow label="Email" value={form.email || '—'} />
                <ReviewRow label="Project Name" value={form.projectName || '—'} />
                {form.industry && <ReviewRow label="Industry" value={form.industry} />}
              </ReviewBlock>

              <ReviewBlock title="Asset Readiness" onEdit={() => goToStep('company-assets')}>
                <ReviewRow label="Status" value={{ 'provided': 'Already provided during discovery', 'ready': 'Available — not yet uploaded', 'incomplete': 'Partially available', 'no-assets': 'Needs asset creation' }[form.assetQualification] || '—'} />
                {form.selectedAssetServices.length > 0 && <ReviewRow label="Asset Services" value={`${form.selectedAssetServices.length} service(s) selected`} />}
              </ReviewBlock>

              <ReviewBlock title="Build Approach" onEdit={() => goToStep('build-approach')}>
                <ReviewRow label="Tier" value={TIER_LABELS[form.tier] || '—'} />
                {selectedTemplate && <ReviewRow label="Template" value={selectedTemplate.name} />}
                {form.projectVersion && <ReviewRow label="Platform" value={pricing.versionLabel} />}
                {form.colorPreset && <ReviewRow label="Color Style" value={COLOR_OPTIONS.find(c => c.id === form.colorPreset)?.name || '—'} />}
                {form.projectType && <ReviewRow label="Project Type" value={PROJECT_TYPES.find(t => t.id === form.projectType)?.label || '—'} />}
              </ReviewBlock>

              {allFeatures.length > 0 && (
                <ReviewBlock title={`Features · ${allFeatures.length}`} onEdit={() => goToStep('pages-features')}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {allFeatures.map(f => <span key={f} style={{ padding: '3px 9px', borderRadius: '100px', background: 'rgba(57,214,199,0.06)', border: '1px solid rgba(57,214,199,0.2)', fontSize: '11px', color: '#39D6C7' }}>{f}</span>)}
                  </div>
                </ReviewBlock>
              )}

              {(form.tier === 'template' || form.tier === 'custom') && selectedTemplate && form.projectVersion && (
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

        {/* ══ PAYMENT PLAN ══ */}
        {currentStep === 'payment' && (
          <div>
            <StepHeader
              tag="Step 8 — Payment Plan"
              title="Choose your payment plan."
              desc="Choose your preferred payment arrangement. Pricing, billing dates, maintenance coverage, and the final agreement remain subject to M-THRYVE owner review."
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                {
                  id: 'one-time',
                  icon: '◆',
                  label: 'One-Time Payment',
                  desc: 'Pay the full preliminary project price in a single payment. Includes three months of standard maintenance at no additional cost from your approved launch date.',
                  tag: '3 Months Maintenance Included — Free',
                  tagColor: '#22C55E',
                  amount: pricing.total > 0 ? formatPhp(pricing.total) : 'Price pending review',
                  period: 'one-time',
                },
                {
                  id: 'monthly',
                  icon: '◈',
                  label: 'Monthly Payments',
                  desc: 'Spread your project investment across 12 equal monthly installments. Monthly maintenance is mandatory and included in your combined monthly amount.',
                  tag: 'Monthly Maintenance — Required',
                  tagColor: '#F59E0B',
                  amount: pricing.total > 0 ? formatPhp(Math.round(pricing.total / 12)) : 'Price pending review',
                  period: '/month (project) + maintenance',
                },
                {
                  id: 'annual',
                  icon: '⊕',
                  label: 'Annual Payment',
                  desc: 'One annual project payment covering the full project amount, with annual maintenance required and billed together.',
                  tag: 'Annual Maintenance — Required',
                  tagColor: '#8B5CF6',
                  amount: pricing.total > 0 ? formatPhp(pricing.total) : 'Price pending review',
                  period: '/year (project) + maintenance',
                },
              ].map(plan => {
                const sel = form.paymentPlan === plan.id
                return (
                  <button key={plan.id} onClick={() => { set('paymentPlan', plan.id); set('maintenanceAfterFree', ''); set('maintenanceEndAcknowledged', false) }} style={{ padding: '18px 20px', borderRadius: '12px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.05)' : '#111827', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: sel ? 'rgba(57,214,199,0.15)' : '#0D1620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? '#39D6C7' : '#4B6278', fontSize: '14px', flexShrink: 0, transition: 'all 0.15s' }}>{plan.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: sel ? '#39D6C7' : '#D4E4F0', marginBottom: '4px' }}>{plan.label}</div>
                          <div style={{ fontSize: '12px', color: '#4B6278', lineHeight: 1.55, marginBottom: '8px' }}>{plan.desc}</div>
                          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '100px', background: `${plan.tagColor}12`, border: `1px solid ${plan.tagColor}30`, color: plan.tagColor }}>{plan.tag}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fontWeight: 700, color: sel ? '#39D6C7' : '#6B8099' }}>{plan.amount}</div>
                        <div style={{ fontSize: '10px', color: '#3D5468', marginTop: '2px' }}>{plan.period}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {form.paymentPlan === 'one-time' && (
              <div style={{ padding: '20px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#22C55E', marginBottom: '4px' }}>3 Months of Maintenance Included — Free</div>
                  <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.6 }}>Your one-time payment includes three months of standard maintenance beginning from your approved launch or handover date.</div>
                  <div style={{ fontSize: '12px', color: '#3D5468', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>₱0 for the first 3 months</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#D4E4F0', marginBottom: '8px' }}>After the free three-month period, would you like to continue maintenance?</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {[{ id: 'end', label: 'End after 3 months' }, { id: 'monthly', label: 'Continue monthly' }, { id: 'annual', label: 'Continue annually' }].map(opt => {
                    const sel = form.maintenanceAfterFree === opt.id
                    return <button key={opt.id} onClick={() => { set('maintenanceAfterFree', opt.id); set('maintenanceEndAcknowledged', false) }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${sel ? '#39D6C7' : '#2A3441'}`, background: sel ? 'rgba(57,214,199,0.08)' : 'transparent', cursor: 'pointer', color: sel ? '#39D6C7' : '#4B6278', fontSize: '12px', fontWeight: sel ? 600 : 400, transition: 'all 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }}>{opt.label}</button>
                  })}
                </div>
                {form.maintenanceAfterFree === 'end' && (
                  <div>
                    <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#F97316', lineHeight: 1.6 }}>
                      Without a continuing maintenance plan, ongoing monitoring, routine updates, backups, support, compatibility maintenance, and non-warranty changes will not be included after the free period ends.
                    </div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.maintenanceEndAcknowledged} onChange={e => set('maintenanceEndAcknowledged', e.target.checked)} style={{ marginTop: '2px', accentColor: '#39D6C7', width: '15px', height: '15px', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#4B6278', lineHeight: 1.6 }}>I understand that after the complimentary three-month maintenance period ends, ongoing monitoring, routine updates, backups, and support will not be included unless I purchase another maintenance plan.</span>
                    </label>
                  </div>
                )}
                {(form.maintenanceAfterFree === 'monthly' || form.maintenanceAfterFree === 'annual') && (
                  <div style={{ padding: '12px 14px', background: '#111827', borderRadius: '8px', border: '1px solid #2A3441', fontSize: '12px', color: '#4B6278', lineHeight: 1.6 }}>
                    {formatPhp(form.maintenanceAfterFree === 'annual' ? maintenanceAnnual : maintenanceRate)}{form.maintenanceAfterFree === 'annual' ? '/year' : '/month'} maintenance · Coverage begins after the three-month free period. Final rate confirmed in owner agreement.
                  </div>
                )}
              </div>
            )}

            {(form.paymentPlan === 'monthly' || form.paymentPlan === 'annual') && (
              <div style={{ padding: '18px 20px', background: '#0D1620', border: '1px solid rgba(57,214,199,0.15)', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#D4E4F0', marginBottom: '10px' }}>{form.paymentPlan === 'annual' ? 'Annual' : 'Monthly'} Maintenance — Included</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '14px' }}>
                  {['Routine dependency updates', 'Security patches', 'Availability monitoring', 'Error monitoring', 'Scheduled backups', 'Basic technical support', 'Compatibility adjustments', 'Deployment monitoring', 'Recovery assistance', 'Maintenance reporting'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12px', color: '#6B8099' }}>
                      <span style={{ color: '#39D6C7', flexShrink: 0 }}>✓</span>{item}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '12px 14px', background: '#111827', borderRadius: '8px', border: '1px solid #2A3441' }}>
                  <ReviewRow label={`${form.paymentPlan === 'annual' ? 'Annual' : 'Monthly'} maintenance rate`} value={form.paymentPlan === 'annual' ? `${formatPhp(maintenanceAnnual)}/year` : `${formatPhp(maintenanceRate)}/month`} />
                  {form.paymentPlan === 'annual' && <ReviewRow label="Effective monthly equivalent" value={formatPhp(maintenanceRate)} />}
                  <div style={{ fontSize: '11px', color: '#3D5468', marginTop: '6px', lineHeight: 1.5 }}>Does not include major new features, redesigns, new integrations, or large content migrations. Coverage defined in the final approved agreement.</div>
                </div>
              </div>
            )}

            {form.paymentPlan && (
              <div style={{ marginBottom: '20px' }}>
                <Field label="Preferred First Billing Date" hint="Billing begins only after the owner approves your project and a final agreement is signed.">
                  <input value={form.preferredBillingDate} onChange={e => set('preferredBillingDate', e.target.value)} type="date" style={inputStyle} />
                </Field>
              </div>
            )}

            <div style={{ padding: '18px 20px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ ...monoLabel, marginBottom: '10px' }}>Referral Voucher Code (Optional)</div>
              <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.55, marginBottom: '14px' }}>Received a referral voucher from an M-THRYVE client? Enter it here to redeem the verified percentage discount available for your build purchase.</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input value={form.voucherCode} onChange={e => { set('voucherCode', e.target.value.toUpperCase()); set('voucherStatus', '') }} placeholder="Enter your voucher code" style={{ ...inputStyle, flex: 1, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }} />
                <button onClick={applyVoucher} disabled={voucherChecking || !form.voucherCode.trim()} style={{ padding: '0 18px', borderRadius: '8px', border: 'none', background: form.voucherCode.trim() && !voucherChecking ? '#39D6C7' : '#1A2E3A', cursor: form.voucherCode.trim() && !voucherChecking ? 'pointer' : 'not-allowed', color: form.voucherCode.trim() && !voucherChecking ? '#060C10' : '#2A4455', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s' }}>
                  {voucherChecking ? 'Checking…' : 'Apply Voucher'}
                </button>
              </div>
              {form.voucherStatus === 'valid' && (
                <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', fontSize: '13px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span> Voucher applied — discount pending verification. Final discount confirmed by the owner.
                </div>
              )}
              {form.voucherStatus === 'invalid' && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#EF4444' }}>
                  This voucher code was not recognized. Check the code and try again.
                </div>
              )}
            </div>

            {!form.paymentPlan && <div style={{ fontSize: '12px', color: '#3D5468' }}>Please select a payment plan to continue.</div>}
          </div>
        )}

        {/* ══ FINAL CONFIRMATION ══ */}
        {currentStep === 'final-confirm' && (
          <div>
            <StepHeader tag="Step 9 — Final Confirmation" title="Almost there." desc="Review your preliminary project receipt one last time and confirm the details below before submitting your intake." />

            <div style={{ ...cardStyle, marginBottom: '16px', border: '1px solid rgba(57,214,199,0.2)' }}>
              <div style={{ ...monoLabel, color: '#39D6C7' }}>Preliminary Project Receipt</div>
              <ReviewRow label="Tier" value={TIER_LABELS[form.tier] || '—'} />
              {selectedTemplate && <ReviewRow label="Template" value={selectedTemplate.name} />}
              {form.projectVersion && <ReviewRow label="Platform" value={pricing.versionLabel} />}
              {form.colorPreset && <ReviewRow label="Color Style" value={`${COLOR_OPTIONS.find(c => c.id === form.colorPreset)?.name || '—'} — Included`} />}
              {form.customSizes && <ReviewRow label="Custom Sizes add-on" value="Price pending configuration" />}
              {form.allSizes && <ReviewRow label="All Sizes add-on" value="Price pending configuration" />}
              {form.selectedAssetServices.length > 0 && <ReviewRow label="Asset services" value={`${form.selectedAssetServices.length} service(s) — Price pending configuration`} />}
              {form.voucherStatus === 'valid' && <ReviewRow label={`Voucher (${form.voucherCode})`} value="Discount pending verification" />}
              {pricing.total > 0 && (
                <>
                  <div style={{ height: '1px', background: '#2A3441', margin: '12px 0' }} />
                  <ReviewRow label="Project subtotal" value={formatPhp(pricing.total)} bold />
                </>
              )}
              {form.paymentPlan === 'one-time' && <ReviewRow label="Included maintenance" value="3 months free — ₱0" />}
              {form.paymentPlan === 'monthly' && <ReviewRow label="Monthly maintenance" value={`${formatPhp(maintenanceRate)}/month`} />}
              {form.paymentPlan === 'annual' && <ReviewRow label="Annual maintenance" value={`${formatPhp(maintenanceAnnual)}/year`} />}
              <div style={{ height: '1px', background: '#2A3441', margin: '12px 0' }} />
              <ReviewRow label="Payment plan" value={{ 'one-time': 'One-Time Payment', 'monthly': 'Monthly Payments', 'annual': 'Annual Payment' }[form.paymentPlan] || '—'} bold />
              {form.preferredBillingDate && <ReviewRow label="Preferred first billing date" value={new Date(form.preferredBillingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />}
              {pricing.total > 0 && <ReviewRow label="Est. completion" value={`${pricing.delivery} working days from approval`} />}
              <div style={{ marginTop: '12px', padding: '12px 14px', background: '#0D1620', border: '1px solid #1E2E3D', borderRadius: '8px', fontSize: '12px', color: '#3D5468', lineHeight: 1.6 }}>
                This receipt, payment arrangement, timeline, and Build Card are preliminary and subject to M-THRYVE owner review and final approval. Submission does not automatically start development or authorize an immediate charge.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { field: 'confirmAccurate' as const, text: 'I confirm my project information is accurate to the best of my knowledge.' },
                { field: 'confirmReceipt' as const, text: 'I have reviewed the preliminary project receipt shown above.' },
                { field: 'confirmPayment' as const, text: 'I have reviewed and understand my selected payment arrangement.' },
                { field: 'confirmMaintenance' as const, text: 'I understand the applicable maintenance coverage and its limitations.' },
                { field: 'confirmBuildCard' as const, text: 'I understand that the preliminary Build Card is subject to M-THRYVE owner review and final approval.' },
                { field: 'confirmSubmission' as const, text: 'I understand that submitting this intake does not automatically start development or trigger any payment.' },
              ].map(item => (
                <label key={item.field} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px 14px', background: '#111827', border: `1px solid ${form[item.field] ? '#39D6C740' : '#2A3441'}`, borderRadius: '8px', transition: 'border-color 0.15s' }}>
                  <input type="checkbox" checked={form[item.field]} onChange={e => set(item.field, e.target.checked)} style={{ marginTop: '2px', accentColor: '#39D6C7', width: '15px', height: '15px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: form[item.field] ? '#C4D8EA' : '#4B6278', lineHeight: 1.6, transition: 'color 0.15s' }}>{item.text}</span>
                </label>
              ))}
            </div>

            {!allConfirmed && <div style={{ fontSize: '12px', color: '#3D5468', marginBottom: '8px' }}>Please confirm all items above to submit your intake.</div>}

            {submitting && (
              <div style={{ padding: '18px', background: '#0D1620', border: '1px solid rgba(57,214,199,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid #1A2535', borderTop: '2px solid #39D6C7', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#39D6C7' }}>Creating your secure Build Reference and preliminary Build Card…</span>
              </div>
            )}
          </div>
        )}

        {/* ══ SUBMITTED BUILD CARD ══ */}
        {currentStep === 'build-card' && submitted && (
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

              {allFeatures.length > 0 && (
                <div style={{ padding: '14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D', marginBottom: '10px' }}>
                  <div style={{ ...monoLabel, marginBottom: '8px', fontSize: '9px' }}>Identified Features · {allFeatures.length}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {allFeatures.map(f => <span key={f} style={{ padding: '3px 9px', borderRadius: '100px', background: 'rgba(57,214,199,0.06)', border: '1px solid rgba(57,214,199,0.18)', fontSize: '11px', color: '#39D6C7' }}>{f}</span>)}
                  </div>
                </div>
              )}

              <div style={{ padding: '12px 14px', background: '#0D1620', borderRadius: '8px', border: '1px solid #1E2E3D' }}>
                <ReviewRow label="Payment plan" value={{ 'one-time': 'One-Time Payment', 'monthly': 'Monthly Payments', 'annual': 'Annual Payment' }[form.paymentPlan] || '—'} />
                {form.paymentPlan === 'monthly' && <ReviewRow label="Monthly maintenance" value={`${formatPhp(maintenanceRate)}/month — Required`} />}
                {form.paymentPlan === 'annual' && <ReviewRow label="Annual maintenance" value={`${formatPhp(maintenanceAnnual)}/year — Required`} />}
                {form.paymentPlan === 'one-time' && <ReviewRow label="Free maintenance" value="3 months from launch" />}
                {form.voucherStatus === 'valid' && <ReviewRow label={`Applied voucher (${form.voucherCode})`} value="Discount pending verification" />}
                {form.preferredBillingDate && <ReviewRow label="Preferred billing date" value={new Date(form.preferredBillingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />}
                <ReviewRow label="Submission date" value={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                <ReviewRow label="Status" value="Waiting for Owner Review" bold />
              </div>
            </div>

            {/* Generated client referral voucher */}
            <div style={{ ...cardStyle, border: '1px solid rgba(245,158,11,0.25)', marginBottom: '12px' }}>
              <div style={{ ...monoLabel, color: '#F59E0B' }}>Your M-THRYVE Referral Voucher</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em' }}>{clientVoucher}</div>
                <button onClick={() => copyToClipboard(clientVoucher, 'voucher')} style={{ padding: '8px 14px', borderRadius: '7px', border: '1px solid rgba(245,158,11,0.3)', background: copiedVoucher ? 'rgba(245,158,11,0.15)' : 'transparent', cursor: 'pointer', color: copiedVoucher ? '#F59E0B' : '#6B8099', fontSize: '12px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s' }}>
                  {copiedVoucher ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ padding: '3px 10px', borderRadius: '100px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '11px', color: '#F59E0B' }}>New · 0 referrals</span>
              </div>
              <div style={{ fontSize: '13px', color: '#4B6278', lineHeight: 1.65, marginBottom: '12px' }}>Share this voucher with someone who wants to build with M-THRYVE. When an eligible referral successfully completes the required referral conditions, you can earn a configured percentage discount toward your qualifying build payment.</div>
              <div style={{ fontSize: '11px', color: '#3D5468', lineHeight: 1.6, marginBottom: '14px' }}>Sharing a code does not immediately create a discount. Referral eligibility must be verified by M-THRYVE. A voucher cannot be self-redeemed. Reward eligibility remains subject to M-THRYVE terms.</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Copy Code', action: () => copyToClipboard(clientVoucher, 'voucher') },
                  { label: 'Copy Message', action: () => copyToClipboard(`I am building with M-THRYVE. Use my referral voucher ${clientVoucher} when selecting your payment plan to receive the eligible referral benefit.`, 'voucher') },
                  { label: 'Share via Email', action: () => {} },
                  { label: 'Copy Referral Link', action: () => {} },
                ].map(s => (
                  <button key={s.label} onClick={s.action} style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid rgba(245,158,11,0.2)', background: 'transparent', cursor: 'pointer', color: '#6B8099', fontSize: '12px', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s' }}>{s.label}</button>
                ))}
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
        {!submitting && (
          <div style={{ display: 'flex', justifyContent: currentStep === 'intro' ? 'flex-end' : 'space-between', alignItems: 'center', marginTop: '48px' }}>
            {currentStep !== 'intro' && currentStep !== 'build-card' && (
              <button onClick={handleBack} style={ghostBtn}>← Back</button>
            )}
            {currentStep === 'build-card' && (
              <button onClick={resetAll} style={ghostBtn}>← Start New Intake</button>
            )}
            {currentStep !== 'build-card' && (
              <button onClick={handleNext} style={primaryBtn} disabled={!canContinue}>
                {currentStep === 'intro' ? 'Start Project Intake →'
                  : currentStep === 'review' ? 'Continue to Payment →'
                    : currentStep === 'payment' ? 'Review Final Summary →'
                      : currentStep === 'final-confirm' ? 'Submit Intake for Analysis →'
                        : 'Continue →'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ TIER CHANGE WARNING ══ */}
      {showTierWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,16,0.92)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#111827', border: '1px solid #2A3441', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '28px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#F0F6FF', marginBottom: '10px' }}>Switch build tier?</div>
            <div style={{ fontSize: '14px', color: '#4B6278', lineHeight: 1.65, marginBottom: '20px' }}>
              Switching tiers will clear your template selection, project vision, features, and design preferences. Your contact details and project name will be preserved.
            </div>
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
