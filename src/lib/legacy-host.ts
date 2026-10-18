import { NextResponse, type NextRequest } from 'next/server'

export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

/**
 * The Worker also answers on its workers.dev hostname, which served the whole
 * site a second time. Pages move to the real domain for good. /api stays: a
 * callback (crawler settlement, Stripe) may still be configured with the old
 * host and must not be answered with a redirect.
 *
 * Here rather than in next.config.ts redirects, because OpenNext compiles a
 * `/:path` destination for one segment only and answers /blog/x with a 500.
 */
export function legacyHostRedirect(request: NextRequest): NextResponse | null {
  if (request.headers.get('host') !== 'cracha.aimpact-agency.workers.dev') return null
  const { pathname, search } = request.nextUrl
  if (isApiPath(pathname)) return null
  return NextResponse.redirect(`https://cracha-app.com${pathname}${search}`, 308)
}
