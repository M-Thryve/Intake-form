import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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

// v2.0 flow: intro → build-approach → client-details → company-assets → template-select → …
// Clicking "Start Project Intake" lands on build-approach (index 1), not client-details.
// startAtClientDetails selects Custom Build and continues to reach client-details.
function startAtClientDetails() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
  // Now on build-approach — navigate to client-details
  fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
}

function fillClientBasics() {
  fireEvent.change(screen.getByPlaceholderText('Alex Johnson'), { target: { value: 'Alex Johnson' } })
  fireEvent.change(screen.getByPlaceholderText('alex@acmecorp.com'), { target: { value: 'alex@acmecorp.com' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Acme Client Portal'), { target: { value: 'Client Portal' } })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'warehousing-storage' } })
  fireEvent.click(screen.getByRole('button', { name: /Templated Website/ }))
}

function clickContinue() {
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
}

describe('inline validation — client details', () => {
  beforeEach(() => startAtClientDetails())

  it('does NOT show warnings on initial render', () => {
    expect(screen.queryByText('Client full name is required')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('does NOT show a warning while typing before the first blur', () => {
    fireEvent.change(screen.getByPlaceholderText('Alex Johnson'), { target: { value: 'A' } })
    expect(screen.queryByText('Client full name is required')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('shows a warning on blur after leaving an empty required field', () => {
    fireEvent.blur(screen.getByPlaceholderText('Alex Johnson'))
    expect(screen.getByText('Client full name is required')).toBeInTheDocument()
  })

  it('clears the warning once the field is corrected after blur', () => {
    const fullName = screen.getByPlaceholderText('Alex Johnson')
    fireEvent.blur(fullName)
    expect(screen.getByText('Client full name is required')).toBeInTheDocument()

    fireEvent.focus(fullName)
    fireEvent.change(fullName, { target: { value: 'Alex Johnson' } })
    expect(screen.queryByText('Client full name is required')).not.toBeInTheDocument()
  })

  it('shows multiple warnings simultaneously on different fields', () => {
    fireEvent.blur(screen.getByPlaceholderText('Alex Johnson'))
    fireEvent.blur(screen.getByPlaceholderText('alex@acmecorp.com'))
    expect(screen.getByText('Client full name is required')).toBeInTheDocument()
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(2)
  })

  it('flags partial phone input on blur', () => {
    const phone = screen.getByPlaceholderText('+63 917 000 0000')
    fireEvent.change(phone, { target: { value: '123' } })
    fireEvent.blur(phone)
    expect(screen.getByText('Phone number appears incomplete')).toBeInTheDocument()
  })

  it('warns on an invalid email format on blur', () => {
    const email = screen.getByPlaceholderText('alex@acmecorp.com')
    fireEvent.change(email, { target: { value: 'not-an-email' } })
    fireEvent.blur(email)
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
  })

  it('links the input to its warning via aria-describedby', () => {
    fireEvent.blur(screen.getByPlaceholderText('Alex Johnson'))
    const input = screen.getByPlaceholderText('Alex Johnson')
    expect(input).toHaveAttribute('aria-describedby', 'field-fullName-warning')
    const warning = document.getElementById('field-fullName-warning')
    expect(warning).not.toBeNull()
    expect(warning).toHaveAttribute('role', 'alert')
  })

  it('does not block navigation when warnings are present', () => {
    fillClientBasics()
    fireEvent.change(screen.getByPlaceholderText('+63 917 000 0000'), { target: { value: '123' } })
    fireEvent.blur(screen.getByPlaceholderText('+63 917 000 0000'))
    expect(screen.getByText('Phone number appears incomplete')).toBeInTheDocument()

    clickContinue()
    // Navigated to company-assets despite active warning
    expect(screen.getByText("What's ready, what's missing?")).toBeInTheDocument()
  })
})

describe('inline validation — build approach', () => {
  // After "Start Project Intake" the flow lands directly on build-approach.
  it('warns when the section is blurred without a selection', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
    // Already on build-approach
    const tierGroup = document.getElementById('field-tier')
    expect(tierGroup).not.toBeNull()
    fireEvent.blur(tierGroup!)
    expect(screen.getByText('Please select a build approach')).toBeInTheDocument()
  })

  it('clears the warning once a build approach is selected', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
    // Already on build-approach
    fireEvent.blur(document.getElementById('field-tier')!)
    expect(screen.getByText('Please select a build approach')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
    expect(screen.queryByText('Please select a build approach')).not.toBeInTheDocument()
  })
})

describe('inline validation — draft save with active warnings', () => {
  it('draft save succeeds even with active inline warnings', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
    // On build-approach
    fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
    clickContinue() // → client-details

    fillClientBasics()

    // Leave a partial-phone warning active, then navigate onward.
    fireEvent.change(screen.getByPlaceholderText('+63 917 000 0000'), { target: { value: '123' } })
    fireEvent.blur(screen.getByPlaceholderText('+63 917 000 0000'))
    expect(screen.getByText('Phone number appears incomplete')).toBeInTheDocument()
    clickContinue() // → company-assets

    fireEvent.click(screen.getByRole('button', { name: /full deck available/ }))
    clickContinue() // → template-select

    fireEvent.click(screen.getByRole('button', { name: /Apex Business/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Website' }))
    clickContinue() // → pages-features

    // v3.0: features are optional and have no priority system; navigation is not blocked.
    clickContinue() // → review

    clickContinue() // → outcome

    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    // P4: draft save navigates to draft-saved step instead of showing inline banner
    expect(await screen.findByText('Intake Saved as Draft')).toBeInTheDocument()
  })

  it('shows extension catalog and allows continuing without selection (v3.0: extensions optional)', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
    // On build-approach
    fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
    clickContinue() // → client-details
    fillClientBasics()
    clickContinue() // → company-assets
    fireEvent.click(screen.getByRole('button', { name: /full deck available/ }))
    clickContinue() // → template-select
    fireEvent.click(screen.getByRole('button', { name: /Apex Business/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Website' }))
    clickContinue() // → pages-features

    // Extension catalog is present — category dropdown and extension cards
    expect(screen.getByText('Browse by category')).toBeInTheDocument()
    expect(screen.getByText('Contact Forms')).toBeInTheDocument()
    // No "At least one feature is required" warning — extensions are optional
    expect(screen.queryByText('At least one feature is required')).not.toBeInTheDocument()
  })
})

// ── REV-03: industry template filter ─────────────────────────────────────

// v2.0 flow: build-approach → client-details → company-assets → template-select
function navigateToTemplateSelect(industry: string) {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
  // On build-approach
  fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
  fireEvent.click(screen.getByRole('button', { name: /Continue →/ }))
  // On client-details — fill basics with the target industry
  fireEvent.change(screen.getByPlaceholderText('Alex Johnson'), { target: { value: 'Alex Johnson' } })
  fireEvent.change(screen.getByPlaceholderText('alex@acmecorp.com'), { target: { value: 'alex@acmecorp.com' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Acme Client Portal'), { target: { value: 'Client Portal' } })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: industry } })
  fireEvent.click(screen.getByRole('button', { name: /Templated Website/ }))
  fireEvent.click(screen.getByRole('button', { name: /Continue →/ }))
  // On company-assets
  fireEvent.click(screen.getByRole('button', { name: /full deck available/ }))
  fireEvent.click(screen.getByRole('button', { name: /Continue →/ }))
  // Now on template-select
}

describe('REV-03 — industry template filter', () => {
  it('shows filter indicator with correct industry label', () => {
    navigateToTemplateSelect('dtc-ecommerce')
    expect(screen.getByText(/Showing starting points for: E-Commerce & Retail/)).toBeInTheDocument()
    expect(screen.getByText('Show all templates')).toBeInTheDocument()
    // Primary ecommerce templates should be visible.
    expect(screen.getByText('StoreX')).toBeInTheDocument()
    expect(screen.getByText('Boutique')).toBeInTheDocument()
    expect(screen.getByText('MarketPro')).toBeInTheDocument()
  })

  it('shows all templates with sections when override is toggled', () => {
    navigateToTemplateSelect('dtc-ecommerce')
    fireEvent.click(screen.getByRole('button', { name: 'Show all templates' }))
    expect(screen.getByText('Showing all starting points')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset to E-Commerce & Retail/ })).toBeInTheDocument()
    // Override section for primary matches always renders.
    expect(screen.getByText(/Recommended for E-Commerce & Retail/)).toBeInTheDocument()
    // "All other templates" section should be visible (templates outside e-commerce).
    expect(screen.getByText('All other templates')).toBeInTheDocument()
  })

  it('reset to industry link returns to filtered view', () => {
    navigateToTemplateSelect('dtc-ecommerce')
    fireEvent.click(screen.getByRole('button', { name: 'Show all templates' }))
    fireEvent.click(screen.getByRole('button', { name: /Reset to E-Commerce & Retail/ }))
    expect(screen.getByText(/Showing starting points for: E-Commerce & Retail/)).toBeInTheDocument()
    expect(screen.queryByText('Showing all starting points')).not.toBeInTheDocument()
  })

  it('selects a non-matching template in override mode, triggering the audit note', () => {
    navigateToTemplateSelect('dtc-ecommerce')
    fireEvent.click(screen.getByRole('button', { name: 'Show all templates' }))
    // Scroll to / find a non-primary template in "All other templates".
    // Studio has tags ['portfolio','creative','design'] — not ecommerce.
    fireEvent.click(screen.getByRole('button', { name: /Studio/ }))
    // Verifying the template was selected: the version picker should appear.
    expect(screen.getByText('Choose Your Platform')).toBeInTheDocument()
  })

  it('recommended alternatives are shown for an industry with no primary matches', () => {
    // Manufacturing has no primary-match templates (none carry construction/contractor/etc tags).
    // But several carry 'business' / 'corporate' / 'portfolio' → related matches.
    navigateToTemplateSelect('manufacturing-fabrication')
    expect(screen.getByText(/Recommended alternatives for Construction & Trades/)).toBeInTheDocument()
    expect(screen.getByText('Show all templates')).toBeInTheDocument()
    // Verify that a recommended template is present.
    expect(screen.getByText('Apex Business')).toBeInTheDocument() // corporate/business tag
  })

  it('resets override when industry is changed in client-details', () => {
    navigateToTemplateSelect('dtc-ecommerce')
    fireEvent.click(screen.getByRole('button', { name: 'Show all templates' }))
    expect(screen.getByText('Showing all starting points')).toBeInTheDocument()

    // Navigate back to client-details.
    // v2.0 flow from template-select: back → company-assets → back → client-details
    const goBack = () => screen.getByRole('button', { name: /← Back/ })
    fireEvent.click(goBack()) // → company-assets
    fireEvent.click(goBack()) // → client-details

    // Change the industry (still ecommerce family — override should still reset).
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'retail-multi-branch' } })

    // Resume forward.
    const goNext = () => screen.getByRole('button', { name: /Continue/ })
    fireEvent.click(goNext()) // → company-assets
    fireEvent.click(goNext()) // → template-select

    // The filter should have reset to the new industry.
    expect(screen.getByText(/Showing starting points for: E-Commerce & Retail/)).toBeInTheDocument()
    expect(screen.queryByText('Showing all starting points')).not.toBeInTheDocument()
    // Primary ecommerce templates should be visible.
    expect(screen.getByText('StoreX')).toBeInTheDocument()
    expect(screen.getByText('Boutique')).toBeInTheDocument()
  })

  it('maps warehousing-storage to the construction template family', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start Project Intake/ }))
    // On build-approach
    fireEvent.click(screen.getByRole('button', { name: /Custom Build/ }))
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    // On client-details — fill required fields but use 'Other' industry
    fireEvent.change(screen.getByPlaceholderText('Alex Johnson'), { target: { value: 'Alex Johnson' } })
    fireEvent.change(screen.getByPlaceholderText('alex@acmecorp.com'), { target: { value: 'alex@acmecorp.com' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Acme Client Portal'), { target: { value: 'Client Portal' } })
    fireEvent.click(screen.getByRole('button', { name: /Templated Website/ }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'warehousing-storage' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    // On company-assets
    fireEvent.click(screen.getByRole('button', { name: /full deck available/ }))
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    // On template-select

    expect(screen.getByText(/Recommended alternatives for Construction & Trades/)).toBeInTheDocument()
    expect(screen.getByText('Show all templates')).toBeInTheDocument()
    expect(screen.getByText('Apex Business')).toBeInTheDocument()
  })
})
