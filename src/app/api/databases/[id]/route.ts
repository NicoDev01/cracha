import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getWorkerEnv } from '@/lib/server/cloudflare'
import { getOwnedDatabase, saveDatabase } from '@/lib/server/database-registry'
import { recordDeletedPages } from '@/lib/server/plan'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)
  if (!database) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  return NextResponse.json({ success: true, database })
}

export async function PUT(request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)
  if (!database) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const updated = {
    ...database,
    name: typeof body?.name === 'string' ? body.name.trim().slice(0, 120) || database.name : database.name,
    description: typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : database.description,
    updated_at: new Date().toISOString(),
  }
  await saveDatabase(updated)
  return NextResponse.json({ success: true, database: updated })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const database = await getOwnedDatabase(id, user.id)
  if (!database) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })

  const env = getWorkerEnv()
  const response = await env.RAG_API.fetch(`https://cracha-rag.internal/databases/${encodeURIComponent(id)}?user_id=${encodeURIComponent(user.id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}` },
  })
  const result = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    return NextResponse.json({ success: false, error: result.error ?? 'Löschen fehlgeschlagen.' }, { status: response.status })
  }

  // The record is gone, so the pages it cost would be gone with it. They are
  // written to a marker instead: crawling is what the quota pays for, and that
  // already happened. Only after the deletion succeeded, so a failed delete
  // does not charge for a knowledge base the user still has.
  await recordDeletedPages(user.id, database)
  return NextResponse.json({ success: true })
}
