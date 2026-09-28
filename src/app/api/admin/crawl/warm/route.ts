import { NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Wakes the crawler while the form is being filled in. Starting a crawl asks
 * the crawler for its health first, and on a cold container that alone took
 * 6.7 of the 9.4 seconds between the click and the crawl starting. The form
 * calls this when it opens and does not wait for the answer.
 */
export async function POST() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false }, { status: 401 })
  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL) return new NextResponse(null, { status: 204 })
  await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(15_000) })
    .catch(() => undefined)
  return new NextResponse(null, { status: 204 })
}
