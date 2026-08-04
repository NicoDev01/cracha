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
        const { selectedDatabase } = get()
        
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

        // Add assistant message placeholder
        const assistantMessageId = `assistant-${Date.now()}`
        const assistantMessage: Message = {
          id: assistantMessageId,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: false,
          sources: []
        }

        set(state => ({
          messages: [...state.messages, userMessage, assistantMessage],
          isLoading: true,
          isStreaming: false,
          error: null
        }))

        try {
          const { sendChatQuery } = await import('@/lib/api/chat-api')
          const history = get().messages
            .filter(message => message.id !== userMessage.id && !message.isError && (message.type === 'user' || message.type === 'assistant') && message.content.trim())
            .slice(-12)
            .map(message => ({ role: message.type as 'user' | 'assistant', content: message.content }))
          const response = await sendChatQuery({
            question,
            tenant_id: selectedDatabase,
            top_k: 6,
            messages: history,
          })

          set(state => ({
            messages: state.messages.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: response.message, isStreaming: false, sources: response.sources }
                : msg
            ),
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
            messages: [...state.messages.filter(msg => msg.id !== assistantMessageId), errorMessageObj],
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
        set({ selectedDatabase: tenantId, error: null })
      },

  setError: (error: string | null) => {
    set({ error })
  }
}))

// Export database functions from API
export { getUserDatabases as getDatabases, getDatabaseInfo as getDatabaseDetails } from '@/lib/api/database-api'
