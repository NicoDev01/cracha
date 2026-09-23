import { NextResponse, type NextRequest } from 'next/server'

import { isSessionFreePath } from '@/config/public-pages'
import { updateSession } from '@/lib/supabase/proxy'

// Next 16 renames this file to `proxy.ts` with an exported `proxy` function,
// but a proxy file always runs on the Node runtime and
// @opennextjs/cloudflare@1.20.2 rejects that outright: "Node.js middleware is
// not currently supported." `next build` accepts the rename, `build:cf` does
// not — so the migration stays parked until the adapter supports it.
export async function middleware(request: NextRequest) {
  if (isSessionFreePath(request.nextUrl.pathname)) return NextResponse.next()
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
