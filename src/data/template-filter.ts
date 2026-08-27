import { getMappingForIndustry } from './industry-template-map'
import type { TemplateDefinition } from './templates'

export interface FilteredTemplates {
  /** Templates whose category belongs to the selected industry. */
  primary: TemplateDefinition[]
  /** Reserved for future cross-sell; always empty under direct mapping. */
  recommended: TemplateDefinition[]
  /** All remaining templates (shown when override is active). */
  other: TemplateDefinition[]
}

/**
 * Filters and categorises templates based on the selected industry.
 *
 * Under the v3.2 direct-mapping model, a template is a primary match when its
 * category belongs to the selected industry. 'other' (or an unknown industry)
 * returns every template as primary (no filtering).
 */
export function filterTemplatesByIndustry(
  templates: TemplateDefinition[],
  industry: string,
): FilteredTemplates {
  const mapping = getMappingForIndustry(industry)

  if (mapping.categories.length === 0) {
    return { primary: templates, recommended: [], other: [] }
  }

  const categorySet = new Set(mapping.categories)
  const primary: TemplateDefinition[] = []
  const other: TemplateDefinition[] = []

  for (const t of templates) {
    if (categorySet.has(t.category)) primary.push(t)
    else other.push(t)
  }

  return { primary, recommended: [], other }
}