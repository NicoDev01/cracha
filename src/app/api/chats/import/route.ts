import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { cleanTitle, provisionalTitle } from '@/lib/chat/history'
import { importConversation } from '@/lib/server/chat-history'
import { admitRequest } from '@/lib/server/credits'
import { getOwnedDatabase } from '@/lib/server/database-registry'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import type { StoredChatMessage } from '@/types/chat'

export const dynamic = 'force-dynamic'

/** 200 messages of long answers with their sources fit; anything larger was not written by the app. */
const MAX_BODY = 4_000_000

const source = z.object({
  id: z.string().max(500),
  title: z.string().max(1_000),
  url: z.string().max(2_000),
  snippet: z.string().max(5_000).default(''),
  relevance_score: z.number().finite().default(0),
})

const legacyConversation = z.object({
  id: z.string().uuid(),
  databaseId: z.string().trim().min(1).max(160),
  title: z.string().max(1_000).default(''),
  messages: z.array(z.object({
    type: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(100_000),
    timestamp: z.string().datetime({ offset: true }).or(z.string().length(0)).optional(),
    sources: z.array(source).max(50).optional(),
    metadata: z.record(z.unknown()).optional(),
    isError: z.boolean().optional(),
  })).min(1).max(200),
})

/**
 * Takes over one conversation that the browser kept before the history moved
 * to the server. It can only land in the caller's own account and only under a
 * knowledge base the caller still owns; importing it twice changes nothing.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const text = await request.text().catch(() => '')
  if (text.length > MAX_BODY) return NextResponse.json({ success: false, error: 'Chat ist zu groß.' }, { status: 413 })
  let json: unknown = null
  try { json = JSON.parse(text) } catch { /* Refused below. */ }
  const parsed = legacyConversation.safeParse(json)
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Chat ist ungültig.' }, { status: 400 })
  const chat = parsed.data

  try {
    if (!(await admitRequest(user.id, 'chat_import', 120, 3600))) {
      return NextResponse.json({ success: false, error: 'Zu viele Anfragen.' }, { status: 429, headers: { 'Retry-After': '3600' } })
    }
    // A conversation about a knowledge base that is gone has nothing to be filed under.
    if (!(await getOwnedDatabase(chat.databaseId, user.id))) return NextResponse.json({ success: true, imported: false })

    const messages = chat.messages
      .filter((message) => message.type !== 'system' && message.content.trim())
      .map((message) => {
        const metadata = message.metadata && JSON.stringify(message.metadata).length <= 50_000
          ? message.metadata as StoredChatMessage['metadata']
          : null
        const written = message.timestamp ? new Date(message.timestamp) : null
        return {
          role: message.type as 'user' | 'assistant',
          content: message.content,
          sources: message.sources ?? [],
          metadata: message.type === 'assistant' ? metadata : null,
          is_error: message.isError === true,
          created_at: (written && Number.isFinite(written.getTime()) ? written : new Date(0)).toISOString(),
        }
      })
    if (!messages.length) return NextResponse.json({ success: true, imported: false })
    const firstQuestion = messages.find((message) => message.role === 'user')?.content ?? ''
    const title = cleanTitle(chat.title) || provisionalTitle(firstQuestion)

    const result = await importConversation({ userId: user.id, conversationId: chat.id, databaseId: chat.databaseId, title, messages })
    if (!result.ok) return NextResponse.json({ success: false, error: 'Chat nicht gefunden.' }, { status: 404 })
    return NextResponse.json({ success: true, imported: result.imported })
  } catch (error) {
    console.error(JSON.stringify({ event: 'chat_history_import_failed', reason: String(error) }))
    return NextResponse.json({ success: false, error: 'Der Chatverlauf ist gerade nicht erreichbar.' }, { status: 503 })
  }
}
