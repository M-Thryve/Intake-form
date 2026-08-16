// Server-side canonical v3.0 feature allowlists — §2.4, §2.5, §2.6 of REVISION_HANDOVER.md.
// This file is the server mirror of `src/data/features.ts`.
// The two files MUST stay byte-for-byte consistent on all codes and values.
// Neither file imports from the other; they are maintained in tandem.

// ── §2.4 Factory Core Feature codes ─────────────────────────────────────────

export const CORE_FEATURE_CODES: ReadonlySet<string> = new Set([
  "Core001",
  "Core002",
  "Core003",
  "Core004",
  "Core005",
  "Core006",
  "Core007",
  "Core008",
])

export const CORE_FEATURE_CODE_LIST = [
  "Core001",
  "Core002",
  "Core003",
  "Core004",
  "Core005",
  "Core006",
  "Core007",
  "Core008",
] as const

// ── §2.6 Extension codes ─────────────────────────────────────────────────────

export const EXTENSION_CODES: ReadonlySet<string> = new Set([
  "EXT-001",
  "EXT-002",
  "EXT-003",
  "EXT-004",
  "EXT-005",
  "EXT-006",
  "EXT-007",
  "EXT-008",
  "EXT-009",
  "EXT-010",
  "EXT-011",
])

// ── §2.3 Canonical industry values ───────────────────────────────────────────

export const CANONICAL_INDUSTRIES: ReadonlySet<string> = new Set([
  "service-commerce",
  "dtc-ecommerce",
  "retail-multi-branch",
  "wholesale-distribution",
  "manufacturing-fabrication",
  "warehousing-storage",
  "logistics-transportation",
])

// ── §2.2 Project type allowlists ─────────────────────────────────────────────

export const V3_CUSTOM_PROJECT_TYPES: ReadonlySet<string> = new Set([
  "templated-website",
  "ai-assisted-website",
])

export const V3_ENTERPRISE_PROJECT_TYPES: ReadonlySet<string> = new Set([
  "website",
  "webapp",
  "ecommerce",
  "internal",
])

// ── §2.4 Core Feature names (for build card) ─────────────────────────────────

export const CORE_FEATURE_NAMES: ReadonlyMap<string, string> = new Map([
  ["Core001", "Responsive Multi-Device Layout"],
  ["Core002", "Core Page Structure"],
  ["Core003", "Brand Application & Design System"],
  ["Core004", "Navigation & Site Architecture"],
  ["Core005", "SEO Foundation"],
  ["Core006", "Performance Baseline"],
  ["Core007", "Security & Privacy Baseline"],
  ["Core008", "Deployment & Analytics-Ready Handover"],
])

// ── §2.6 Extension names (for build card and scope items) ────────────────────

export const EXTENSION_NAMES: ReadonlyMap<string, string> = new Map([
  ["EXT-001", "Contact Forms"],
  ["EXT-002", "Appointment Booking"],
  ["EXT-003", "Lead Capture"],
  ["EXT-004", "Blog Module"],
  ["EXT-005", "Newsletter Integration"],
  ["EXT-006", "Analytics"],
  ["EXT-007", "Portfolio / Project Gallery"],
  ["EXT-008", "Reviews / Testimonials"],
  ["EXT-009", "FAQ Module"],
  ["EXT-010", "Download Center"],
  ["EXT-011", "Product Showcase"],
])

// ── §2.5 Feature category values ─────────────────────────────────────────────

export const FEATURE_CATEGORIES: ReadonlySet<string> = new Set([
  "crm",
  "catalog",
  "sales",
  "operations",
  "scheduling",
  "inventory",
  "documents",
  "workflow",
  "billing",
  "engagement",
  "analytics",
  "administration",
  "integrations",
])
