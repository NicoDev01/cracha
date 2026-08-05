import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const { jobId } = await params
  const env = getWorkerEnv()
  const job = await env.DATABASE_REGISTRY.get<{ user_id: string; database_id: string }>(`crawl_job:${jobId}`, 'json')
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

  return NextResponse.json({
    success: result.success !== false,
    job_id: jobId,
    status: result.status ?? 'running',
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
