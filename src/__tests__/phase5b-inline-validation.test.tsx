import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

function startAtClientDetails() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
}

describe('PHASE_5B_REV01 — company_name warning', () => {
  beforeEach(() => startAtClientDetails())

  it('does not warn on empty company (optional field)', () => {
    expect(screen.queryByText(/Company name seems too short/)).not.toBeInTheDocument()
  })

  it('warns when company name is 1 character', () => {
    const company = screen.getByPlaceholderText('Acme Corp')
    fireEvent.change(company, { target: { value: 'A' } })
    fireEvent.blur(company)
    expect(screen.getByText(/Company name seems too short — enter at least 2 characters/)).toBeInTheDocument()
  })

  it('clears the company name warning when fixed to 2+ characters', () => {
    const company = screen.getByPlaceholderText('Acme Corp')
    fireEvent.change(company, { target: { value: 'A' } })
    fireEvent.blur(company)
    expect(screen.getByText(/Company name seems too short/)).toBeInTheDocument()
    fireEvent.focus(company)
    fireEvent.change(company, { target: { value: 'AC' } })
    expect(screen.queryByText(/Company name seems too short/)).not.toBeInTheDocument()
  })
})

describe('PHASE_5B_REV01 — project_description warning', () => {
  beforeEach(() => startAtClientDetails())

  it('does not warn on empty business description (optional)', () => {
    const desc = screen.getByPlaceholderText(/We are a logistics company/)
    fireEvent.blur(desc)
    expect(screen.queryByText(/Project description is brief/)).not.toBeInTheDocument()
  })

  it('warns when description is less than 20 characters', () => {
    const desc = screen.getByPlaceholderText(/We are a logistics company/)
    fireEvent.change(desc, { target: { value: 'Too short' } })
    fireEvent.blur(desc)
    expect(screen.getByText(/Project description is brief/)).toBeInTheDocument()
  })

  it('clears the description warning when description reaches 20 characters', () => {
    const desc = screen.getByPlaceholderText(/We are a logistics company/)
    fireEvent.change(desc, { target: { value: 'Short desc' } })
    fireEvent.blur(desc)
    expect(screen.getByText(/Project description is brief/)).toBeInTheDocument()

    fireEvent.focus(desc)
    fireEvent.change(desc, { target: { value: 'This is a detailed business description that is over twenty characters long.' } })
    expect(screen.queryByText(/Project description is brief/)).not.toBeInTheDocument()
  })
})

describe('PHASE_5B_REV01 — draft save toast message', () => {
  it('shows the updated draft save toast message', () => {
    // Navigate through multiple steps to reach outcome and save draft
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))

    // Fill basics
    fireEvent.change(screen.getByPlaceholderText('Alex Johnson'), { target: { value: 'Alex Johnson' } })
    fireEvent.change(screen.getByPlaceholderText('alex@acmecorp.com'), { target: { value: 'alex@acmecorp.com' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Acme Client Portal'), { target: { value: 'Client Portal' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Technology' } })
    fireEvent.click(screen.getByRole('button', { name: /Website/ }))

    const next = () => fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    next()

    fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
    next()

    fireEvent.click(screen.getByRole('button', { name: /full deck available/ }))
    next()

    fireEvent.click(screen.getByRole('button', { name: /Apex Business/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Website' }))
    next()

    fireEvent.click(screen.getByRole('button', { name: /Authentication/ }))
    next()

    next()

    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(screen.getByText('Draft saved. Review warnings before submit.')).toBeInTheDocument()
  })
})