// Canonical v3.0 AI-Assisted Website questionnaire schema — §10.2 of REVISION_HANDOVER.md.
// This file is the single source of truth for field keys, control types, and permitted
// options. Do not copy these lists into components — import from here.
//
// Key: every field key here corresponds exactly to a key in `WebsiteQuestionnaire`
// in `src/types/intake.ts`. Adding a field here without adding it to the type (or
// vice versa) is a drift violation.

export type QuestionnaireControlType =
  | 'textarea'
  | 'text'
  | 'multi-select'
  | 'radio'
  | 'select'

export interface QuestionnaireOption {
  value: string
  label: string
}

export interface QuestionnaireConditional {
  field: string
  /** Show this field when the named field equals this value. */
  value?: string
  /** Show this field when the named field does NOT equal this value. */
  notValue?: string
}

export type QuestionnaireGroup =
  | 'business-objectives'
  | 'visual-direction'
  | 'typography'
  | 'color'
  | 'layout'
  | 'components'
  | 'motion'

export const QUESTIONNAIRE_GROUP_LABELS: Readonly<Record<QuestionnaireGroup, string>> = {
  'business-objectives': 'Business & Objectives',
  'visual-direction': 'Visual Direction',
  'typography': 'Typography',
  'color': 'Color',
  'layout': 'Layout',
  'components': 'Components & UI Style',
  'motion': 'Motion & Interaction',
}

export interface QuestionnaireFieldDef {
  key: string
  question: string
  control: QuestionnaireControlType
  options?: readonly QuestionnaireOption[]
  conditionalOn?: QuestionnaireConditional
  group: QuestionnaireGroup
}

// ── Questionnaire field definitions §10.2 ────────────────────────────────────
// Control types and options are binding per REVISION_HANDOVER.md §0.1.

export const QUESTIONNAIRE_FIELDS: readonly QuestionnaireFieldDef[] = [
  // ── Business & Objectives ──────────────────────────────────────────────────
  {
    key: 'businessDescription',
    question: 'What does the business do?',
    control: 'textarea',
    group: 'business-objectives',
  },
  {
    key: 'primaryGoal',
    question: 'What is the primary goal of the website?',
    control: 'textarea',
    group: 'business-objectives',
  },
  {
    key: 'visitorAction',
    question: 'What action should visitors ultimately take?',
    control: 'text',
    group: 'business-objectives',
  },
  {
    key: 'websitePurpose',
    question: 'What is the website intended to do?',
    control: 'multi-select',
    options: [
      { value: 'sell', label: 'Sell' },
      { value: 'generate-leads', label: 'Generate Leads' },
      { value: 'accept-bookings', label: 'Accept Bookings' },
      { value: 'educate', label: 'Educate' },
      { value: 'showcase', label: 'Showcase' },
      { value: 'support', label: 'Support' },
      { value: 'other', label: 'Other' },
    ],
    group: 'business-objectives',
  },
  {
    key: 'websitePurposeOther',
    question: 'Please explain',
    control: 'text',
    // Required when websitePurpose includes 'other'
    conditionalOn: { field: 'websitePurpose', value: 'other' },
    group: 'business-objectives',
  },
  // ── Visual Direction ───────────────────────────────────────────────────────
  {
    key: 'feel',
    question: 'How should the website feel?',
    control: 'multi-select',
    options: [
      { value: 'professional', label: 'Professional' },
      { value: 'premium', label: 'Premium' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'bold', label: 'Bold' },
      { value: 'friendly', label: 'Friendly' },
      { value: 'technical', label: 'Technical' },
      { value: 'playful', label: 'Playful' },
      { value: 'editorial', label: 'Editorial' },
    ],
    group: 'visual-direction',
  },
  // ── Typography ─────────────────────────────────────────────────────────────
  {
    key: 'fontPreference',
    question: 'Are there preferred fonts?',
    control: 'radio',
    options: [
      { value: 'has-preference', label: 'Yes, I have a preference' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'typography',
  },
  {
    key: 'fontNames',
    question: 'Which fonts?',
    control: 'text',
    conditionalOn: { field: 'fontPreference', value: 'has-preference' },
    group: 'typography',
  },
  // ── Color ──────────────────────────────────────────────────────────────────
  {
    key: 'hasBrandColors',
    question: 'Are there existing brand colors?',
    control: 'radio',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'partial', label: 'Partial' },
    ],
    group: 'color',
  },
  {
    key: 'brandColors',
    question: 'Brand colors',
    control: 'text',
    // Shown when hasBrandColors ≠ 'no' (i.e., 'yes' or 'partial')
    conditionalOn: { field: 'hasBrandColors', notValue: 'no' },
    group: 'color',
  },
  {
    key: 'colorMode',
    question: 'Should the interface be light, dark, or mixed?',
    control: 'radio',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'mixed', label: 'Mixed' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'color',
  },
  // ── Layout ─────────────────────────────────────────────────────────────────
  {
    key: 'density',
    question: 'Should the design be spacious or information-dense?',
    control: 'radio',
    options: [
      { value: 'spacious', label: 'Spacious' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'dense', label: 'Dense' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'layout',
  },
  {
    key: 'gridStyle',
    question: 'Traditional grid or a more unconventional layout?',
    control: 'radio',
    options: [
      { value: 'traditional-grid', label: 'Traditional Grid' },
      { value: 'unconventional', label: 'Unconventional' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'layout',
  },
  // ── Components & UI Style ──────────────────────────────────────────────────
  {
    key: 'buttonStyle',
    question: 'Preferred button style',
    control: 'select',
    options: [
      { value: 'rounded', label: 'Rounded' },
      { value: 'pill', label: 'Pill' },
      { value: 'square', label: 'Square' },
      { value: 'outline', label: 'Outline' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'components',
  },
  {
    key: 'cardStyle',
    question: 'Preferred card style',
    control: 'select',
    options: [
      { value: 'flat', label: 'Flat' },
      { value: 'bordered', label: 'Bordered' },
      { value: 'elevated', label: 'Elevated' },
      { value: 'glass', label: 'Glass' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'components',
  },
  {
    key: 'shadowStyle',
    question: 'Preferred shadow style',
    control: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'subtle', label: 'Subtle' },
      { value: 'pronounced', label: 'Pronounced' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'components',
  },
  {
    key: 'gradientStyle',
    question: 'Preferred gradient style',
    control: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'subtle', label: 'Subtle' },
      { value: 'vibrant', label: 'Vibrant' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'components',
  },
  // ── Motion & Interaction ───────────────────────────────────────────────────
  {
    key: 'transitions',
    question: 'Smooth or premium transitions?',
    control: 'radio',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'smooth', label: 'Smooth' },
      { value: 'premium', label: 'Premium' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'motion',
  },
  {
    key: 'interactivity',
    question: 'Should it be highly interactive?',
    control: 'radio',
    options: [
      { value: 'minimal', label: 'Minimal' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'high', label: 'High' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'motion',
  },
  {
    key: 'hoverEffects',
    question: 'Should it include hover effects?',
    control: 'radio',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'subtle', label: 'Subtle' },
      { value: 'no', label: 'No' },
      { value: 'no-preference', label: 'No preference' },
    ],
    group: 'motion',
  },
  {
    key: 'notes',
    question: 'Anything else about the visual direction?',
    control: 'textarea',
    group: 'motion',
  },
] as const

// ── Submission requirements ───────────────────────────────────────────────────
// Fields required for submit (not draft). websitePurposeOther is required
// conditionally — enforced in validation logic, not by this set.

export const QUESTIONNAIRE_SUBMIT_REQUIRED: ReadonlySet<string> = new Set([
  'primaryGoal',
  'visitorAction',
  'websitePurpose',
])

// ── Group ordering ────────────────────────────────────────────────────────────
// Canonical display order for the review summary.

export const QUESTIONNAIRE_GROUP_ORDER: readonly QuestionnaireGroup[] = [
  'business-objectives',
  'visual-direction',
  'typography',
  'color',
  'layout',
  'components',
  'motion',
]
