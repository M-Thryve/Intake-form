import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InlineWarning from '../InlineWarning'

describe('InlineWarning', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<InlineWarning fieldId="field-test" message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is empty', () => {
    const { container } = render(<InlineWarning fieldId="field-test" message="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the warning text with a warning triangle icon', () => {
    render(<InlineWarning fieldId="field-test" message="Something is wrong" />)
    expect(screen.getByText('Something is wrong')).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('uses the amber color for the default warning severity', () => {
    const { container } = render(<InlineWarning fieldId="field-test" message="Warning" />)
    const el = screen.getByRole('alert')
    expect(el).toHaveStyle({ color: '#F59E0B' })
    expect(container.querySelectorAll('.mthryve-inline-warning').length).toBe(1)
  })

  it('uses the red color for error severity', () => {
    render(<InlineWarning fieldId="field-test" message="Error" severity="error" />)
    expect(screen.getByRole('alert')).toHaveStyle({ color: '#EF4444' })
  })

  it('sets role="alert" and an id matching fieldId-warning', () => {
    render(<InlineWarning fieldId="field-fullName" message="Required" />)
    const el = screen.getByRole('alert')
    expect(el).toHaveAttribute('role', 'alert')
    expect(el.id).toBe('field-fullName-warning')
  })

  it('applies the fade-in animation class', () => {
    render(<InlineWarning fieldId="field-test" message="Animated" />)
    const el = screen.getByRole('alert')
    expect(el).toHaveClass('mthryve-inline-warning')
    expect(el.textContent).toContain('Animated')
  })
})