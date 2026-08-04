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
    const result = await enqueueCrawl({
      url: database.source_url,
      tenant_id: database.id,
      type: 'recursive',
      max_depth: 2,
      limit: 100,
      respect_robots_txt: true,
    }, user.id)
    return NextResponse.json({ success: true, job_id: result.job_id, status: result.status ?? 'queued' }, { status: 202 })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Re-Crawl fehlgeschlagen.' }, { status: 502 })
  }
}
