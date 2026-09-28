import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { settleCrawlCredits } from '@/lib/server/credits'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TERMINAL = new Set(['completed', 'failed', 'cancelled'])
const STATUS_TIMEOUT_MS = 8_000

/**
 * The latest pages the crawler read, for the live list in the crawl view. The
 * titles come from other people's websites, so only plain strings of bounded
 * length and http(s) URLs pass.
 */
function recentPages(value: unknown): Array<{ url: string; title: string }> | undefined {
  if (!Array.isArray(value)) return undefined
  return value.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const { url, title } = entry as { url?: unknown; title?: unknown }
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return []
    return [{ url: url.slice(0, 300), title: typeof title === 'string' ? title.slice(0, 120) : '' }]
  })
}

/** Pages the crawl reached and did not index, with the crawler's reason. */
function skippedPages(value: unknown): Array<{ url: string; reason: string }> | undefined {
  if (!Array.isArray(value)) return undefined
  return value.slice(0, 50).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const { url, reason } = entry as { url?: unknown; reason?: unknown }
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return []
    return [{ url: url.slice(0, 300), reason: typeof reason === 'string' ? reason.slice(0, 120) : '' }]
  })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const { jobId } = await params
  const env = getWorkerEnv()
  const job = await env.DATABASE_REGISTRY.get<{ user_id: string; database_id: string; hold_reference?: string }>(`crawl_job:${jobId}`, 'json')
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Crawl-Auftrag nicht gefunden.' }, { status: 404 })
  }

  let response: Response
  try {
    // The crawler answers in well under a second. Without a bound, one request
    // lost while Modal replaced its container hung for two minutes, and since
    // the page asks again only after an answer, progress froze with it.
    response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/status/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}` },
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Status vorübergehend nicht erreichbar.' }, { status: 504 })
  }
  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean
    status?: string
    phase?: 'queued' | 'crawling' | 'indexing' | 'completed' | 'failed' | 'cancelled'
    error?: string
    result?: {
      pages_count?: number
      chunks_count?: number
      skipped_count?: number
      indexed_pages?: number
      indexing_pending?: number
      indexing_complete?: boolean
      recent_pages?: unknown
      skipped_pages?: unknown
    }
    progress?: {
      stage?: string
      current?: number
      total?: number
      percent?: number
      pages_count?: number
      skipped_count?: number
      chunks_count?: number
      url?: string
    }
  }
  if (!response.ok && response.status !== 202) {
    return NextResponse.json({ success: false, status: 'failed', error: result.error ?? 'Statusabfrage fehlgeschlagen.' }, { status: 502 })
  }

  // Polling is only a fallback; the crawler settles independently via callback.
  const status = result.status ?? 'running'
  let settledCredits: number | undefined
  if (job.hold_reference && TERMINAL.has(status)) {
    try {
      const settlement = await settleCrawlCredits(job.hold_reference, status !== 'completed' ? 0 : (result.result?.indexed_pages ?? result.result?.pages_count ?? 0))
      if (settlement.settled) settledCredits = settlement.spent
    } catch (error) {
      // A failed settlement must not hide the crawl result from the user. The
      // durable crawler callback will retry the settlement.
      console.error(JSON.stringify({
        event: 'crawl_settlement_failed',
        job_id: jobId,
        error: error instanceof Error ? error.message : 'unknown',
      }))
    }
  }

  return NextResponse.json({
    success: result.success !== false,
    job_id: jobId,
    status,
    credits_charged: settledCredits,
    phase: result.phase,
    error: result.error,
    progress: result.progress,
    config: { tenant_id: job.database_id },
    result: result.result
      ? {
          pages_count: result.result.pages_count ?? 0,
          chunks_count: result.result.chunks_count ?? 0,
          skipped_count: result.result.skipped_count ?? 0,
          indexed_pages: result.result.indexed_pages,
          indexing_pending: result.result.indexing_pending,
          indexing_complete: result.result.indexing_complete,
          recent_pages: recentPages(result.result.recent_pages),
          skipped_pages: skippedPages(result.result.skipped_pages),
        }
      : undefined,
  })
}
