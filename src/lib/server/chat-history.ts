import 'server-only'

import { creditsAdmin } from './credits'
import { provisionalTitle } from '@/lib/chat/history'
import type { ChatSummary, StoredChatMessage } from '@/types/chat'

/**
 * The chat history of an account, in PostgreSQL. Like the ledger it is reached
 * only with the service role, and every query is bound to the user id the
 * caller took from the verified session: a conversation id alone never opens
 * anything.
 */

/** The sidebar shows the most recent ones; more is not something to scroll through. */
const LIST_LIMIT = 300

interface ConversationRow {
  id: string
  database_id: string
  title: string
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: StoredChatMessage['sources'] | null
  metadata: StoredChatMessage['metadata'] | null
  is_error: boolean
  created_at: string
}

const SUMMARY_COLUMNS = 'id,database_id,title,created_at,updated_at'

function summary(row: ConversationRow): ChatSummary {
  return { id: row.id, databaseId: row.database_id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at }
}

export async function listConversations(userId: string): Promise<ChatSummary[]> {
  const { data, error } = await creditsAdmin()
    .from('chat_conversations').select(SUMMARY_COLUMNS)
    .eq('user_id', userId).order('updated_at', { ascending: false }).limit(LIST_LIMIT)
  if (error) throw new Error(`chat_conversations: ${error.message}`)
  return (data as ConversationRow[]).map(summary)
}

export async function getConversation(userId: string, id: string): Promise<{ conversation: ChatSummary; messages: StoredChatMessage[] } | null> {
  const admin = creditsAdmin()
  const { data, error } = await admin
    .from('chat_conversations').select(SUMMARY_COLUMNS)
    .eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`chat_conversations: ${error.message}`)
  if (!data) return null
  const messages = await admin
    .from('chat_messages').select('id,role,content,sources,metadata,is_error,created_at')
    .eq('conversation_id', id).order('position', { ascending: true })
  if (messages.error) throw new Error(`chat_messages: ${messages.error.message}`)
  return {
    conversation: summary(data as ConversationRow),
    messages: (messages.data as MessageRow[]).map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      sources: row.sources ?? [],
      metadata: row.metadata ?? undefined,
      isError: row.is_error,
      createdAt: row.created_at,
    })),
  }
}

export async function renameConversation(userId: string, id: string, title: string): Promise<ChatSummary | null> {
  const { data, error } = await creditsAdmin()
    .from('chat_conversations').update({ title, title_source: 'user' })
    .eq('id', id).eq('user_id', userId).select(SUMMARY_COLUMNS).maybeSingle()
  if (error) throw new Error(`chat_conversations: ${error.message}`)
  return data ? summary(data as ConversationRow) : null
}

/** False when there was nothing of this user's to delete. */
export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const { data, error } = await creditsAdmin()
    .from('chat_conversations').delete().eq('id', id).eq('user_id', userId).select('id')
  if (error) throw new Error(`chat_conversations: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/** Part of deleting a knowledge base; safe to repeat. */
export async function deleteDatabaseConversations(userId: string, databaseId: string): Promise<void> {
  const { error } = await creditsAdmin()
    .from('chat_conversations').delete().eq('user_id', userId).eq('database_id', databaseId)
  if (error) throw new Error(`chat_conversations: ${error.message}`)
}

export type RecordResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: 'not_found' | 'database_mismatch' | 'full' }

export interface RecordInput {
  userId: string
  conversationId: string
  databaseId: string
  role: 'user' | 'assistant'
  content: string
  sources?: StoredChatMessage['sources']
  metadata?: StoredChatMessage['metadata']
  isError?: boolean
  /** Replaces the provisional title unless the user has renamed the conversation. */
  generatedTitle?: string | null
}

/**
 * Appends one message. A question opens its conversation if needed, with the
 * question as provisional title; an answer only ever joins an existing one.
 */
export async function recordMessage(input: RecordInput): Promise<RecordResult> {
  const { data, error } = await creditsAdmin().rpc('chat_record', {
    p_user: input.userId,
    p_conversation: input.conversationId,
    p_database: input.databaseId,
    p_title: provisionalTitle(input.content),
    p_role: input.role,
    p_content: input.content.slice(0, 100_000),
    p_sources: input.sources ?? [],
    p_metadata: input.metadata ?? null,
    p_is_error: input.isError ?? false,
    p_generated_title: input.generatedTitle ?? null,
  })
  if (error) throw new Error(`chat_record: ${error.message}`)
  return data as RecordResult
}

export interface ImportInput {
  userId: string
  conversationId: string
  databaseId: string
  title: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    sources: StoredChatMessage['sources']
    metadata: StoredChatMessage['metadata'] | null
    is_error: boolean
    created_at: string
  }>
}

/** `ok: false` when the id belongs to another account. */
export async function importConversation(input: ImportInput): Promise<{ ok: boolean; imported: boolean }> {
  const { data, error } = await creditsAdmin().rpc('chat_import', {
    p_user: input.userId,
    p_conversation: input.conversationId,
    p_database: input.databaseId,
    p_title: input.title,
    p_messages: input.messages,
  })
  if (error) throw new Error(`chat_import: ${error.message}`)
  return data as { ok: boolean; imported: boolean }
}
