import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session cookie.
 *
 * `base` is the response the language routing already decided on — usually
 * a rewrite from /dashboard to /de/dashboard. The refreshed cookie goes onto
 * that response for the browser, and onto the forwarded request so the page
 * rendered behind the rewrite reads the new token, not the expired one.
 */
export async function updateSession(request: NextRequest, base: NextResponse = NextResponse.next({ request })) {
  // A prefetch is speculative and discards the refreshed cookie anyway, so
  // verifying the session for it only burns CPU. A burst of them competing
  // with the real request is what pushed the Worker over its limit.
  if (request.headers.get('next-router-prefetch') === '1') return base

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return base

  const response = base
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        forwardRequestHeaders(request, response)
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value)
        })
      },
    },
  })

  await supabase.auth.getClaims()
  return response
}

/**
 * NextResponse.next({ request }) passes a changed request on through
 * `x-middleware-override-headers` and `x-middleware-request-*`. A rewrite
 * from next-intl already carries its own overrides (the locale header), so the
 * two lists are merged instead of one replacing the other.
 */
function forwardRequestHeaders(request: NextRequest, response: NextResponse) {
  const carrier = NextResponse.next({ request })
  const overrideKey = 'x-middleware-override-headers'
  const merged = new Set(
    [response.headers.get(overrideKey), carrier.headers.get(overrideKey)]
      .flatMap((list) => (list ? list.split(',') : []))
      .map((name) => name.trim())
      .filter(Boolean),
  )
  carrier.headers.forEach((value, key) => {
    if (key.startsWith('x-middleware-request-')) response.headers.set(key, value)
  })
  if (merged.size) response.headers.set(overrideKey, [...merged].join(','))
}
