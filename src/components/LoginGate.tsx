import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getBrowserClient, getSession, onAuthStateChange, signInWithPassword } from '../api/auth'

interface LoginGateProps {
  children: React.ReactNode
}

export default function LoginGate({ children }: LoginGateProps) {
  const [session, setSession] = useState<Session | null | 'loading'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Matches the server's DEV_AUTH_BYPASS. `import.meta.env.DEV` is statically
  // false in a production build, so this can never unlock a deployed bundle
  // however the variable is set.
  const devBypass = import.meta.env.DEV
    && String(import.meta.env.VITE_DEV_AUTH_BYPASS ?? '').trim() === 'true'

  const supabaseConfigured = getBrowserClient() !== null && !devBypass

  useEffect(() => {
    // If Supabase is not configured, skip the gate entirely (local dev without env vars)
    if (!supabaseConfigured) {
      setSession(null)
      return
    }
    getSession().then(s => setSession(s))
    return onAuthStateChange(s => setSession(s))
  }, [supabaseConfigured])

  // No Supabase config (or an explicit dev bypass) → render the app ungated.
  // A configured project with no session must fall through to the sign-in form:
  // the API rejects every unauthenticated call, so rendering the wizard here
  // produced silent 401s on every draft save, submit, and asset upload.
  if (!supabaseConfigured) {
    return <>{children}</>
  }

  if (session === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080A0F' }}>
        <div style={{ fontSize: '12px', color: '#4B6278' }}>Checking session…</div>
      </div>
    )
  }

  // Authenticated — render the intake form
  if (session) return <>{children}</>

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: authError } = await signInWithPassword(email.trim(), password)
    setSubmitting(false)
    if (authError) setError(authError)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080A0F',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#46A873', marginBottom: '12px', textTransform: 'uppercase' }}>
            M-THRYVE
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#D4E4F0', letterSpacing: '-0.02em' }}>
            Operator Access
          </div>
          <div style={{ fontSize: '12px', color: '#4B6278', marginTop: '8px' }}>
            Sign in to access the intake form.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7F95A8', marginBottom: '5px', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0D1620',
                border: '1px solid #1E2D3D',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#D4E4F0',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7F95A8', marginBottom: '5px', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0D1620',
                border: '1px solid #1E2D3D',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#D4E4F0',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div role="alert" style={{ fontSize: '12px', color: '#EF4444', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '4px',
              padding: '11px',
              background: submitting ? '#1A2535' : '#39D6C7',
              color: submitting ? '#4B6278' : '#080A0F',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
