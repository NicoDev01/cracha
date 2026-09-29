'use client'

import { apiFetch } from '@/lib/api/request'
import type { ChatConversation, ChatSummary, StoredChatMessage } from '@/types/chat'

/** The server said no for good (not found, invalid); retrying will not help. */
export class ChatHistoryRejected extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ChatHistoryRejected'
  }
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(input, init)
  const body = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string } & T
  if (!response.ok || body.success === false) {
    const message = body.error ?? `Chatverlauf nicht erreichbar (${response.status}).`
    if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 429) {
      throw new ChatHistoryRejected(message, response.status)
    }
    throw new Error(message)
  }
  return body
}

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function listChats(): Promise<ChatSummary[]> {
  return (await call<{ chats: ChatSummary[] }>('/api/chats')).chats ?? []
}

export async function getChat(id: string): Promise<{ conversation: ChatSummary; messages: StoredChatMessage[] }> {
  return call(`/api/chats/${encodeURIComponent(id)}`)
}

export async function renameChat(id: string, title: string): Promise<ChatSummary> {
  return (await call<{ chat: ChatSummary }>(`/api/chats/${encodeURIComponent(id)}`, { method: 'PATCH', ...json({ title }) })).chat
}

export async function deleteChat(id: string): Promise<void> {
  await call(`/api/chats/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Hands a conversation kept by this browser to the account. */
export async function importChat(conversation: ChatConversation): Promise<boolean> {
  return (await call<{ imported?: boolean }>('/api/chats/import', { method: 'POST', ...json(conversation) })).imported === true
}
