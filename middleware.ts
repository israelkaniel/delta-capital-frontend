import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for any Supabase auth cookie (sb-*-auth-token)
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (hasSession) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
