import type { TemplateDefinition } from "../data/templates"
import {
  resolveIndustryKey,
  getMappingForIndustry,
} from "../data/industry-template-map"

export interface FilteredTemplates {
  primary: TemplateDefinition[]
  recommended: TemplateDefinition[]
  other: TemplateDefinition[]
}

const API_BASE = "http://localhost:3000"

interface SupabaseTemplateRow {
  id: string
  name: string
  industry_tags: string[]
  category: string
  active_flag: boolean
  pages?: string[]
  features?: string[]
  purpose?: string
  project_types?: string[]
  desktop_price?: number
  mobile_price?: number
  both_price?: number
  delivery_desktop?: number
  delivery_mobile?: number
  delivery_both?: number
  accent?: string
  bg?: string
}

function normalizeTemplate(row: SupabaseTemplateRow): TemplateDefinition {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    accent: row.accent ?? "#39D6C7",
    bg: row.bg ?? "#0D2035",
    pages: row.pages ?? [],
    features: row.features ?? [],
    purpose: row.purpose ?? "",
    tags: row.industry_tags ?? [],
    projectTypes: row.project_types ?? ["website", "mobile"],
    desktopPrice: row.desktop_price ?? 0,
    mobilePrice: row.mobile_price ?? 0,
    bothPrice: row.both_price ?? 0,
    deliveryDesktop: row.delivery_desktop ?? 0,
    deliveryMobile: row.delivery_mobile ?? 0,
    deliveryBoth: row.delivery_both ?? 0,
  }
}

async function fetchTemplates(includeArchived: boolean): Promise<TemplateDefinition[]> {
  const params = new URLSearchParams()
  if (includeArchived) params.set("includeArchived", "true")

  const res = await fetch(`${API_BASE}/api/templates?${params}`)
  if (!res.ok) throw new Error(`Templates API returned ${res.status}`)

  const data = (await res.json()) as {
    success: boolean
    templates: SupabaseTemplateRow[]
    error?: string
  }
  if (!data.success) throw new Error(data.error || "Failed to fetch templates")

  return data.templates.map(normalizeTemplate)
}

export async function filterTemplatesByIndustry(
  selectedIndustry: string,
  includeArchived = false,
): Promise<FilteredTemplates> {
  try {
    const templates = await fetchTemplates(includeArchived)
    return bucketTemplates(templates, selectedIndustry)
  } catch {
    return { primary: [], recommended: [], other: [] }
  }
}

function bucketTemplates(
  templates: TemplateDefinition[],
  industry: string,
): FilteredTemplates {
  if (!industry || !industry.trim()) {
    return { primary: templates, recommended: [], other: [] }
  }

  const mapping = getMappingForIndustry(industry)

  if (mapping.compatibleTags.length === 0) {
    return { primary: templates, recommended: [], other: [] }
  }

  const primary: TemplateDefinition[] = []
  const recommended: TemplateDefinition[] = []
  const other: TemplateDefinition[] = []

  for (const t of templates) {
    const hasPrimaryMatch = t.tags.some(
      (tag) => mapping.compatibleTags.includes(tag),
    )
    if (hasPrimaryMatch) {
      primary.push(t)
      continue
    }

    const hasRelatedMatch = t.tags.some(
      (tag) => mapping.relatedTags.includes(tag),
    )
    if (hasRelatedMatch) {
      recommended.push(t)
    } else {
      other.push(t)
    }
  }

  return { primary, recommended, other }
}