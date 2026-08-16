import { describe, expect, it } from 'vitest'
import {
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_GROUP_ORDER,
  QUESTIONNAIRE_SUBMIT_REQUIRED,
} from '../questionnaire'

describe('v3.0 website questionnaire contract', () => {
  it('defines the 21 canonical fields without duplicate keys', () => {
    const keys = QUESTIONNAIRE_FIELDS.map(field => field.key)

    expect(keys).toHaveLength(21)
    expect(new Set(keys).size).toBe(21)
  })

  it('covers all seven review groups in canonical order', () => {
    expect(QUESTIONNAIRE_GROUP_ORDER).toEqual([
      'business-objectives',
      'visual-direction',
      'typography',
      'color',
      'layout',
      'components',
      'motion',
    ])

    const populatedGroups = new Set(QUESTIONNAIRE_FIELDS.map(field => field.group))
    expect(populatedGroups).toEqual(new Set(QUESTIONNAIRE_GROUP_ORDER))
  })

  it('keeps submission requirements limited to the binding three base fields', () => {
    expect([...QUESTIONNAIRE_SUBMIT_REQUIRED]).toEqual([
      'primaryGoal',
      'visitorAction',
      'websitePurpose',
    ])
  })
})
