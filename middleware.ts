import { NextResponse, type NextRequest } from 'next/server'

const LOGIN_PATH = '/login'
const ALWAYS_ALLOW_PREFIX = '/auth' // /auth/confirm, /auth/set-password, etc.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /auth/* — always allowed (token exchange + first-time password set)
  if (pathname.startsWith(ALWAYS_ALLOW_PREFIX)) return NextResponse.next()

  // Check for any Supabase auth cookie (sb-*-auth-token)
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  if (pathname.startsWith(LOGIN_PATH)) {
    if (hasSession) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
