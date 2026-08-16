import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// Mock network calls so draft/submit tests don't depend on a live API server.
vi.mock('../api/intake', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/intake')>()
  return {
    ...actual,
    saveDraft: vi.fn().mockResolvedValue({ success: true, intakeId: 'mock-intake-id', clientId: 'mock-client-id', buildReferenceNumber: 'MTH-TEST-001', status: 'draft' }),
    submitIntake: vi.fn().mockResolvedValue({ success: true, intakeId: 'mock-intake-id', buildReferenceNumber: 'MTH-TEST-001', clientId: 'mock-client-id' }),
  }
})

// v2.0 flow: intro → build-approach → client-details → …
// "Start Project Intake" lands on build-approach; navigate through it first.
function startAtClientDetails() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
  fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
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
  it('shows the updated draft save toast message', async () => {
    // Navigate through multiple steps to reach outcome and save draft.
    // v2.0 flow: intro → build-approach → client-details → company-assets → template-select → pages-features → review → outcome
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))

    // On build-approach
    fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))

    const next = () => fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    next() // → client-details

    // Fill client basics
    fireEvent.change(screen.getByPlaceholderText('Alex Johnson'), { target: { value: 'Alex Johnson' } })
    fireEvent.change(screen.getByPlaceholderText('alex@acmecorp.com'), { target: { value: 'alex@acmecorp.com' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Acme Client Portal'), { target: { value: 'Client Portal' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'warehousing-storage' } })
    fireEvent.click(screen.getByRole('button', { name: /Templated Website/ }))
    next() // → company-assets

    fireEvent.click(screen.getByRole('button', { name: /full deck available/ }))
    next() // → template-select

    fireEvent.click(screen.getByRole('button', { name: /Apex Business/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Website' }))
    next() // → pages-features

    next() // → review (extensions are optional — no selection needed)

    next() // → outcome

    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    // P4: draft save navigates to draft-saved step instead of showing inline banner
    expect(await screen.findByText('Intake Saved as Draft')).toBeInTheDocument()
  })
})
