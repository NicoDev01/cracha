import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { getOwnedDatabase, saveDatabase } from '@/lib/server/database-registry'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const { jobId } = await params
  const env = getWorkerEnv()
  const job = await env.DATABASE_REGISTRY.get<{ user_id: string; database_id: string }>(`crawl_job:${jobId}`, 'json')
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Crawl-Auftrag nicht gefunden.' }, { status: 404 })
  }

  const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/cancel/${encodeURIComponent(jobId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}` },
  })
  if (!response.ok) {
    return NextResponse.json({ success: false, error: 'Crawl konnte nicht abgebrochen werden.' }, { status: 502 })
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
