import { describe, expect, it } from 'vitest'
import { getFlow } from '../flow'

describe('getFlow v3.0 sequencing', () => {
  it.each(['templated-website', 'ai-assisted-website'])(
    'keeps template-select in the custom flow for %s',
    projectType => {
      const flow = getFlow('custom', projectType)

      expect(flow).toEqual([
        'entry',
        'intro',
        'build-approach',
        'client-details',
        'company-assets',
        'template-select',
        'pages-features',
        'review',
        'outcome',
        'draft-saved',
        'build-card',
      ])
    },
  )

  it('places draft-saved immediately after outcome in the enterprise flow', () => {
    const flow = getFlow('enterprise', 'webapp')

    expect(flow[flow.indexOf('outcome') + 1]).toBe('draft-saved')
    expect(flow).toContain('enterprise-vision')
    expect(flow).not.toContain('template-select')
  })
})
