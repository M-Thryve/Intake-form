import { beforeEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({
  session: null as null | { access_token: string },
  error: null as null | Error,
  createOptions: null as unknown,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, _key: string, options: unknown) => {
    authState.createOptions = options
    return {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: authState.session },
          error: authState.error,
        })),
      },
    }
  }),
}))

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  authState.session = null
  authState.error = null
  authState.createOptions = null
  window.sessionStorage.clear()
  window.localStorage.clear()
})

describe('Supabase API bearer wiring', () => {
  it('adds the active Supabase access token and uses session storage', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')
    authState.session = { access_token: 'current-access-token' }

    const { getApiAuthHeaders } = await import('../api/auth')
    await expect(getApiAuthHeaders()).resolves.toEqual({
      Authorization: 'Bearer current-access-token',
    })
    expect(authState.createOptions).toMatchObject({
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  })

  it('fails closed without a configured Supabase client', async () => {
    const { getApiAuthHeaders } = await import('../api/auth')
    await expect(getApiAuthHeaders()).resolves.toEqual({})
  })

  it('does not send an expired session when refresh fails', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    authState.error = new Error('refresh token expired')

    const { getApiAuthHeaders } = await import('../api/auth')
    await expect(getApiAuthHeaders()).resolves.toEqual({})
  })

  it('never trusts legacy raw tokens from browser storage', async () => {
    window.sessionStorage.setItem('ekoms_access_token', 'legacy-token')
    window.localStorage.setItem('ekoms_access_token', 'legacy-token')

    const { getApiAuthHeaders } = await import('../api/auth')
    await expect(getApiAuthHeaders()).resolves.toEqual({})
  })
})
