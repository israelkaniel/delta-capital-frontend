'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()
  const [email, setEmail]   = useState<string | null>(null)
  const [pw, setPw]         = useState('')
  const [pw2, setPw2]       = useState('')
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [ready, setReady]   = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace('/login?error=session_expired')
        return
      }
      setEmail(data.user.email ?? null)
      setReady(true)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (pw !== pw2)    { setError('Passwords do not match'); return }
    setBusy(true)
    const supabase = createClient()
    const { error: upErr } = await supabase.auth.updateUser({ password: pw })
    if (upErr) { setError(upErr.message); setBusy(false); return }
    supabase.rpc('record_login', {
      p_ip: '',
      p_ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 240) : '',
    }).then(() => {})
    router.replace('/dashboard')
    router.refresh()
  }

  if (!ready) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-sans)', color: 'var(--ink-3)', fontSize: 13 }}>
        Verifying invitation…
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'grid', placeItems: 'center',
      background: 'var(--bg, #fafaf9)',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-elev, #fff)',
        border: '1px solid var(--line, #e8e8e4)',
        borderRadius: 'var(--r-xl, 16px)',
        boxShadow: 'var(--shadow-lg, 0 12px 32px rgba(10,10,8,0.08))',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink, #0a0a08)',
            display: 'grid', placeItems: 'center', marginBottom: 20,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 15H2L9 2Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinejoin="round"/>
              <path d="M9 6L13.5 13.5H4.5L9 6Z" fill="#fff"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
            Set your password
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--ink-3, #6b6b6e)' }}>
            {email ? <>Welcome <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Choose a password to finish setup.</> : 'Choose a password to finish setup.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 28px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="pw" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
                New password
              </label>
              <input
                id="pw"
                type="password"
                className="input"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                required
                minLength={8}
                style={{ width: '100%' }}
              />
            </div>

            <div className="field">
              <label htmlFor="pw2" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
                Confirm password
              </label>
              <input
                id="pw2"
                type="password"
                className="input"
                placeholder="Repeat password"
                autoComplete="new-password"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                required
                minLength={8}
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'oklch(0.95 0.03 25)',
                border: '1px solid oklch(0.88 0.06 25)',
                fontSize: 12.5, color: 'oklch(0.45 0.18 25)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn primary"
              disabled={busy}
              style={{
                width: '100%', height: 38, fontSize: 13.5, fontWeight: 600, marginTop: 6,
                opacity: busy ? 0.7 : 1, cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? 'Saving…' : 'Save password & sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
