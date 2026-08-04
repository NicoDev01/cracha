'use client'

import { create } from 'zustand'
import type { Message, ChatState } from '@/types/chat'

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  selectedDatabase: null,
  isLoading: false,
  isStreaming: false,
  error: null,

      sendMessage: async (question: string) => {
        const { selectedDatabase, isLoading, messages: previousMessages } = get()
        
        if (isLoading) return

        if (!selectedDatabase) {
          set({ error: 'Bitte wähle zuerst eine Datenbank aus' })
          return
        }

        // Add user message
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: question,
          timestamp: new Date()
        }

        set(state => ({
          messages: [...state.messages, userMessage],
          isLoading: true,
          isStreaming: false,
          error: null
        }))

        try {
          const { sendChatQuery } = await import('@/lib/api/chat-api')
          const history = previousMessages
            .filter(message => !message.isError && (message.type === 'user' || message.type === 'assistant') && message.content.trim())
            .slice(-12)
            .map(message => ({ role: message.type as 'user' | 'assistant', content: message.content }))
          const response = await sendChatQuery({
            question,
            tenant_id: selectedDatabase,
            top_k: 6,
            messages: history,
          })

          set(state => ({
            messages: [...state.messages, {
              id: `assistant-${Date.now()}`,
              type: 'assistant',
              content: response.message,
              timestamp: new Date(),
              sources: response.sources,
              metadata: response.metadata,
            }],
            isLoading: false,
            isStreaming: false
          }))

        } catch (error) {
          console.error('Chat error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
          
          const errorMessageObj: Message = {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: `Die Anfrage ist fehlgeschlagen: ${errorMessage}`,
            timestamp: new Date(),
            isError: true
          }
          
          set(state => ({
            messages: [...state.messages, errorMessageObj],
            error: null, // Clear global error since we show it in chat
            isLoading: false,
            isStreaming: false
          }))
        }
      },

      clearChat: () => {
        set({ messages: [], error: null })
      },

      selectDatabase: (tenantId: string) => {
        set(state => state.selectedDatabase === tenantId
          ? { error: null }
          : { selectedDatabase: tenantId, messages: [], error: null })
      },

  setError: (error: string | null) => {
    set({ error })
  }
}))

// Export database functions from API
export { getUserDatabases as getDatabases, getDatabaseInfo as getDatabaseDetails } from '@/lib/api/database-api'
