import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { cancelCrawlJob } from '@/lib/server/crawler-api'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const { jobId } = await params
  const env = getWorkerEnv()
  const job = await env.DATABASE_REGISTRY.get<{ user_id: string; database_id: string; hold_reference?: string }>(`crawl_job:${jobId}`, 'json')
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Crawl-Auftrag nicht gefunden.' }, { status: 404 })
  }

  const cancelled = await cancelCrawlJob({ jobId, databaseId: job.database_id, holdReference: job.hold_reference })
  if (!cancelled.ok && cancelled.stage === 'crawler') {
    return NextResponse.json({ success: false, error: 'Crawl konnte nicht abgebrochen werden.' }, { status: 502 })
  }
  // The DO must finish every admitted index write before the hold can be released.
  // The job record is kept on either failure so the same cancellation is retryable.
  if (!cancelled.ok) {
    return NextResponse.json({ success: false, error: 'Abbruch oder Guthabenfreigabe unvollständig; bitte erneut abbrechen.' }, { status: 503 })
  }
  return NextResponse.json({ success: true, status: 'cancelled' })
}
