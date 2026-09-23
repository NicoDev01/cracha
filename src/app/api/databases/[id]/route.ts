import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getOwnedDatabase, coordinatorCommand } from '@/lib/server/database-registry'
import { deleteOwnedDatabase } from '@/lib/server/database-deletion'

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
  if (database.status === 'deleting') {
    return NextResponse.json({ success: false, error: 'Wissensbasis wird derzeit gelöscht.' }, { status: 409 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const current = await getOwnedDatabase(id, user.id)
  if (!current) return NextResponse.json({ success: false, error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  if (current.status === 'deleting') {
    return NextResponse.json({ success: false, error: 'Wissensbasis wird derzeit gelöscht.' }, { status: 409 })
  }

  const result = await coordinatorCommand<{ database: typeof current }>(id, 'update-metadata', {
    user_id: user.id, name: body?.name, description: body?.description,
  })
  return NextResponse.json({ success: true, database: result.database })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const { id } = await params
  const result = await deleteOwnedDatabase(user.id, id)
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  return NextResponse.json({ success: true })
}
