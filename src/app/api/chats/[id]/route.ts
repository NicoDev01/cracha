import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { cleanTitle, MAX_TITLE_LENGTH } from '@/lib/chat/history'
import { deleteConversation, getConversation, renameConversation } from '@/lib/server/chat-history'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

const conversationId = z.string().uuid()
const NOT_FOUND = 'Chat nicht gefunden.'
const UNAVAILABLE = 'Der Chatverlauf ist gerade nicht erreichbar. Bitte versuche es erneut.'

/**
 * One conversation of the signed-in account. The user id comes from the
 * session only; an id that belongs to someone else reads as not found.
 */
async function owner(params: Context['params']): Promise<{ response: NextResponse } | { userId: string; id: string }> {
  const user = await getAuthenticatedUser()
  if (!user) return { response: NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 }) }
  const id = conversationId.safeParse((await params).id)
  if (!id.success) return { response: NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 }) }
  return { userId: user.id, id: id.data }
}

function unavailable(event: string, error: unknown) {
  console.error(JSON.stringify({ event, reason: String(error) }))
  return NextResponse.json({ success: false, error: UNAVAILABLE }, { status: 503 })
}

export async function GET(_request: NextRequest, { params }: Context) {
  const target = await owner(params)
  if ('response' in target) return target.response
  try {
    const chat = await getConversation(target.userId, target.id)
    if (!chat) return NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 })
    return NextResponse.json({ success: true, ...chat })
  } catch (error) {
    return unavailable('chat_history_read_failed', error)
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const target = await owner(params)
  if ('response' in target) return target.response
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null
  const title = typeof body?.title === 'string' ? cleanTitle(body.title.slice(0, MAX_TITLE_LENGTH * 4)) : ''
  if (!title) return NextResponse.json({ success: false, error: 'Bitte gib einen Namen ein.' }, { status: 400 })
  try {
    const chat = await renameConversation(target.userId, target.id, title)
    if (!chat) return NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 })
    return NextResponse.json({ success: true, chat })
  } catch (error) {
    return unavailable('chat_history_rename_failed', error)
  }
}

/** Deleting what is already gone succeeds, so a retry after a lost reply is harmless. */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const target = await owner(params)
  if ('response' in target) return target.response
  try {
    await deleteConversation(target.userId, target.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return unavailable('chat_history_delete_failed', error)
  }
}
