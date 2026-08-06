import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ValidationWarning from '../ValidationWarning'

describe('ValidationWarning', () => {
  it('renders nothing when show is false', () => {
    const { container } = render(<ValidationWarning show={false} message="Something wrong" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is empty', () => {
    const { container } = render(<ValidationWarning show={true} message="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is undefined', () => {
    const { container } = render(<ValidationWarning show={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the warning message with warning variant', () => {
    render(<ValidationWarning show={true} message="Email must include @" />)
    expect(screen.getByText(/Email must include @/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders the error message with error variant', () => {
    render(<ValidationWarning show={true} message="Invalid input" variant="error" />)
    expect(screen.getByText(/Invalid input/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('applies yellow styling for warning variant', () => {
    render(<ValidationWarning show={true} message="Warning test" variant="warning" />)
    const el = screen.getByRole('alert')
    expect(el.className).toContain('text-yellow-700')
    expect(el.className).toContain('bg-yellow-50')
    expect(el.className).toContain('border-yellow-200')
  })

  it('applies red styling for error variant', () => {
    render(<ValidationWarning show={true} message="Error test" variant="error" />)
    const el = screen.getByRole('alert')
    expect(el.className).toContain('text-red-700')
    expect(el.className).toContain('bg-red-50')
    expect(el.className).toContain('border-red-200')
  })
})