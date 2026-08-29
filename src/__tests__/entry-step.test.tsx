import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import type { IntakeDraftRecord } from '../types/intake'

// ---------------------------------------------------------------------------
// Mock resumeByReference so tests don't need a live API server.
// vi.hoisted() ensures the variable is initialised before vi.mock() runs,
// since Vitest hoists vi.mock() calls to the top of the file.
// ---------------------------------------------------------------------------
const { resumeByReferenceMock } = vi.hoisted(() => ({
  resumeByReferenceMock: vi.fn(),
}))

vi.mock('../api/intake', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/intake')>()
  return {
    ...actual,
    resumeByReference: resumeByReferenceMock,
  }
})

// Minimal payload that rehydrateDraftState can process for a 'custom' draft.
function makeDraftRecord(overrides: Partial<IntakeDraftRecord> = {}): IntakeDraftRecord {
  return {
    intakeId: 'aaaa1111-0000-0000-0000-000000000001',
    clientId: 'bbbb2222-0000-0000-0000-000000000001',
    referenceNumber: 'MTH-2608-0001-AB12',
    status: 'draft',
    lifecycleStatus: 'draft',
    outcome: 'draft',
    payload: {
      client: { fullName: 'Test User', company: 'TestCo', email: 'test@example.com', phone: '' },
      project: { projectName: 'Test Project', industry: 'service-commerce', projectType: 'templated-website', businessDescription: '' },
      tier: 'custom',
      assets: { qualification: 'ready', statuses: {}, requestedServices: [], uploads: [] },
      design: { styles: [], inspirationLink: '' },
    },
    missingRequirements: [],
    uploadedAssets: [],
    operatorNotes: [],
    hasBuildCard: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function revealReferenceInput() {
  fireEvent.click(screen.getByRole('button', { name: /Enter reference number/ }))
}

function typeReference(value: string) {
  fireEvent.change(screen.getByPlaceholderText('MTH-YYMM-NNNN-XXXX'), { target: { value } })
}

function clickRecoverDraft() {
  fireEvent.click(screen.getByRole('button', { name: /Recover Draft/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Task 3.6 — Entry step tests
// ---------------------------------------------------------------------------

describe('entry step — initial render', () => {
  it('renders the entry step on mount, before intro', () => {
    render(<App />)
    // entry-specific content visible
    expect(screen.getByText('Start a new intake')).toBeInTheDocument()
    expect(screen.getByText('Resume a saved draft')).toBeInTheDocument()
    // intro-specific content must not be visible yet
    expect(screen.queryByText("Let's Build Your")).not.toBeInTheDocument()
    // wizard testid confirms we are on the entry step
    expect(document.querySelector('[data-testid="wizard-step-entry"]')).not.toBeNull()
  })
})

describe('entry step — "Start a new intake"', () => {
  it('clicking "Start a new intake" advances to intro', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Start a new intake/ }))
    // intro is now visible
    expect(screen.getByRole('button', { name: /Start Project Intake/ })).toBeInTheDocument()
    expect(document.querySelector('[data-testid="wizard-step-intro"]')).not.toBeNull()
  })
})

describe('entry step — client-side reference validation', () => {
  it('rejects an invalid reference format without calling the API', () => {
    render(<App />)
    revealReferenceInput()
    typeReference('NOT-A-VALID-REF')
    clickRecoverDraft()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/valid reference number format/)).toBeInTheDocument()
    expect(resumeByReferenceMock).not.toHaveBeenCalled()
    // Operator stays on entry
    expect(document.querySelector('[data-testid="wizard-step-entry"]')).not.toBeNull()
    // Input value is preserved
    expect(screen.getByPlaceholderText('MTH-YYMM-NNNN-XXXX')).toHaveValue('NOT-A-VALID-REF')
  })

  it('does not reject a correctly formatted reference before fetching', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: true,
      intake: makeDraftRecord(),
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    // No client-side error; API was called
    await waitFor(() => expect(resumeByReferenceMock).toHaveBeenCalledTimes(1))
    expect(resumeByReferenceMock).toHaveBeenCalledWith('MTH-2608-0001-AB12')
  })
})

describe('entry step — successful reference recovery', () => {
  it('rehydrates the form and lands on draft-saved', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: true,
      intake: makeDraftRecord(),
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByText('Intake Saved as Draft')).toBeInTheDocument(),
    )
    expect(document.querySelector('[data-testid="wizard-step-draft-saved"]')).not.toBeNull()
  })
})

describe('entry step — per-status error messages', () => {
  it('shows 404 message and leaves operator on entry with input intact', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: false,
      error: 'No intake found for that reference number',
      httpStatus: 404,
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
    expect(screen.getByText(/No intake found for that reference number\. Check for typos\./)).toBeInTheDocument()
    // Operator stays on entry
    expect(document.querySelector('[data-testid="wizard-step-entry"]')).not.toBeNull()
    // Input remains populated
    expect(screen.getByPlaceholderText('MTH-YYMM-NNNN-XXXX')).toHaveValue('MTH-2608-0001-AB12')
  })

  it('shows 429 message and leaves operator on entry', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: false,
      error: 'Too many lookup attempts. Please wait before trying again.',
      httpStatus: 429,
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
    expect(screen.getByText(/Too many lookup attempts/)).toBeInTheDocument()
    expect(document.querySelector('[data-testid="wizard-step-entry"]')).not.toBeNull()
  })

  it('shows generic message on 500 and leaves operator on entry', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: false,
      error: 'Failed to reopen intake',
      httpStatus: 500,
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
    expect(screen.getByText(/Something went wrong\. Please try again\./)).toBeInTheDocument()
    expect(document.querySelector('[data-testid="wizard-step-entry"]')).not.toBeNull()
  })
})

describe('entry step — discarded outcome', () => {
  it('refuses a discarded intake with the discarded message, stays on entry', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: true,
      intake: makeDraftRecord({ outcome: 'discarded' }),
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
    expect(screen.getByText(/This intake was discarded and cannot be resumed/)).toBeInTheDocument()
    // Operator stays on entry — must not drop into the blank wizard
    expect(document.querySelector('[data-testid="wizard-step-entry"]')).not.toBeNull()
    // Input remains populated so the operator can verify the reference they typed
    expect(screen.getByPlaceholderText('MTH-YYMM-NNNN-XXXX')).toHaveValue('MTH-2608-0001-AB12')
  })
})

describe('draft-saved card — reference promotion & internal IDs disclosure', () => {
  it('shows the reference number as hero without interaction, hides internal IDs until expanded', async () => {
    resumeByReferenceMock.mockResolvedValueOnce({
      success: true,
      intake: makeDraftRecord(),
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByText('Intake Saved as Draft')).toBeInTheDocument(),
    )

    // Reference number is prominently visible
    expect(screen.getByText('MTH-2608-0001-AB12')).toBeInTheDocument()

    // The disclosure <details> is present and initially closed (no open attribute)
    const details = screen.getByText('Internal identifiers').closest('details')
    expect(details).toBeInTheDocument()
    expect(details).not.toHaveAttribute('open')

    // Expand the disclosure
    fireEvent.click(screen.getByText('Internal identifiers'))

    // Now the details has open attribute
    expect(details).toHaveAttribute('open')

    // Internal IDs are now visible with full values
    expect(screen.getByText('bbbb2222-0000-0000-0000-000000000001')).toBeInTheDocument()
    expect(screen.getByText('aaaa1111-0000-0000-0000-000000000001')).toBeInTheDocument()
  })

  it('copy button copies the reference number', async () => {
    // Mock clipboard API before render
    const clipboardSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardSpy },
      configurable: true,
    })

    resumeByReferenceMock.mockResolvedValueOnce({
      success: true,
      intake: makeDraftRecord(),
    })
    render(<App />)
    revealReferenceInput()
    typeReference('MTH-2608-0001-AB12')
    clickRecoverDraft()
    await waitFor(() =>
      expect(screen.getByText('Intake Saved as Draft')).toBeInTheDocument(),
    )

    const copyButton = screen.getByRole('button', { name: /Copy/ })
    expect(copyButton).toBeInTheDocument()

    fireEvent.click(copyButton)
    await waitFor(() => expect(clipboardSpy).toHaveBeenCalledWith('MTH-2608-0001-AB12'))
  })
})
