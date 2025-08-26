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

        // Add streaming assistant message placeholder
        const assistantMessageId = `assistant-${Date.now()}`
        const assistantMessage: Message = {
          id: assistantMessageId,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          sources: []
        }

        set(state => ({
          messages: [...state.messages, userMessage, assistantMessage],
          isLoading: true,
          isStreaming: true,
          error: null
        }))

        try {
          // Use real RAG Worker API with streaming
          const { streamChatQuery, sendChatQuery } = await import('@/lib/api/chat-api')
          
          let fullContent = ''
          const stream = streamChatQuery({
            question,
            tenant_id: selectedDatabase,
            top_k: 10
          })

          for await (const chunk of stream) {
            fullContent += chunk
            
            set(state => ({
              messages: state.messages.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: fullContent }
                  : msg
              )
            }))
          }

          // Get sources from non-streaming API call
          const response = await sendChatQuery({
            question,
            tenant_id: selectedDatabase,
            top_k: 10
          })

          set(state => ({
            messages: state.messages.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, isStreaming: false, sources: response.sources }
                : msg
            ),
            isLoading: false,
            isStreaming: false
          }))

        } catch (error) {
          console.error('Chat error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
          
          // Add error message as assistant message
          const errorMessageObj: Message = {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: `❌ **Fehler beim Verarbeiten der Anfrage**\n\n**Fehlermeldung:** ${errorMessage}\n\n**Mögliche Ursachen:**\n- RAG Worker API ist nicht erreichbar\n- Netzwerkverbindung unterbrochen\n- Ungültige Datenbank ausgewählt\n- Server-Fehler\n\n**Lösungsvorschläge:**\n1. Überprüfe deine Internetverbindung\n2. Wähle eine andere Datenbank aus\n3. Versuche es in ein paar Minuten erneut\n4. Kontaktiere den Support falls das Problem weiterhin besteht`,
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