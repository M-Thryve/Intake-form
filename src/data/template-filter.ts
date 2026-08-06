import { getMappingForIndustry } from './industry-template-map'
import type { TemplateDefinition } from './templates'

export interface FilteredTemplates {
  /** Templates with at least one primary compatible tag. */
  primary: TemplateDefinition[]
  /** Templates with at least one related tag but no primary tag match. */
  recommended: TemplateDefinition[]
  /** All remaining templates (shown only when override is active). */
  other: TemplateDefinition[]
}

/**
 * Filters and categorises templates based on the selected industry.
 */
export function filterTemplatesByIndustry(
  templates: TemplateDefinition[],
  industry: string,
): FilteredTemplates {
  const mapping = getMappingForIndustry(industry)

  if (mapping.compatibleTags.length === 0) {
    return { primary: templates, recommended: [], other: [] }
  }

  const primary: TemplateDefinition[] = []
  const recommended: TemplateDefinition[] = []
  const other: TemplateDefinition[] = []

  for (const t of templates) {
    const hasPrimaryMatch = t.tags.some(tag =>
      mapping.compatibleTags.includes(tag),
    )
    if (hasPrimaryMatch) {
      primary.push(t)
      continue
    }

    const hasRelatedMatch = t.tags.some(tag =>
      mapping.relatedTags.includes(tag),
    )
    if (hasRelatedMatch) {
      recommended.push(t)
    } else {
      other.push(t)
    }
  }

  return { primary, recommended, other }
}