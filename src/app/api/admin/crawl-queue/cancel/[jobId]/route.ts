import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { releaseCrawlCredits } from '@/lib/server/credits'
import { getOwnedDatabase, saveDatabase } from '@/lib/server/database-registry'
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
  if (!response.ok || result?.status !== 'cancelled') {
    return NextResponse.json({ success: false, error: 'Crawl konnte nicht abgebrochen werden.' }, { status: 502 })
  }

  // Keep the job record until the idempotent release succeeds, so retrying a
  // failed refund can still locate the hold. Never release on a failed cancel.
  if (job.hold_reference) {
    try {
      await releaseCrawlCredits(job.hold_reference)
    } catch {
      return NextResponse.json({ success: false, error: 'Crawl gestoppt. Guthabenfreigabe fehlgeschlagen; bitte erneut abbrechen.' }, { status: 503 })
    }
  }

  const database = await getOwnedDatabase(job.database_id, user.id)
  if (database) {
    await saveDatabase({
      ...database,
      status: 'failed',
      updated_at: new Date().toISOString(),
      last_error: 'Vom Benutzer abgebrochen.',
    })
  }
  await env.DATABASE_REGISTRY.delete(`crawl_job:${jobId}`)
  return NextResponse.json({ success: true, status: 'cancelled' })
}
