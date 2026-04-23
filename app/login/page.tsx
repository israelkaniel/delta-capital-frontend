'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function DeltaLogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer delta (triangle) */}
      <path
        d="M24 4L44 40H4L24 4Z"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner solid delta */}
      <path
        d="M24 14L37 36H11L24 14Z"
        fill="rgba(255,255,255,0.9)"
      />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr) {
      setError(authErr.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    // Fixed overlay covers the entire viewport, floating above the app shell
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ─── Left panel — branding ─────────────────────────────────── */}
      <div style={{
        background: 'oklch(0.13 0.01 150)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle radial glow behind logo */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '-80px',
          width: '480px',
          height: '480px',
          background: 'radial-gradient(circle, oklch(0.55 0.22 150 / 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo mark + wordmark */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <DeltaLogoMark size={40} />
            <span style={{
              color: '#fff',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.025em',
            }}>
              Delta Capital
            </span>
          </div>
        </div>

        {/* Center headline */}
        <div style={{ position: 'relative' }}>
          <h1 style={{
            margin: '0 0 16px',
            color: '#fff',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
          }}>
            Commission<br />management<br />for modern<br />lenders.
          </h1>
          <p style={{
            margin: 0,
            color: 'rgba(255,255,255,0.45)',
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 320,
          }}>
            Track deals, splits, reserves, and payout cycles — all in one place.
          </p>
        </div>

        {/* Bottom quote strip */}
        <div style={{
          position: 'relative',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.5 }}>
            "Our payout reconciliation went from a day of spreadsheet work to under ten minutes."
          </p>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11.5 }}>
            — Operations lead, alternative lending firm
          </span>
        </div>
      </div>

      {/* ─── Right panel — form ────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg, #fafaf9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
      }}>
        {/* Back link */}
        <div style={{ position: 'absolute', top: 24, left: 28 }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              color: 'var(--ink-3, #6b6b6e)',
              textDecoration: 'none',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink, #0a0a08)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3, #6b6b6e)')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to app
          </Link>
        </div>

        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg-elev, #fff)',
          border: '1px solid var(--line, #e8e8e4)',
          borderRadius: 'var(--r-xl, 16px)',
          boxShadow: 'var(--shadow-lg, 0 12px 32px rgba(10,10,8,0.08))',
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            padding: '28px 28px 0',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--ink, #0a0a08)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 20,
              position: 'relative',
            }}>
              {/* Inline delta mark */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 15H2L9 2Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinejoin="round"/>
                <path d="M9 6L13.5 13.5H4.5L9 6Z" fill="#fff"/>
              </svg>
            </div>

            <h2 style={{
              margin: '0 0 6px',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--ink, #0a0a08)',
            }}>
              Welcome back
            </h2>
            <p style={{
              margin: '0 0 24px',
              fontSize: 13,
              color: 'var(--ink-3, #6b6b6e)',
            }}>
              Sign in to your Delta Capital account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '0 28px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email */}
              <div className="field">
                <label htmlFor="login-email" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.01em' }}>
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* Password */}
              <div className="field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="login-password" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.01em' }}>
                    Password
                  </label>
                  <a
                    href="#"
                    style={{ fontSize: 11.5, color: 'var(--accent-ink, #2a7a2a)', textDecoration: 'none' }}
                    tabIndex={-1}
                  >
                    Forgot password?
                  </a>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'oklch(0.95 0.03 25)',
                  border: '1px solid oklch(0.88 0.06 25)',
                  fontSize: 12.5,
                  color: 'oklch(0.45 0.18 25)',
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 38,
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginTop: 6,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Footer strip */}
          <div style={{
            padding: '12px 28px 16px',
            borderTop: '1px solid var(--line, #e8e8e4)',
            background: 'var(--bg-sunk, #f4f4f2)',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-4, #9a9a9c)' }}>
              Protected by Delta Capital SSO &amp; 2FA
            </span>
          </div>
        </div>

        {/* Legal note */}
        <p style={{
          marginTop: 24,
          fontSize: 11,
          color: 'var(--ink-5, #c8c8ca)',
          textAlign: 'center',
          maxWidth: 340,
          lineHeight: 1.6,
        }}>
          By signing in you agree to the{' '}
          <a href="#" style={{ color: 'var(--ink-4)', textDecoration: 'underline' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: 'var(--ink-4)', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
      </div>

      {/* Responsive collapse — hide left panel on narrow viewports */}
      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr;
          }
          div[style*="background: oklch(0.13"] {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
