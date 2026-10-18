import { localeFromRequest } from '@/i18n/request-locale'
import { tr } from '@/i18n/server-messages'
import { NextRequest, NextResponse } from 'next/server'

import { listConversations } from '@/lib/server/chat-history'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** The signed-in account's conversations, most recent first, without messages. */
export async function GET(request: NextRequest) {
  const locale = localeFromRequest(request)
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: tr(locale, 'Authentifizierung erforderlich.') }, { status: 401 })
  try {
    return NextResponse.json({ success: true, chats: await listConversations(user.id) })
  } catch (error) {
    console.error(JSON.stringify({ event: 'chat_history_list_failed', reason: String(error) }))
    return NextResponse.json({ success: false, error: tr(locale, 'Chats konnten nicht geladen werden.') }, { status: 503 })
  }
}
