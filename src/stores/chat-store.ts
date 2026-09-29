'use client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { ChatState, ChatConversation, ChatSummary, Message, StoredChatMessage } from '@/types/chat'
import { streamChatQuery } from '@/lib/api/chat-api'
import { ChatHistoryRejected, deleteChat, getChat, importChat, listChats, renameChat } from '@/lib/api/chat-history-api'
import { cleanTitle, provisionalTitle } from '@/lib/chat/history'
import { createTextSmoother } from '@/lib/chat/smooth-text'

let active: { controller: AbortController; owner: string; conversation: string } | null = null
/** The history load in flight, shared by everyone who asks meanwhile. */
let historyLoad: { owner: string; promise: Promise<void> } | null = null

const empty = { messages: [] as Message[], history: [] as ChatSummary[], historyStatus: 'idle' as ChatState['historyStatus'], conversations: {} as Record<string, ChatConversation>, legacyConversations: null as Record<string, ChatConversation> | null, selectedDatabase: null, selectedConversation: null, loadingConversation: null, isLoading: false, isStreaming: false, retrievalProgress: null, error: null, byokApiKey: null as string | null, byokModel: null as string | null, chatMode: 'default' as 'default' | 'verification' }
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

function fromStored(message: StoredChatMessage): Message {
  const timestamp = new Date(message.createdAt)
  return {
    id: message.id,
    type: message.role,
    content: message.content,
    timestamp: Number.isFinite(timestamp.getTime()) ? timestamp : new Date(0),
    sources: message.sources,
    metadata: message.metadata,
    isError: message.isError || undefined,
  }
}

/** Replaces the entry with the same id, or puts a new one first. */
function upsert(history: ChatSummary[], chat: ChatSummary): ChatSummary[] {
  return history.some(item => item.id === chat.id)
    ? history.map(item => item.id === chat.id ? chat : item)
    : [chat, ...history]
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record }
  delete next[key]
  return next
}

export const useChatStore = create<ChatState>()(persist((set, get) => {
  /** Hands the conversations this browser kept to the account, one at a time. */
  async function importLegacy(owner: string) {
    const legacy = get().legacyConversations
    if (!legacy) return
    const remaining = { ...legacy }
    for (const conversation of Object.values(legacy)) {
      try {
        await importChat(conversation)
        delete remaining[conversation.id]
      } catch (error) {
        // Refused for good (malformed, someone else's id): nothing to retry.
        if (error instanceof ChatHistoryRejected) delete remaining[conversation.id]
        else break
      }
      if (get().ownerId !== owner) return
    }
    set({ legacyConversations: Object.keys(remaining).length ? remaining : null })
  }

  return {
    ...empty, ownerId: null,
    claimFor(ownerId) {
      if (get().ownerId === ownerId) return
      active?.controller.abort(); active = null
      historyLoad = null
      set({ ...empty, ownerId, byokApiKey: null, byokModel: null, chatMode: get().chatMode })
    },
    setChatMode(mode) { set({ chatMode: mode }) },
    stop() { active?.controller.abort() },
    loadHistory() {
      const owner = get().ownerId
      if (!owner) return Promise.resolve()
      if (historyLoad?.owner === owner) return historyLoad.promise
      if (get().historyStatus !== 'ready') set({ historyStatus: 'loading' })
      const promise = (async () => {
        try {
          await importLegacy(owner)
          const chats = await listChats()
          if (get().ownerId !== owner) return
          // A conversation whose first question is still being written is not listed yet.
          const pending = get().history.filter(chat => chat.id === active?.conversation && !chats.some(item => item.id === chat.id))
          set({ history: [...pending, ...chats], historyStatus: 'ready' })
        } catch {
          if (get().ownerId === owner) set({ historyStatus: 'error' })
        } finally {
          // Only one load per owner runs at a time, so this is ours.
          if (historyLoad?.owner === owner) historyLoad = null
        }
      })()
      historyLoad = { owner, promise }
      return promise
    },
    selectDatabase(databaseId) {
      if (databaseId === get().selectedDatabase) return
      active?.controller.abort()
      // A conversation stays with the knowledge base it asked; another base starts a new one.
      set({ selectedDatabase: databaseId, selectedConversation: null, loadingConversation: null, messages: [], error: null })
    },
    async selectConversation(id) {
      const owner = get().ownerId
      if (!owner) return
      const cached = get().conversations[id]
      if (get().selectedConversation === id && cached) return
      if (active && active.conversation !== id) active.controller.abort()
      const summary = get().history.find(chat => chat.id === id)
      set({
        selectedConversation: id,
        selectedDatabase: summary?.databaseId ?? cached?.databaseId ?? get().selectedDatabase,
        messages: cached?.messages ?? [],
        loadingConversation: cached ? null : id,
        error: null,
      })
      if (active?.conversation === id) return
      try {
        const { conversation, messages } = await getChat(id)
        // A question sent meanwhile is newer than what the server had.
        if (get().ownerId !== owner || active?.conversation === id) return
        const restored: ChatConversation = { id, databaseId: conversation.databaseId, title: conversation.title, messages: messages.map(fromStored) }
        set(state => ({
          conversations: { ...state.conversations, [id]: restored },
          history: upsert(state.history, conversation),
          ...(state.selectedConversation === id ? { messages: restored.messages, selectedDatabase: conversation.databaseId, loadingConversation: null } : {}),
        }))
      } catch (error) {
        if (get().ownerId !== owner) return
        if (error instanceof ChatHistoryRejected && error.status === 404) {
          set(state => ({
            history: state.history.filter(chat => chat.id !== id),
            conversations: without(state.conversations, id),
            ...(state.selectedConversation === id ? { selectedConversation: null, loadingConversation: null, messages: [] } : {}),
          }))
          toast.error('Dieser Chat existiert nicht mehr.')
        } else {
          if (get().selectedConversation === id) set({ loadingConversation: null })
          toast.error('Der Chat konnte nicht geladen werden. Bitte versuche es erneut.')
        }
      }
    },
    async ensureSelectedConversation() {
      const id = get().selectedConversation
      if (!id || !get().ownerId) return
      // A selection from before the history moved to the server exists there only once imported.
      if (get().legacyConversations) await get().loadHistory()
      if (get().selectedConversation !== id || get().conversations[id] || get().loadingConversation === id || active?.conversation === id) return
      await get().selectConversation(id)
    },
    newConversation(databaseId) {
      active?.controller.abort()
      set({ selectedConversation: null, loadingConversation: null, messages: [], error: null, ...(databaseId ? { selectedDatabase: databaseId } : {}) })
    },
    async renameConversation(id, title) {
      const owner = get().ownerId
      const clean = cleanTitle(title)
      const previous = get().history.find(chat => chat.id === id)
      if (!owner || !clean || !previous) return false
      if (clean === previous.title) return true
      const retitle = (value: string) => set(state => ({
        history: state.history.map(chat => chat.id === id ? { ...chat, title: value } : chat),
        ...(state.conversations[id] ? { conversations: { ...state.conversations, [id]: { ...state.conversations[id], title: value } } } : {}),
      }))
      retitle(clean)
      try {
        const chat = await renameChat(id, clean)
        if (get().ownerId === owner) retitle(chat.title)
        return true
      } catch (error) {
        if (get().ownerId !== owner) return false
        if (error instanceof ChatHistoryRejected && error.status === 404) {
          set(state => ({ history: state.history.filter(chat => chat.id !== id) }))
          toast.error('Dieser Chat existiert nicht mehr.')
        } else {
          if (get().history.find(chat => chat.id === id)?.title === clean) retitle(previous.title)
          toast.error(error instanceof Error ? error.message : 'Der Chat konnte nicht umbenannt werden.')
        }
        return false
      }
    },
    async deleteConversation(id) {
      const owner = get().ownerId
      if (!owner) return false
      if (active?.conversation === id) active.controller.abort()
      try {
        await deleteChat(id)
      } catch (error) {
        if (get().ownerId === owner) toast.error(error instanceof Error ? error.message : 'Der Chat konnte nicht gelöscht werden.')
        return false
      }
      if (get().ownerId !== owner) return false
      set(state => ({
        history: state.history.filter(chat => chat.id !== id),
        conversations: without(state.conversations, id),
        ...(state.selectedConversation === id ? { selectedConversation: null, loadingConversation: null, messages: [], error: null } : {}),
      }))
      return true
    },
    forgetDatabases(databaseIds) {
      const gone = new Set(databaseIds)
      if (!gone.size) return
      const selectedGone = get().selectedDatabase !== null && gone.has(get().selectedDatabase!)
      if (selectedGone) active?.controller.abort()
      set(state => ({
        history: state.history.filter(chat => !gone.has(chat.databaseId)),
        conversations: Object.fromEntries(Object.entries(state.conversations).filter(([, conversation]) => !gone.has(conversation.databaseId))),
        ...(selectedGone ? { selectedDatabase: null, selectedConversation: null, loadingConversation: null, messages: [], error: null } : {}),
      }))
    },
    clearChat() {
      const id = get().selectedConversation
      if (id) return get().deleteConversation(id)
      active?.controller.abort()
      set({ messages: [], error: null })
      return Promise.resolve(true)
    },
    feedback(id, value) {
      const key = get().selectedConversation
      if (!key || !get().conversations[key]) return
      const messages = get().messages.map(message => message.id === id ? { ...message, feedback: message.feedback === value ? undefined : value } : message)
      set({ messages, conversations: { ...get().conversations, [key]: { ...get().conversations[key], messages } } })
    },
    setError(error) { set({ error }) },
    setByokApiKey(key) { set({ byokApiKey: key ? key.trim() : null }) },
    setByokModel(model) { set({ byokModel: model ? model.trim() : null }) },
    async sendMessage(question) {
      const state = get()
      if (active || !state.ownerId || !state.selectedDatabase || !question.trim()) return false
      if (state.selectedConversation && state.loadingConversation === state.selectedConversation) return false
      const trimmed = question.trim()
      if (trimmed.length > 4_000) {
        set({ error: `Eingabe zu lang (${trimmed.length} Zeichen). Maximal 4.000 Zeichen sind zulässig.` })
        return false
      }
      if (state.messages.length >= 198) { set({ error: 'Diese Unterhaltung ist lang. Bitte starte einen neuen Chat.' }); return false }
      const key = state.selectedConversation ?? crypto.randomUUID()
      const assistantId = crypto.randomUUID()
      const request = { controller: new AbortController(), owner: state.ownerId, conversation: key }
      active = request
      const now = new Date().toISOString()
      const listed = state.history.find(chat => chat.id === key)
      const title = listed?.title ?? state.conversations[key]?.title ?? provisionalTitle(question)
      const conversation: ChatConversation = { id: key, databaseId: state.selectedDatabase, title, messages: [...state.messages, { id: crypto.randomUUID(), type: 'user', content: question, timestamp: new Date() }] }
      set({
        selectedConversation: key,
        messages: conversation.messages,
        conversations: { ...state.conversations, [key]: conversation },
        history: upsert(state.history, { id: key, databaseId: state.selectedDatabase, title, createdAt: listed?.createdAt ?? now, updatedAt: now }),
        isLoading: true, isStreaming: false, retrievalProgress: null, error: null,
      })
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
      let correctedText: string | undefined
      const smoother = createTextSmoother(text => update(messages => messages.map(message => message.id === assistantId ? { ...message, content: message.content + text } : message)))
      try {
        await streamChatQuery({
          request_id: crypto.randomUUID(),
          conversation_id: key,
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
          onDone(metadata, text) { complete = true; doneMetadata = metadata; correctedText = text },
          onSaved({ saved, title: generated }) {
            if (get().ownerId !== request.owner) return
            if (!saved) {
              toast.warning('Diese Antwort konnte nicht im Chatverlauf gespeichert werden.')
              return
            }
            if (generated) {
              set(current => ({
                history: current.history.map(chat => chat.id === key ? { ...chat, title: generated } : chat),
                ...(current.conversations[key] ? { conversations: { ...current.conversations, [key]: { ...current.conversations[key], title: generated } } } : {}),
              }))
            }
          },
        }, request.controller.signal)
        // The answer is finished only once the reader has seen all of it.
        await smoother.drain()
        if (complete) update(messages => messages.map(message => message.id === assistantId ? { ...message, content: correctedText ?? message.content, isStreaming: false, metadata: doneMetadata } : message))
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
  }
}, {
  // Only what this browser needs to reopen the chat where it was left; the
  // conversations themselves stay on the server with the account.
  name: 'cracha-chat-store', version: 3,
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
    removeItem: (key) => localStorage.removeItem(key),
    setItem(key, value) {
      try {
        localStorage.setItem(key, value)
      } catch {
        // A full storage loses the reopened selection, nothing else.
      }
    },
  })),
  migrate(persisted, version) {
    const saved = persisted as { ownerId?: unknown; conversations?: unknown; selectedConversation?: unknown; selectedDatabase?: unknown; chatMode?: ChatState['chatMode'] } | undefined
    // Version 2 kept every conversation here. They are imported into the
    // account of the owner they were kept for, then removed from this browser.
    if (version === 2 && typeof saved?.ownerId === 'string') {
      const legacy = restoreConversations(saved.conversations)
      return {
        ownerId: saved.ownerId,
        selectedConversation: typeof saved.selectedConversation === 'string' && legacy[saved.selectedConversation] ? saved.selectedConversation : null,
        selectedDatabase: typeof saved.selectedDatabase === 'string' ? saved.selectedDatabase : null,
        chatMode: saved.chatMode ?? 'default',
        legacyConversations: Object.keys(legacy).length ? legacy : null,
      }
    }
    // Old unowned histories cannot safely be inherited on a shared device.
    return { ...empty, ownerId: null }
  },
  partialize: (state) => ({
    ownerId: state.ownerId,
    selectedConversation: state.selectedConversation,
    selectedDatabase: state.selectedDatabase,
    chatMode: state.chatMode,
    legacyConversations: state.legacyConversations,
  }),
  merge(persisted, current) {
    const saved = persisted as Partial<ChatState> | undefined
    const chatMode = saved?.chatMode ?? current.chatMode ?? 'default'
    if (!saved?.ownerId) return { ...current, byokApiKey: null, byokModel: null, chatMode }
    const isSameOwner = current.ownerId === saved.ownerId
    const selectedConversation = typeof saved.selectedConversation === 'string' ? saved.selectedConversation : null
    return {
      ...current,
      ...(isSameOwner ? {} : { history: [], historyStatus: 'idle' as const, conversations: {} }),
      ownerId: saved.ownerId,
      selectedConversation,
      selectedDatabase: typeof saved.selectedDatabase === 'string' ? saved.selectedDatabase : null,
      loadingConversation: null,
      messages: isSameOwner && selectedConversation === current.selectedConversation ? current.messages : [],
      legacyConversations: saved.legacyConversations ? restoreConversations(saved.legacyConversations) : null,
      byokApiKey: (isSameOwner ? current.byokApiKey : null) ?? null,
      byokModel: (isSameOwner ? current.byokModel : null) ?? null,
      chatMode,
    }
  },
}))
export { getUserDatabases as getDatabases, getDatabaseInfo as getDatabaseDetails } from '@/lib/api/database-api'
