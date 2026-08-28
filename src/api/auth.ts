import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null | undefined

export function getBrowserClient(): SupabaseClient | null {
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
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return browserClient
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const client = getBrowserClient()
  if (!client) return {}

  const { data, error } = await client.auth.getSession()
  if (error) return {}
  const token = data.session?.access_token?.trim()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getSession(): Promise<Session | null> {
  const client = getBrowserClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session ?? null
}

export async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
  const client = getBrowserClient()
  if (!client) return { error: 'Auth not configured. Contact M-THRYVE.' }
  const { error } = await client.auth.signInWithPassword({ email, password })
  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  const client = getBrowserClient()
  if (!client) return
  await client.auth.signOut()
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const client = getBrowserClient()
  if (!client) return () => {}
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}
