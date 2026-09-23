'use client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ChatState, ChatConversation, Message } from '@/types/chat'
import { streamChatQuery } from '@/lib/api/chat-api'
import { createTextSmoother } from '@/lib/chat/smooth-text'

let active: { controller: AbortController; owner: string; conversation: string } | null = null

/**
 * Every streamed piece changes the state, and persisting serialises every
 * conversation into localStorage — dozens of times a second during an answer,
 * on the thread that also has to render it. While an answer streams, writes
 * are coalesced to one per second; any other change, above all an account
 * switch that must clear the old history, is still written at once.
 */
const STREAMING_WRITE_INTERVAL_MS = 1_000
let queuedWrite: { key: string; value: string } | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

function writeNow(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    window.dispatchEvent(new Event('cracha:chat-storage-full'))
  }
}

function cancelQueuedWrite() {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = null
  queuedWrite = null
}

function flushQueuedWrite() {
  const write = queuedWrite
  cancelQueuedWrite()
  if (write) writeNow(write.key, write.value)
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', flushQueuedWrite)
const empty = { messages: [] as Message[], conversations: {} as Record<string, ChatConversation>, selectedDatabase: null, selectedConversation: null, isLoading: false, isStreaming: false, retrievalProgress: null, error: null, byokApiKey: null as string | null, byokModel: null as string | null, chatMode: 'default' as 'default' | 'verification' }
export function restoreConversations(value: unknown): Record<string, ChatConversation> {
  if (!value || typeof value !== 'object') return {}
  const restored: Record<string, ChatConversation> = {}
  for (const [id, raw] of Object.entries(value).slice(-50)) {
    if (!raw || typeof raw !== 'object' || typeof raw.databaseId !== 'string' || !Array.isArray(raw.messages)) continue
    const messages: Message[] = raw.messages.filter((message: Message) => message && typeof message.content === 'string' && typeof message.id === 'string' && ['user', 'assistant', 'system'].includes(message.type)).slice(-200).map((message: Message) => {
      const timestamp = new Date(message.timestamp)
      return { ...message, timestamp: Number.isFinite(timestamp.getTime()) ? timestamp : new Date(0), isStreaming: false, isError: message.isError || message.isStreaming }
    })
    restored[id] = { id, databaseId: raw.databaseId, title: typeof raw.title === 'string' ? raw.title : 'Unterhaltung', messages }
  }
  return restored
}
export const useChatStore = create<ChatState>()(persist((set, get) => ({
  ...empty, ownerId: null,
  claimFor(ownerId) {
    if (get().ownerId === ownerId) return
    active?.controller.abort(); active = null
    set({ ...empty, ownerId, byokApiKey: null, byokModel: null, chatMode: get().chatMode })
  },
  setChatMode(mode) { set({ chatMode: mode }) },
  stop() { active?.controller.abort() },
  selectDatabase(databaseId) {
    if (databaseId === get().selectedDatabase) return
    active?.controller.abort()
    const conversation = Object.values(get().conversations).reverse().find(item => item.databaseId === databaseId)
    set({ selectedDatabase: databaseId, selectedConversation: conversation?.id ?? null, messages: conversation?.messages ?? [], error: null })
  },
  selectConversation(id) {
    const conversation = get().conversations[id]
    if (!conversation) return
    active?.controller.abort()
    set({ selectedDatabase: conversation.databaseId, selectedConversation: id, messages: conversation.messages, error: null })
  },
  newConversation() { active?.controller.abort(); set({ selectedConversation: null, messages: [], error: null }) },
  clearChat() {
    active?.controller.abort()
    const conversations = { ...get().conversations }
    if (get().selectedConversation) delete conversations[get().selectedConversation!]
    set({ conversations, selectedConversation: null, messages: [], error: null })
  },
  feedback(id, value) {
    const key = get().selectedConversation
    if (!key) return
    const messages = get().messages.map(message => message.id === id ? { ...message, feedback: message.feedback === value ? undefined : value } : message)
    set({ messages, conversations: { ...get().conversations, [key]: { ...get().conversations[key], messages } } })
  },
  setError(error) { set({ error }) },
  setByokApiKey(key) { set({ byokApiKey: key ? key.trim() : null }) },
  setByokModel(model) { set({ byokModel: model ? model.trim() : null }) },
  async sendMessage(question) {
    const state = get()
    if (active || !state.ownerId || !state.selectedDatabase || !question.trim()) return false
    const trimmed = question.trim()
    if (trimmed.length > 4_000) {
      set({ error: `Eingabe zu lang (${trimmed.length} Zeichen). Maximal 4.000 Zeichen sind zulässig.` })
      return false
    }
    if (state.messages.length >= 198) { set({ error: 'Diese Unterhaltung ist lang. Bitte starte einen neuen Chat.' }); return false }
    if (!state.selectedConversation && Object.keys(state.conversations).length >= 50) { set({ error: 'Bitte lösche eine alte Unterhaltung, bevor du einen neuen Chat startest.' }); return false }
    const key = state.selectedConversation ?? crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    const request = { controller: new AbortController(), owner: state.ownerId, conversation: key }
    active = request
    const conversation: ChatConversation = { id: key, databaseId: state.selectedDatabase, title: state.conversations[key]?.title ?? question.slice(0, 70), messages: [...state.messages, { id: crypto.randomUUID(), type: 'user', content: question, timestamp: new Date() }] }
    set({ selectedConversation: key, messages: conversation.messages, conversations: { ...state.conversations, [key]: conversation }, isLoading: true, isStreaming: false, retrievalProgress: null, error: null })
    const update = (transform: (messages: Message[]) => Message[]) => {
      if (get().ownerId !== request.owner || !get().conversations[key]) return
      set(current => {
        const previous = current.conversations[key]
        const messages = transform(previous.messages)
        return { conversations: { ...current.conversations, [key]: { ...previous, messages } }, ...(current.selectedConversation === key ? { messages } : {}) }
      })
    }
    let complete = false
    let doneMetadata: Message['metadata']
    const smoother = createTextSmoother(text => update(messages => messages.map(message => message.id === assistantId ? { ...message, content: message.content + text } : message)))
    try {
      await streamChatQuery({
        request_id: crypto.randomUUID(),
        tenant_id: state.selectedDatabase,
        question,
        messages: state.messages.filter(message => !message.isError && ['user', 'assistant'].includes(message.type) && message.content.trim()).slice(-12).map(message => ({ role: message.type as 'user' | 'assistant', content: message.content })),
        api_key: state.byokApiKey || undefined,
        model: state.byokModel || undefined,
        mode: state.chatMode,
      }, {
        onProgress(progress) {
          // Merged, because a later step does not repeat what an earlier one said.
          if (active === request && get().ownerId === request.owner) set({ retrievalProgress: { ...get().retrievalProgress, ...progress } })
        },
        onStart({ sources, model, requestedModel, fallback, fallbackReason, fallbackDetail }) {
          update(messages => [...messages, { id: assistantId, type: 'assistant', content: '', timestamp: new Date(), sources, isStreaming: true, metadata: { query_time: 0, model_used: model, requested_model: requestedModel, fallback, fallback_reason: fallbackReason, fallback_detail: fallbackDetail } }])
          if (active === request && get().ownerId === request.owner) set({ isLoading: false, isStreaming: true })
        },
        onDelta(text) { smoother.push(text) },
        onDone(metadata) { complete = true; doneMetadata = metadata },
      }, request.controller.signal)
      // The answer is finished only once the reader has seen all of it.
      await smoother.drain()
      if (complete) update(messages => messages.map(message => message.id === assistantId ? { ...message, isStreaming: false, metadata: doneMetadata } : message))
      // A model without quota or without access fails the same way next time,
      // and trying it first cost every answer several seconds. The one that
      // answered takes its place until the reader picks another.
      const substitute = doneMetadata?.substitute_reason
      if (doneMetadata?.requested_model && (substitute === 'byok_quota' || substitute === 'byok_model') && get().byokModel === state.byokModel) {
        set({ byokModel: doneMetadata.model_used })
      }
      return complete
    } catch (error) {
      smoother.flush()
      const detail = request.controller.signal.aborted ? 'Antwort gestoppt. Bereits begonnene Antworten werden berechnet; dieser Text ist unvollständig.' : error instanceof Error ? error.message : 'Die Anfrage ist fehlgeschlagen.'
      update(messages => messages.some(message => message.id === assistantId)
        ? messages.map(message => message.id === assistantId ? { ...message, content: message.content ? `${message.content}\n\n${detail}` : detail, isError: true, isStreaming: false } : message)
        : [...messages, { id: assistantId, type: 'assistant', content: detail, timestamp: new Date(), isError: true }])
      return false
    } finally {
      if (active === request) { active = null; set({ isLoading: false, isStreaming: false, retrievalProgress: null }) }
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cracha:credits-changed'))
    }
  },
}), {
  name: 'cracha-chat-store', version: 2,
  storage: createJSONStorage(() => ({
    getItem: (key) => {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.state && ('byokApiKey' in parsed.state || 'byokModel' in parsed.state)) {
          delete parsed.state.byokApiKey
          delete parsed.state.byokModel
          const sanitized = JSON.stringify(parsed)
          localStorage.setItem(key, sanitized)
          return sanitized
        }
      } catch {
        // ignore parse error
      }
      return raw
    },
    removeItem: (key) => {
      cancelQueuedWrite()
      localStorage.removeItem(key)
    },
    setItem(key, value) {
      if (!active) {
        cancelQueuedWrite()
        writeNow(key, value)
        return
      }
      queuedWrite = { key, value }
      writeTimer ??= setTimeout(flushQueuedWrite, STREAMING_WRITE_INTERVAL_MS)
    },
  })),
  // Old unowned histories cannot safely be inherited on a shared device.
  migrate: () => ({ ...empty, ownerId: null }),
  partialize: (state) => ({
    ownerId: state.ownerId,
    conversations: state.conversations,
    selectedConversation: state.selectedConversation,
    selectedDatabase: state.selectedDatabase,
    chatMode: state.chatMode,
  }),
  merge(persisted, current) {
    const saved = persisted as Partial<ChatState> | undefined
    const chatMode = saved?.chatMode ?? current.chatMode ?? 'default'
    if (!saved?.ownerId) return { ...current, byokApiKey: null, byokModel: null, chatMode }
    const conversations = restoreConversations(saved.conversations)
    const selected = saved.selectedConversation ? conversations[saved.selectedConversation] : undefined
    const isSameOwner = current.ownerId === saved.ownerId
    return {
      ...current,
      ownerId: saved.ownerId,
      conversations,
      selectedConversation: selected?.id ?? null,
      selectedDatabase: selected?.databaseId ?? null,
      messages: selected?.messages ?? [],
      byokApiKey: (isSameOwner ? current.byokApiKey : null) ?? null,
      byokModel: (isSameOwner ? current.byokModel : null) ?? null,
      chatMode,
    }
  },
}))
export { getUserDatabases as getDatabases, getDatabaseInfo as getDatabaseDetails } from '@/lib/api/database-api'
