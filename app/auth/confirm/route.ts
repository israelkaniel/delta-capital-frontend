import { NextResponse, type NextRequest } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Handles the link Supabase puts in invite / recovery / signup emails.
// Email template should use:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/set-password
// For backwards compatibility we also accept the legacy `?code=...` (PKCE)
// param produced by the default `{{ .ConfirmationURL }}` redirect.
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tokenHash = url.searchParams.get('token_hash')
  const code      = url.searchParams.get('code')
  const type      = url.searchParams.get('type') as EmailOtpType | null
  const next      = url.searchParams.get('next') || '/dashboard'

  const safeNext = next.startsWith('/') ? next : '/dashboard'
  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin))
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin))
  }

  return NextResponse.redirect(new URL('/login?error=missing_token', url.origin))
}
