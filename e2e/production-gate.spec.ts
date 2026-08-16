import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import process from 'node:process'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

process.loadEnvFile(resolve('server/.env'))

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.SUPABASE_ANON_KEY!
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intake-assets'
const API_URL = 'http://localhost:3200'
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]
const SESSION_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`

let admin: SupabaseClient
let session: Session
let authUserId = ''
let intakeId = ''
let clientId = ''
let referenceNumber = ''
let finalAssetId = ''
let retryAssetId = ''
let submitReplay: { body: unknown; idempotencyKey: string } | null = null

const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`
const operatorEmail = `codex-release-gate-${suffix}@example.invalid`
const clientEmail = `release-gate-${suffix}@example.invalid`
const operatorPassword = `E2E-${randomBytes(24).toString('base64url')}!9a`

function authHeaders() {
  return { Authorization: `Bearer ${session.access_token}` }
}

async function setBrowserSession(page: Page) {
  await page.addInitScript(
    ({ storageKey, authSession }) => {
      if (!window.sessionStorage.getItem(storageKey)) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(authSession))
      }
    },
    { storageKey: SESSION_STORAGE_KEY, authSession: session },
  )
}

async function uploadViaUi(page: Page, filename: string, contents: string) {
  const draftResponse = intakeId
    ? null
    : page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/intakes')
  const requestResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/assets/upload-request')
  const putResponse = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().includes('/storage/v1/object/upload/sign/'))
  const confirmResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/api\/assets\/[0-9a-f-]+\/confirm-upload$/.test(new URL(response.url()).pathname))

  await page.getByLabel('Choose Company assets').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from(contents),
  })

  if (draftResponse) {
    const draft = await draftResponse
    expect(draft.status()).toBe(200)
    const body = await draft.json()
    intakeId = body.intakeId
    clientId = body.clientId
    referenceNumber = body.referenceNumber || body.buildReferenceNumber
    expect(intakeId).toBeTruthy()
    expect(clientId).toBeTruthy()
    expect(referenceNumber).toBeTruthy()
  }

  const requested = await requestResponse
  expect(requested.status()).toBeGreaterThanOrEqual(200)
  expect(requested.status()).toBeLessThan(300)
  const [put, confirmed] = await Promise.all([putResponse, confirmResponse])
  expect(put.status()).toBeGreaterThanOrEqual(200)
  expect(put.status()).toBeLessThan(300)
  expect(confirmed.status()).toBe(200)
  const requestedBody = await requested.json()
  const confirmedBody = await confirmed.json()
  expect(confirmedBody.assetStatus).toBe('uploaded')

  return requestedBody as { assetId: string; storageKey: string }
}

async function replaceViaUi(page: Page, rowFilename: string, filename: string, contents: string) {
  const requestResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/assets/upload-request')
  const confirmResponse = page.waitForResponse(response => response.request().method() === 'POST' && /\/confirm-upload$/.test(new URL(response.url()).pathname))
  const chooserPromise = page.waitForEvent('filechooser')
  const row = page.getByText(rowFilename, { exact: true }).locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Replace")]][1]')
  await row.getByRole('button', { name: /replace/i }).click({ timeout: 10_000 })
  const chooser = await chooserPromise
  await chooser.setFiles({ name: filename, mimeType: 'application/pdf', buffer: Buffer.from(contents) })
  const [requested, confirmed] = await Promise.all([requestResponse, confirmResponse])
  expect(requested.status()).toBe(200)
  expect(confirmed.status()).toBe(200)
  return requested.json() as Promise<{ assetId: string; storageKey: string }>
}

async function apiPost(api: APIRequestContext, path: string, data: unknown) {
  return api.post(`${API_URL}${path}`, { data, headers: authHeaders() })
}

async function count(table: string, column: string, value: string) {
  const { count: total, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value)
  if (error) throw error
  return total ?? 0
}

test.beforeAll(async () => {
  expect(PROJECT_REF).toBe('ilbyzsktnllevfbomesc')
  admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const created = await admin.auth.admin.createUser({
    email: operatorEmail,
    password: operatorPassword,
    email_confirm: true,
  })
  if (created.error || !created.data.user) throw created.error || new Error('Could not create E2E operator')
  authUserId = created.data.user.id
  const inserted = await admin.from('users').insert({
    id: authUserId,
    email: operatorEmail,
    full_name: 'Production Release Gate',
    role: 'owner',
  })
  if (inserted.error) throw inserted.error

  const authClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const signedIn = await authClient.auth.signInWithPassword({ email: operatorEmail, password: operatorPassword })
  if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error('Could not authenticate E2E operator')
  session = signedIn.data.session
})

test.afterAll(async () => {
  const { data: clients } = await admin.from('clients').select('id').eq('email', clientEmail)
  const clientIds = (clients ?? []).map(row => row.id as string)
  const { data: intakes } = clientIds.length
    ? await admin.from('intakes').select('id').in('client_id', clientIds)
    : { data: [] }
  const intakeIds = (intakes ?? []).map(row => row.id as string)

  for (const cleanupIntakeId of intakeIds) {
    const listed = await admin.storage.from(BUCKET).list(`intakes/${cleanupIntakeId}`, { limit: 100 })
    const keys = (listed.data ?? []).map(item => `intakes/${cleanupIntakeId}/${item.name}`)
    if (keys.length) await admin.storage.from(BUCKET).remove(keys)
    for (const table of ['notification_outbox', 'audit_events', 'idempotency_keys', 'build_cards', 'uploaded_assets']) {
      await admin.from(table).delete().eq('intake_id', cleanupIntakeId)
    }
    await admin.from('intakes').delete().eq('id', cleanupIntakeId)
  }
  if (clientIds.length) await admin.from('clients').delete().in('id', clientIds)
  if (authUserId) {
    await admin.from('users').delete().eq('id', authUserId)
    await admin.auth.admin.deleteUser(authUserId)
  }
})

test.describe.serial('real authenticated production gate', () => {
  test('protected routes reject missing and expired bearer tokens', async ({ request }) => {
    const missingDraft = await request.get(`${API_URL}/api/intakes/550e8400-e29b-41d4-a716-446655440000`)
    expect(missingDraft.status()).toBe(401)
    const expiredDraft = await request.get(`${API_URL}/api/intakes/550e8400-e29b-41d4-a716-446655440000`, {
      headers: { Authorization: 'Bearer expired.invalid.token' },
    })
    expect(expiredDraft.status()).toBe(401)
    const missingAsset = await request.get(`${API_URL}/api/assets/intake/550e8400-e29b-41d4-a716-446655440000`)
    expect(missingAsset.status()).toBe(401)
    const anonymousSave = await request.post(`${API_URL}/api/intakes`, { data: {} })
    expect(anonymousSave.status()).toBe(401)
  })

  test('browser creates, uploads, replaces, removes, resumes, retries, and submits idempotently', async ({ page, request }) => {
    await setBrowserSession(page)
    await page.goto('/')
    await page.getByTestId('wizard-next').click()
    await page.locator('#field-tier').getByText('Custom Build', { exact: true }).click()
    await page.getByTestId('wizard-next').click()

    await page.locator('#field-fullName').fill('Release Gate Client')
    await page.locator('#field-company').fill('Release Gate Studio')
    await page.locator('#field-email').fill(clientEmail)
    await page.locator('#field-phone').fill('+1 555 0199')
    await page.locator('#field-projectName').fill(`Production Gate ${suffix}`)
    await page.locator('#field-projectType').getByRole('button', { name: /Templated Website/ }).click()
    await page.locator('#field-industry').selectOption('service-commerce')
    await page.locator('#field-businessDesc').fill('Authenticated production lifecycle validation for the M-THRYVE intake.')
    await page.getByTestId('wizard-next').click()

    await page.locator('#field-deckExists').getByRole('button', { name: /Yes/ }).click()
    const availableButtons = page.getByRole('button', { name: 'Available', exact: true })
    for (let index = 0; index < await availableButtons.count(); index += 1) {
      await availableButtons.nth(index).click()
    }
    const optionalSection = page.getByText(/Optional \/ Improvement Resources/).locator('..')
    await optionalSection.getByRole('button', { name: 'Missing', exact: true }).first().click()
    await optionalSection.getByPlaceholder(/Operator note/).first().fill('Verified as an intentional follow-up in the production release checklist.')

    const first = await uploadViaUi(page, 'release-gate-v1.pdf', 'release-gate-v1-bytes')
    const authorizedDraft = await request.get(`${API_URL}/api/intakes/${intakeId}`, { headers: authHeaders() })
    expect(authorizedDraft.status()).toBe(200)
    const firstRead = await authorizedDraft.json()
    expect(firstRead.intake.missingRequirements.length).toBeGreaterThan(0)
    expect(firstRead.intake.missingRequirements[0]).toMatchObject({ severity: 'required', status: 'missing' })

    const replaced = await replaceViaUi(page, 'release-gate-v1.pdf', 'release-gate-v2.pdf', 'release-gate-v2-bytes')
    expect(replaced.assetId).toBe(first.assetId)
    const oldObject = await admin.storage.from(BUCKET).list(`intakes/${intakeId}`, { search: first.storageKey.split('/').pop() })
    expect(oldObject.data).toHaveLength(0)

    const removeResponse = page.waitForResponse(response => response.request().method() === 'DELETE' && new URL(response.url()).pathname === `/api/assets/${first.assetId}`)
    const replacementRow = page.getByText('release-gate-v2.pdf', { exact: true }).locator('xpath=ancestor::div[.//button[normalize-space(.)="Remove"]][1]')
    await replacementRow.getByRole('button', { name: 'Remove', exact: true }).click()
    expect((await removeResponse).status()).toBe(200)
    await expect(page.getByText('release-gate-v2.pdf', { exact: true })).toHaveCount(0)
    expect(await count('uploaded_assets', 'intake_id', intakeId)).toBe(0)

    const finalUpload = await uploadViaUi(page, 'release-gate-final.pdf', 'release-gate-final-bytes')
    finalAssetId = finalUpload.assetId

    const wrongBinding = await apiPost(request, '/api/assets/upload-request', {
      intakeId,
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      referenceNumber,
      filename: 'unauthorized.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 10,
    })
    expect(wrongBinding.status()).toBe(404)

    const failedRequest = await apiPost(request, '/api/assets/upload-request', {
      intakeId,
      clientId,
      referenceNumber,
      filename: 'retry-target.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 18,
      requirementKey: 'company-assets',
    })
    expect(failedRequest.status()).toBe(201)
    retryAssetId = (await failedRequest.json()).assetId
    const failedConfirm = await apiPost(request, `/api/assets/${retryAssetId}/confirm-upload`, { intakeId, clientId, referenceNumber })
    expect(failedConfirm.status()).toBe(200)
    expect((await failedConfirm.json()).assetStatus).toBe('failed')

    await page.getByTestId('wizard-next').click()
    await page.getByRole('button', { name: 'Show all templates', exact: true }).click()
    await page.getByText('Apex Business', { exact: true }).click({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Website', exact: true }).click()
    await page.getByRole('button', { name: 'Original Template', exact: true }).click()
    await page.getByPlaceholder('e.g. Built for the Bold').fill('Production-ready intake lifecycle')
    await page.getByPlaceholder('A brief sentence or two about your business...').fill('A real authenticated storage and draft-resume validation.')
    await page.getByTestId('wizard-next').click()
    await page.getByText('Contact Forms', { exact: true }).click()
    await page.getByPlaceholder('Describe a custom request...').fill('Partner directory pending owner review')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByTestId('wizard-next').click()
    await page.getByTestId('wizard-next').click()

    const saveResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/intakes')
    await page.getByTestId('outcome-draft').click()
    expect((await saveResponse).status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Intake Saved as Draft' })).toBeVisible()
    await expect(page.getByText(referenceNumber, { exact: true })).toBeVisible()
    await expect(page.getByText(/No Build Card has been generated yet/)).toBeVisible()

    await page.goto(`/?resume=${intakeId}`)
    await expect(page.getByRole('heading', { name: 'Intake Saved as Draft' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue Editing' }).click()
    await expect(page.getByRole('heading', { name: 'Review your project.' })).toBeVisible()
    const assetsHeading = page.getByText('Assets & Resources', { exact: true })
    await assetsHeading.locator('..').getByRole('button', { name: 'Edit' }).click()

    const retryResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/assets/upload-request')
    const retryChooserPromise = page.waitForEvent('filechooser')
    const retryRow = page.getByText('retry-target.pdf', { exact: true }).locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Retry")]][1]')
    await retryRow.getByRole('button', { name: /Retry/ }).click()
    const retryChooser = await retryChooserPromise
    await retryChooser.setFiles({ name: 'retry-target.pdf', mimeType: 'application/pdf', buffer: Buffer.from('retry-success-bytes') })
    const retried = await retryResponse
    expect(retried.status()).toBe(200)
    expect((await retried.json()).assetId).toBe(retryAssetId)
    await expect(page.getByText('retry-target.pdf', { exact: true })).toBeVisible()

    for (let step = 0; step < 4; step += 1) {
      await page.getByTestId('wizard-next').click({ timeout: 10_000 })
    }
    await expect(page.getByRole('heading', { name: 'How does this call end?' })).toBeVisible()

    page.on('request', outbound => {
      if (outbound.method() !== 'POST' || new URL(outbound.url()).pathname !== '/api/intakes') return
      const body = outbound.postDataJSON() as { command?: string }
      if (body.command === 'submit') {
        submitReplay = {
          body,
          idempotencyKey: outbound.headers()['idempotency-key'],
        }
      }
    })
    await page.getByTestId('outcome-submitted').click()
    await expect(page.getByRole('heading', { name: 'Intake Submitted' })).toBeVisible()
    await expect(page.getByText(referenceNumber, { exact: true })).toBeVisible()
    expect(submitReplay).not.toBeNull()

    const replay = await request.post(`${API_URL}/api/intakes`, {
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
        'Idempotency-Key': submitReplay!.idempotencyKey,
        'X-Intake-Command': 'submit',
      },
      data: submitReplay!.body,
    })
    expect(replay.status()).toBe(200)
    expect((await replay.json()).intakeId).toBe(intakeId)

    const reopened = await request.get(`${API_URL}/api/intakes/${intakeId}`, { headers: authHeaders() })
    expect(reopened.status()).toBe(200)
    const record = (await reopened.json()).intake
    expect(record).toMatchObject({
      intakeId,
      clientId,
      referenceNumber,
      status: 'submitted',
      hasBuildCard: true,
    })
    expect(record.payload.client).toMatchObject({ fullName: 'Release Gate Client', company: 'Release Gate Studio' })
    expect(record.payload.project).toMatchObject({ projectType: 'templated-website', industry: 'service-commerce' })
    expect(record.payload.template).toMatchObject({ templateId: 'apex', projectVersion: 'desktop', colorPreset: 'original' })
    expect(record.payload.scope.extensions).toContain('EXT-001')
    expect(record.payload.scope.customFeatures).toContain('Partner directory pending owner review')
    expect(record.payload.scope.pages.find((item: { name: string }) => item.name === 'Home').fields.headline).toBe('Production-ready intake lifecycle')
    expect(Object.values(record.payload.assets.resourceNotes)).toContain('Verified as an intentional follow-up in the production release checklist.')
    expect(record.uploadedAssets.map((asset: { assetId: string }) => asset.assetId)).toEqual(expect.arrayContaining([finalAssetId, retryAssetId]))
    const serialized = JSON.stringify(record.payload)
    expect(serialized).not.toContain('release-gate-final-bytes')
    expect(serialized).not.toContain('/storage/v1/object/upload/sign/')
    expect(serialized).not.toContain('token')

    expect(await count('intakes', 'id', intakeId)).toBe(1)
    expect(await count('clients', 'id', clientId)).toBe(1)
    expect(await count('uploaded_assets', 'intake_id', intakeId)).toBe(2)
    expect(await count('build_cards', 'intake_id', intakeId)).toBe(1)
    expect(await count('idempotency_keys', 'intake_id', intakeId)).toBe(3)
    const { data: outbox, error: outboxError } = await admin
      .from('notification_outbox')
      .select('event_type')
      .eq('intake_id', intakeId)
    if (outboxError) throw outboxError
    expect(outbox?.filter(row => row.event_type === 'draft_saved')).toHaveLength(1)
    expect(outbox?.filter(row => row.event_type === 'intake_submitted')).toHaveLength(1)
  })
})
