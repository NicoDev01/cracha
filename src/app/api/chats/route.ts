import { NextResponse } from 'next/server'

import { listConversations } from '@/lib/server/chat-history'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** The signed-in account's conversations, most recent first, without messages. */
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })
  try {
    return NextResponse.json({ success: true, chats: await listConversations(user.id) })
  } catch (error) {
    console.error(JSON.stringify({ event: 'chat_history_list_failed', reason: String(error) }))
    return NextResponse.json({ success: false, error: 'Chats konnten nicht geladen werden.' }, { status: 503 })
  }
}
