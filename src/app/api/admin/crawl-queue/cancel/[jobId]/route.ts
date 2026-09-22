import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { releaseCrawlCredits } from '@/lib/server/credits'
import { coordinatorCommand } from '@/lib/server/database-registry'
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

  const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/cancel/${encodeURIComponent(jobId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}` },
  })
  const result = await response.json().catch(() => null) as { status?: unknown } | null
  const isCancelled = (response.ok && result?.status === 'cancelled') || response.status === 404
  if (!isCancelled) {
    return NextResponse.json({ success: false, error: 'Crawl konnte nicht abgebrochen werden.' }, { status: 502 })
  }

  // The DO must finish every admitted index write before the hold can be released.
  // Keep the job record on either failure so the same cancellation is retryable.
  try {
    await coordinatorCommand(job.database_id, 'cancel-job', {
      jobId, reason: response.status === 404 ? 'Crawl-Auftrag wurde im Crawler nicht gefunden und storniert.' : 'Vom Benutzer abgebrochen.',
    })
    if (job.hold_reference) await releaseCrawlCredits(job.hold_reference)
  } catch {
    return NextResponse.json({ success: false, error: 'Abbruch oder Guthabenfreigabe unvollständig; bitte erneut abbrechen.' }, { status: 503 })
  }

  await env.DATABASE_REGISTRY.delete(`crawl_job:${jobId}`)
  return NextResponse.json({ success: true, status: 'cancelled' })
}
