import { NextResponse, type NextRequest } from 'next/server'

import { isSessionFreePath } from '@/config/public-pages'
import { updateSession } from '@/lib/supabase/proxy'

// Next 16 renames this file to `proxy.ts` with an exported `proxy` function,
// but a proxy file always runs on the Node runtime and
// @opennextjs/cloudflare@1.20.2 rejects that outright: "Node.js middleware is
// not currently supported." `next build` accepts the rename, `build:cf` does
// not — so the migration stays parked until the adapter supports it.
export async function middleware(request: NextRequest) {
  const legacy = legacyHostRedirect(request)
  if (legacy) return legacy
  if (isSessionFreePath(request.nextUrl.pathname)) return NextResponse.next()
  return updateSession(request)
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
  if (pathname === '/api' || pathname.startsWith('/api/')) return null
  return NextResponse.redirect(`https://cracha-app.com${pathname}${search}`, 308)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
