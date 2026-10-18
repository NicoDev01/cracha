import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'

import { isSessionFreePath } from '@/config/public-pages'
import { delocalizePath } from '@/i18n/paths'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/proxy'
import { isApiPath, legacyHostRedirect } from '@/lib/legacy-host'

const handleI18nRouting = createIntlMiddleware(routing)

// Next 16 renames this file to `proxy.ts` with an exported `proxy` function,
// but a proxy file always runs on the Node runtime and
// @opennextjs/cloudflare@1.20.2 rejects that outright: "Node.js middleware is
// not currently supported." `next build` accepts the rename, `build:cf` does
// not — so the migration stays parked until the adapter supports it.
export async function middleware(request: NextRequest) {
  const legacy = legacyHostRedirect(request)
  if (legacy) return legacy

  // API routes have no language; everything else goes through next-intl,
  // which redirects by browser language or rewrites /pricing to /en/preise.
  if (isApiPath(request.nextUrl.pathname)) return updateSession(request)
  const response = handleI18nRouting(request)
  if (response.headers.has('location')) return response

  if (isSessionFreePath(delocalizePath(request.nextUrl.pathname).path)) return response
  return updateSession(request, response)
}

export const config = {
  // Metadata routes (robots, sitemap, Open Graph images) have no language.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'],
}
