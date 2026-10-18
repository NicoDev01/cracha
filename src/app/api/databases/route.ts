import { localeFromRequest } from '@/i18n/request-locale'
import { tr } from '@/i18n/server-messages'
import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/supabase/server'
import { createDatabase, type DatabaseRecord, getOwnedDatabase, listOwnedDatabaseIds } from '@/lib/server/database-registry'
import { CreditError } from '@/lib/server/credits'

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

export async function GET(request: NextRequest) {
  const locale = localeFromRequest(request)
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: tr(locale, 'Authentifizierung erforderlich.') }, { status: 401 })

  try {
    const ids = await listOwnedDatabaseIds(user.id)
    const records = await Promise.all(ids.map((id) => getOwnedDatabase(id, user.id)))
    // getOwnedDatabase already refuses anything this user does not own. The
    // second check is here because this list is what the chat's knowledge base
    // selector is built from, and a foreign entry appearing there is the one
    // failure the whole ownership model exists to prevent.
    const databases = records
      .filter((database): database is DatabaseRecord => Boolean(database?.user_id === user.id))
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
    return NextResponse.json({ success: true, databases, count: databases.length, user_id: user.id })
  } catch (error) {
    console.error('Database listing failed', error)
    return NextResponse.json({ success: false, error: tr(locale, 'Wissensbasen konnten nicht geladen werden.') }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const locale = localeFromRequest(request)
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: tr(locale, 'Authentifizierung erforderlich.') }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const sourceUrl = validPublicUrl(body?.url)
  if (!name || !sourceUrl) {
    return NextResponse.json({ success: false, error: tr(locale, 'Name und öffentliche HTTP(S)-URL sind erforderlich.') }, { status: 400 })
  }

  try {
    const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : ''
    const database = await createDatabase(user.id, name, sourceUrl, description)
    return NextResponse.json({ success: true, database }, { status: 201 })
  } catch (error) {
    if (error instanceof CreditError) {
      return NextResponse.json({ success: false, error: tr(locale, error.message), reason: error.reason, credits: error.state }, { status: 402 })
    }
    console.error('Database creation failed', error)
    return NextResponse.json({ success: false, error: tr(locale, 'Wissensbasis konnte nicht erstellt werden.') }, { status: 503 })
  }
}
