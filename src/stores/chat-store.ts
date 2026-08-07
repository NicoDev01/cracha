'use client'

import { create } from 'zustand'
import type { ChatState, Message } from '@/types/chat'

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  selectedDatabase: null,
  isLoading: false,
  isStreaming: false,
  error: null,

  sendMessage: async (question: string) => {
    const {
      selectedDatabase,
      isLoading,
      isStreaming,
      messages: previousMessages,
    } = get()
    if (isLoading || isStreaming) return

    if (!selectedDatabase) {
      set({ error: 'Bitte wähle zuerst eine Datenbank aus' })
      return
    }

    const createdAt = Date.now()
    const assistantId = `assistant-${createdAt}`
    let assistantCreated = false
    const userMessage: Message = {
      id: `user-${createdAt}`,
      type: 'user',
      content: question,
      timestamp: new Date(),
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      isStreaming: false,
      error: null,
    }))

    try {
      const { streamChatQuery } = await import('@/lib/api/chat-api')
      const history = previousMessages
        .filter((message) => !message.isError && (message.type === 'user' || message.type === 'assistant') && message.content.trim())
        .slice(-12)
        .map((message) => ({ role: message.type as 'user' | 'assistant', content: message.content }))

      await streamChatQuery({
        question,
        tenant_id: selectedDatabase,
        top_k: 8,
        messages: history,
      }, {
        onStart: ({ sources, model }) => {
          assistantCreated = true
          set((state) => ({
            messages: [...state.messages, {
              id: assistantId,
              type: 'assistant',
              content: '',
              timestamp: new Date(),
              sources,
              isStreaming: true,
              metadata: { query_time: 0, model_used: model },
            }],
            isLoading: false,
            isStreaming: true,
          }))
        },
        onDelta: (text) => {
          set((state) => ({
            messages: state.messages.map((message) => message.id === assistantId
              ? { ...message, content: `${message.content}${text}` }
              : message),
          }))
        },
        onDone: (metadata) => {
          set((state) => ({
            messages: state.messages.map((message) => message.id === assistantId
              ? { ...message, isStreaming: false, metadata }
              : message),
            isLoading: false,
            isStreaming: false,
          }))
        },
      })
    } catch (error) {
      console.error('Chat error:', error)
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler'
      const failure = `Die Anfrage ist fehlgeschlagen: ${errorText}`

      set((state) => ({
        messages: assistantCreated
          ? state.messages.map((message) => message.id === assistantId
            ? {
                ...message,
                content: message.content || failure,
                isStreaming: false,
                isError: true,
              }
            : message)
          : [...state.messages, {
              id: `error-${Date.now()}`,
              type: 'assistant',
              content: failure,
              timestamp: new Date(),
              isError: true,
            }],
        error: null,
        isLoading: false,
        isStreaming: false,
      }))
    }
  },

  clearChat: () => {
    set({ messages: [], error: null, isLoading: false, isStreaming: false })
  },

  selectDatabase: (tenantId: string) => {
    set((state) => state.selectedDatabase === tenantId
      ? { error: null }
      : { selectedDatabase: tenantId, messages: [], error: null })
  },

  setError: (error: string | null) => {
    set({ error })
  },
}))

export { getUserDatabases as getDatabases, getDatabaseInfo as getDatabaseDetails } from '@/lib/api/database-api'
