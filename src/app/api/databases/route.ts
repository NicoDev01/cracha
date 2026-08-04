import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/supabase/server'
import { databaseRegistry, getOwnedDatabase, type DatabaseRecord, saveDatabase } from '@/lib/server/database-registry'

export const dynamic = 'force-dynamic'

function validPublicUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  try {
    const kv = databaseRegistry()
    const index = await kv.get<{ databases?: string[] }>(`user_index:${user.id}`, 'json')
    const records = await Promise.all((index?.databases ?? []).map((id) => getOwnedDatabase(id, user.id)))
    const databases = records
      .filter((database): database is DatabaseRecord => Boolean(database?.user_id === user.id))
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
    return NextResponse.json({ success: true, databases, count: databases.length, user_id: user.id })
  } catch (error) {
    console.error('Database listing failed', error)
    return NextResponse.json({ success: false, error: 'Wissensbasen konnten nicht geladen werden.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const sourceUrl = validPublicUrl(body?.url)
  if (!name || !sourceUrl) {
    return NextResponse.json({ success: false, error: 'Name und öffentliche HTTP(S)-URL sind erforderlich.' }, { status: 400 })
  }

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'kb'
    const id = `${slug}-${crypto.randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const database: DatabaseRecord = {
      id,
      name,
      description: typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : '',
      user_id: user.id,
      source_url: sourceUrl,
      url: sourceUrl,
      created_at: now,
      updated_at: now,
      last_crawl: null,
      document_count: 0,
      chunks_count: 0,
      pages_count: 0,
      status: 'pending',
    }
    const kv = databaseRegistry()
    const indexKey = `user_index:${user.id}`
    const index = await kv.get<{ databases?: string[] }>(indexKey, 'json')
    const databases = [...new Set([...(index?.databases ?? []), id])]
    await Promise.all([
      saveDatabase(database),
      kv.put(indexKey, JSON.stringify({ databases })),
    ])
    return NextResponse.json({ success: true, database }, { status: 201 })
  } catch (error) {
    console.error('Database creation failed', error)
    return NextResponse.json({ success: false, error: 'Wissensbasis konnte nicht erstellt werden.' }, { status: 503 })
  }
}
