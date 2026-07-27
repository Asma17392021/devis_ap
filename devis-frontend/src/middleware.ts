import { NextRequest, NextResponse } from 'next/server'

// ─── Admin routes ─────────────────────────────────────────────────────────────
const ADMIN_PUBLIC = ['/login', '/activate']
const ADMIN_PROTECTED = ['/', '/quotes', '/clients', '/users', '/settings', '/notifications', '/requests']

// ─── Client portal routes ─────────────────────────────────────────────────────
// Public: login, register, and any token-based portal link (/client/<uuid>)
const CLIENT_AUTH_PUBLIC = ['/client/login', '/client/register']
// Protected: dashboard, requests
const CLIENT_PROTECTED = ['/client/dashboard', '/client/requests']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Admin public paths
  if (ADMIN_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // 2. Client public paths (login, register, token portal)
  if (CLIENT_AUTH_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // 3. Client portal — token-based public routes (/client/<anything except known prefixes>)
  if (pathname.startsWith('/client/')) {
    const isClientProtected = CLIENT_PROTECTED.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    )
    if (!isClientProtected) {
      // Token-based portal page — public
      return NextResponse.next()
    }
    // Protected client page — check client refresh cookie
    const hasClientCookie = request.cookies.has('client_rt')
    if (!hasClientCookie) {
      const loginUrl = new URL('/client/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 4. Admin protected routes
  const isAdminProtected = ADMIN_PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (isAdminProtected) {
    const hasRefreshCookie = request.cookies.has('refresh_token')
    if (!hasRefreshCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
