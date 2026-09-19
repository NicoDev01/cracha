import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { settleCrawlCredits } from '@/lib/server/credits'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TERMINAL = new Set(['completed', 'failed', 'cancelled'])

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const { jobId } = await params
  const env = getWorkerEnv()
  const job = await env.DATABASE_REGISTRY.get<{ user_id: string; database_id: string; hold_reference?: string }>(`crawl_job:${jobId}`, 'json')
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Crawl-Auftrag nicht gefunden.' }, { status: 404 })
  }

  const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/status/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}` },
  })
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

  // The crawl is over, so the hold becomes a charge for the pages that were
  // actually fetched and the rest goes back. This runs on the polling route
  // because it is the only place that learns the final count while holding a
  // Supabase connection — the RAG worker, which sees it first, has no service
  // key and should not be given one for this.
  //
  // Settling is idempotent: the hold is gone after the first call, so the
  // polls that follow move nothing. A crawl whose tab was closed before the
  // last poll is caught by the 24-hour reaper in credit_state instead.
  const status = result.status ?? 'running'
  let settledCredits: number | undefined
  if (job.hold_reference && TERMINAL.has(status)) {
    try {
      const settlement = await settleCrawlCredits(job.hold_reference, status === 'cancelled' ? 0 : (result.result?.indexed_pages ?? result.result?.pages_count ?? 0))
      if (settlement.settled) settledCredits = settlement.spent
    } catch (error) {
      // A failed settlement must not hide the crawl result from the user. The
      // reaper releases the hold either way.
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
        }
      : undefined,
  })
}
