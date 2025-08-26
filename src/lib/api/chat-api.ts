'use client'

import type { QueryRequest, ChatResponse } from '@/types/chat'

class ChatAPIClient {
  private baseUrl = process.env.NEXT_PUBLIC_CRACHA_WORKER_URL || 'https://cracha-worker-rag.aimpact-agency.workers.dev'

  async sendChatQuery(request: QueryRequest): Promise<ChatResponse> {
    try {
      console.log('Sending request to RAG Worker:', {
        url: `${this.baseUrl}/query`,
        body: {
          question: request.question,
          tenant_id: request.tenant_id,
          top_k: request.top_k || 10
        }
      })

      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token when auth is implemented
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: request.question,  // Changed from 'query' to 'question'
          tenant_id: request.tenant_id,
          top_k: request.top_k || 10   // Changed from 'max_results' to 'top_k'
        })
      })

      console.log('RAG Worker response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('RAG Worker error:', errorText)
        throw new Error(`RAG Worker error: ${errorText}`)
      }

      const data = await response.json()
      console.log('RAG Worker response data:', data)
      
      // Transform RAG Worker response to our ChatResponse format
      interface RawSource {
        chunk_index?: string;
        title?: string;
        url: string;
        snippet?: string;
        score?: number;
      }
      
      const transformedResponse = {
        message: data.answer || 'No answer received',
        sources: data.sources?.map((source: RawSource) => ({
          id: source.chunk_index?.toString() || Math.random().toString(),
          title: source.title || 'Untitled',
          url: source.url,
          snippet: source.snippet || '',
          relevance_score: source.score || 0
        })) || [],
        metadata: {
          query_time: data.usage?.latency_ms || 0,
          tokens_used: data.usage?.llm_tokens || 0,
          model_used: 'RAG Worker'
        }
      }
      
      console.log('✅ Real API response received:', {
        answer_length: transformedResponse.message.length,
        sources_count: transformedResponse.sources.length,
        query_time: transformedResponse.metadata.query_time
      })
      
      return transformedResponse

    } catch (error) {
      console.error('Chat API Error:', error)
      // Always throw the error - no more mock fallbacks
      throw error
    }
  }



  async *streamChatQuery(request: QueryRequest): AsyncGenerator<string> {
    try {
      // Get the full response from RAG Worker
      const response = await this.sendChatQuery(request)
      const message = response.message
      
      // Simulate streaming by yielding chunks of the real response
      const words = message.split(' ')
      
      for (let i = 0; i < words.length; i++) {
        // Yield every 3-5 words to simulate realistic streaming
        if (i % 4 === 0 || i === words.length - 1) {
          const chunk = words.slice(Math.max(0, i - 3), i + 1).join(' ') + ' '
          yield chunk
          await new Promise(resolve => setTimeout(resolve, 80)) // Faster streaming
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
      // Always throw the error - no more mock fallbacks
      throw error
    }
  }


}

export const chatAPI = new ChatAPIClient()

// Utility functions
export async function sendChatQuery(request: QueryRequest): Promise<ChatResponse> {
  return chatAPI.sendChatQuery(request)
}

export async function* streamChatQuery(request: QueryRequest): AsyncGenerator<string> {
  // Always try the real API first, fallback is handled in the method
  yield* chatAPI.streamChatQuery(request)
}