import type { TemplateDefinition } from "../data/templates"
import { TEMPLATES } from "../data/templates"
import {
  filterTemplatesByIndustry as filterStatic,
} from "../data/template-filter"

export interface FilteredTemplates {
  primary: TemplateDefinition[]
  recommended: TemplateDefinition[]
  other: TemplateDefinition[]
}

/**
 * Console-side template filter. Resolves templates from the static catalogue
 * (the single source of truth in this build) and buckets them by industry via
 * the direct-mapping logic in `data/template-filter`.
 */
export async function filterTemplatesByIndustry(
  selectedIndustry: string,
  includeArchived = false,
): Promise<FilteredTemplates> {
  const templates = includeArchived ? TEMPLATES : TEMPLATES
  return filterStatic(templates, selectedIndustry)
}