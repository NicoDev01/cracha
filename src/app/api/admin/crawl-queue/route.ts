import { NextRequest, NextResponse } from 'next/server'

import { enqueueCrawl, type CrawlInput } from '@/lib/server/crawler-api'
import { QuotaError } from '@/lib/server/plan'
import { getAuthenticatedUser } from '@/lib/supabase/server'

function stringList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,\s]+/) : []
  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.url !== 'string') {
    return NextResponse.json({ success: false, error: 'url ist erforderlich.' }, { status: 400 })
  }

  try {
    const input: CrawlInput = {
      url: body.url,
      // Only an id the caller already owns is accepted here; a new knowledge
      // base is identified by its name and gets its id from the server.
      database_id: typeof body.database_id === 'string' && body.database_id ? body.database_id : undefined,
      database_name: typeof body.database_name === 'string' ? body.database_name.trim().slice(0, 160) : undefined,
      type: body.type === 'single' || body.type === 'sitemap' ? body.type : 'recursive',
      max_depth: typeof body.max_depth === 'number' ? body.max_depth : 2,
      limit: typeof body.limit === 'number' ? body.limit : 100,
      include_patterns: stringList(body.include_patterns),
      exclude_patterns: [
        ...stringList(body.exclude_patterns),
        ...stringList(body.exclude_domains).map((domain) => `*://${domain}/*`),
      ].slice(0, 20),
      respect_robots_txt: body.respect_robots_txt !== false,
    }
    const result = await enqueueCrawl(input, user.id)
    return NextResponse.json({
      success: true,
      job_id: result.job_id,
      database_id: result.database_id,
      status: result.status ?? 'queued',
      page_limit: result.page_limit,
      requested_page_limit: result.requested_page_limit,
    }, { status: 202 })
  } catch (error) {
    // A quota is not a service failure, and logging it as one would bury the
    // real ones. 402 tells the interface to offer the upgrade instead of
    // suggesting a retry.
    if (error instanceof QuotaError) {
      return NextResponse.json({ success: false, error: error.message, reason: error.reason, usage: error.usage }, { status: 402 })
    }
    console.error('Crawl enqueue failed', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Crawl konnte nicht gestartet werden.' }, { status: 502 })
  }
}
