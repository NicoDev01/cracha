'use client'

import type { ChatResponse, QueryRequest } from '@/types/chat'

interface RawSource {
  id?: string
  chunk_index?: string | number
  title?: string
  url: string
  snippet?: string
  score?: number
}

interface RAGWorkerResponse {
  answer?: string
  error?: string
  sources?: RawSource[]
  usage?: { latency_ms?: number; llm_tokens?: number }
  model?: string
}

class ChatAPIClient {
  async sendChatQuery(request: QueryRequest): Promise<ChatResponse> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: request.question,
        tenant_id: request.tenant_id,
        top_k: request.top_k ?? 6,
        messages: request.messages ?? [],
      }),
    })
    const dataBody = (await response.json().catch(() => ({}))) as RAGWorkerResponse
    if (!response.ok) throw new Error(dataBody.error ?? `RAG-Anfrage fehlgeschlagen (${response.status}).`)

    return {
      message: dataBody.answer ?? 'Keine Antwort erhalten.',
      sources: (dataBody.sources ?? []).map((source, index) => ({
        id: source.id ?? `${source.url}-${source.chunk_index ?? index}`,
        title: source.title ?? source.url,
        url: source.url,
        snippet: source.snippet ?? '',
        relevance_score: source.score ?? 0,
      })),
      metadata: {
        query_time: dataBody.usage?.latency_ms ?? 0,
        tokens_used: dataBody.usage?.llm_tokens ?? 0,
        model_used: dataBody.model ?? 'Cloudflare AI Search',
      },
    }
  }
}

export const chatAPI = new ChatAPIClient()

export function sendChatQuery(request: QueryRequest): Promise<ChatResponse> {
  return chatAPI.sendChatQuery(request)
}
