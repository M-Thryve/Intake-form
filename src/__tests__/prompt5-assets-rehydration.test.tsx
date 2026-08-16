import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AssetUploader from '../components/AssetUploader'
import { rehydrateDraftState, toSubmissionPayload } from '../api/intake'
import type { FormData, IntakeDraftRecord, UploadedAssetRef } from '../types/intake'

const assetApi = vi.hoisted(() => ({
  requestUpload: vi.fn(),
  uploadToSignedUrl: vi.fn(),
  confirmUpload: vi.fn(),
  updateAssetStatus: vi.fn(),
}))

vi.mock('../api/assets', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/assets')>()
  return {
    ...actual,
    requestUpload: assetApi.requestUpload,
    uploadToSignedUrl: assetApi.uploadToSignedUrl,
    confirmUpload: assetApi.confirmUpload,
    updateAssetStatus: assetApi.updateAssetStatus,
  }
})

const ASSET: UploadedAssetRef = {
  assetId: '850e8400-e29b-41d4-a716-446655440000',
  filename: 'brand-logo.png',
  mimeType: 'image/png',
  sizeBytes: 128,
  assetStatus: 'uploaded',
  scanStatus: 'pending',
  requirementKey: 'brand.logo',
}

function formFixture(): FormData {
  return {
    fullName: 'Prompt Five', company: 'M-THRYVE', email: 'prompt5@example.com', phone: '',
    projectName: 'Website', industry: 'service-commerce', projectType: 'ai-assisted-website', businessDesc: 'A site',
    assetQualification: 'ready', assetStatuses: {}, selectedAssetServices: [], uploadedAssets: [ASSET],
    deckExists: 'partial', deckSectionStatuses: { overview: 'provide_later' }, deckSectionNotes: { overview: 'Client follows up' },
    resourceStatuses: { logo: 'available' }, resourceNotes: { logo: 'Uploaded' }, resourceAddOnCosts: {},
    tier: 'custom', templateCategory: '', templateId: '', projectVersion: '', colorPreset: '', customSizes: false, allSizes: false,
    projectVision: '', targetUsers: '', userRoles: '', businessWorkflows: '', integrations: '', existingSystems: '', dataSecurityReqs: '', scalabilityReqs: '', designInspiration: '', competitors: '', successCriteria: '',
    selectedExtensions: ['EXT-001'], websiteQuestionnaire: { businessDescription: 'A company', primaryGoal: 'Leads' },
    features: [], featurePriorities: {}, customFeatures: ['Member area later'], designStyles: [], inspirationLink: '',
    operatorNotes: [{ kind: 'follow_up', note: 'Confirm launch date' }], missingRequirements: [],
    paymentPlan: '', voucherCode: '', voucherStatus: '', maintenanceAfterFree: '', maintenanceEndAcknowledged: false, preferredBillingDate: '',
    confirmAccurate: false, confirmReceipt: false, confirmPayment: false, confirmMaintenance: false, confirmBuildCard: false, confirmSubmission: false,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  assetApi.requestUpload.mockResolvedValue({
    assetId: ASSET.assetId,
    uploadUrl: 'https://storage.test/signed',
    token: 'token',
    storageKey: 'intakes/id/brand-logo.png',
    expiresIn: 3600,
  })
  assetApi.uploadToSignedUrl.mockImplementation(async (_url, _file, progress) => {
    progress(40)
    progress(100)
  })
  assetApi.confirmUpload.mockResolvedValue(ASSET)
})

describe('Prompt 5 upload metadata and draft rehydration', () => {
  it('submits upload metadata without bytes, signed URLs, or credentials', () => {
    const payload = toSubmissionPayload(formFixture(), { Home: { headline: 'Hello' } }, 'draft', 'company-assets')
    expect(payload.assets.uploads).toEqual([ASSET])
    expect(payload.assets.deckSectionNotes).toEqual({ overview: 'Client follows up' })
    expect(payload.sourceMetadata?.lastEditedStep).toBe('company-assets')
    const json = JSON.stringify(payload)
    expect(json).not.toContain('data:')
    expect(json).not.toContain('signedUrl')
    expect(json).not.toContain('token')
    expect(json).not.toContain('storageKey')
  })

  it('restores the active AI-assisted path, questionnaire, scope, notes, pages, and assets', () => {
    const payload = toSubmissionPayload(formFixture(), { Home: { headline: 'Hello' } }, 'draft', 'company-assets')
    const record: IntakeDraftRecord = {
      intakeId: '550e8400-e29b-41d4-a716-446655440000',
      clientId: '650e8400-e29b-41d4-a716-446655440000',
      referenceNumber: 'MTH-2608-0001-TEST',
      status: 'draft', lifecycleStatus: 'draft', outcome: 'draft', payload,
      missingRequirements: [], uploadedAssets: [ASSET], operatorNotes: payload.operatorNotes ?? [], hasBuildCard: false,
    }
    const restored = rehydrateDraftState(record)
    const fresh = { ...formFixture(), templateId: 'stale-template', projectVision: 'stale-enterprise', ...restored.form }
    expect(fresh.projectType).toBe('ai-assisted-website')
    expect(fresh.templateId).toBe('')
    expect(fresh.projectVision).toBe('')
    expect(fresh.websiteQuestionnaire?.primaryGoal).toBe('Leads')
    expect(fresh.selectedExtensions).toEqual(['EXT-001'])
    expect(fresh.uploadedAssets).toEqual([ASSET])
    expect(fresh.resourceNotes.logo).toBe('Uploaded')
    expect(restored.pageContents.Home.headline).toBe('Hello')
    expect(restored.lastEditedStep).toBe('company-assets')
  })

  it('auto-requests a stable draft binding before uploading and reports progress accessibly', async () => {
    const ensureBinding = vi.fn().mockResolvedValue({
      intakeId: '550e8400-e29b-41d4-a716-446655440000',
      clientId: '650e8400-e29b-41d4-a716-446655440000',
      referenceNumber: 'MTH-2608-0001-TEST',
    })
    const onAssetsChange = vi.fn()
    render(
      <AssetUploader
        assets={[]}
        ensureBinding={ensureBinding}
        onAssetsChange={onAssetsChange}
        requirementKey="brand.logo"
        label="Company files"
      />,
    )
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'brand-logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Choose Company files'), { target: { files: [file] } })

    await waitFor(() => expect(assetApi.confirmUpload).toHaveBeenCalledTimes(1))
    expect(ensureBinding).toHaveBeenCalledTimes(1)
    expect(assetApi.requestUpload).toHaveBeenCalledWith(expect.objectContaining({
      intakeId: '550e8400-e29b-41d4-a716-446655440000',
      requirementKey: 'brand.logo',
      filename: 'brand-logo.png',
    }))
    expect(onAssetsChange).toHaveBeenLastCalledWith([ASSET])
  })

  it('shows an upload failure reason and a retry action', async () => {
    assetApi.requestUpload.mockRejectedValueOnce(new Error('Signed URL unavailable'))
    render(
      <AssetUploader
        assets={[]}
        ensureBinding={vi.fn().mockResolvedValue({
          intakeId: '550e8400-e29b-41d4-a716-446655440000',
          clientId: '650e8400-e29b-41d4-a716-446655440000',
          referenceNumber: 'MTH-2608-0001-TEST',
        })}
        onAssetsChange={vi.fn()}
        label="Company files"
      />,
    )
    const file = new File(['image'], 'brand-logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Choose Company files'), { target: { files: [file] } })
    expect(await screen.findAllByText('Signed URL unavailable')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})

