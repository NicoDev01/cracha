import { NextRequest, NextResponse } from 'next/server'

import { enqueueCrawl } from '@/lib/server/crawler-api'
import { getOwnedDatabase } from '@/lib/server/database-registry'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)
  if (!database) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })

  try {
    // No settings on purpose: enqueueCrawl reuses what the knowledge base was
    // built with. Passing defaults here silently re-crawled every base with
    // limit 100 and depth 2, regardless of how it was originally configured.
    const result = await enqueueCrawl({
      url: database.source_url,
      database_id: database.id,
    }, user.id)
    return NextResponse.json({ success: true, job_id: result.job_id, status: result.status ?? 'queued' }, { status: 202 })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Re-Crawl fehlgeschlagen.' }, { status: 502 })
  }
}
