import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null | undefined

function getBrowserClient(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient
  if (typeof window === 'undefined') {
    browserClient = null
    return browserClient
  }

  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const key = (
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
    ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  )?.trim()
  if (!url || !key) {
    browserClient = null
    return browserClient
  }

  browserClient = createClient(url, key, {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return browserClient
}

/**
 * Returns the current Supabase access token for protected API calls.
 * Supabase refreshes an expired session when possible. If no valid session is
 * available, the request is sent without credentials and the API returns 401.
 */
export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const client = getBrowserClient()
  if (!client) return {}

  const { data, error } = await client.auth.getSession()
  if (error) return {}
  const token = data.session?.access_token?.trim()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
