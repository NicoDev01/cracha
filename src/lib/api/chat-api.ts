'use client'

import type { ChatResponse, QueryRequest, Source } from '@/types/chat'
import { apiFetch } from '@/lib/api/request'

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

interface StreamMeta {
  sources?: RawSource[]
  model?: string
}

interface StreamDone {
  usage?: { latency_ms?: number; llm_tokens?: number }
  model?: string
}

export interface ChatStreamHandlers {
  onStart: (data: { sources: Source[]; model: string }) => void
  onDelta: (text: string) => void
  onDone: (metadata: ChatResponse['metadata']) => void
}

function mapSources(sources: RawSource[] = []): Source[] {
  return sources.map((source, index) => ({
    id: source.id ?? `${source.url}-${source.chunk_index ?? index}`,
    title: source.title ?? source.url,
    url: source.url,
    snippet: source.snippet ?? '',
    relevance_score: source.score ?? 0,
  }))
}

function requestBody(request: QueryRequest) {
  return {
    question: request.question,
    tenant_id: request.tenant_id,
    top_k: request.top_k ?? 8,
    messages: request.messages ?? [],
  }
}

class ChatAPIClient {
  async streamChatQuery(request: QueryRequest, handlers: ChatStreamHandlers): Promise<void> {
    const response = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody(request)),
    })

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('text/event-stream')) {
      const dataBody = (await response.json().catch(() => ({}))) as RAGWorkerResponse
      if (!response.ok) throw new Error(dataBody.error ?? `RAG-Anfrage fehlgeschlagen (${response.status}).`)

      const model = dataBody.model ?? 'Cloudflare AI Search'
      handlers.onStart({ sources: mapSources(dataBody.sources), model })
      handlers.onDelta(dataBody.answer ?? 'Keine Antwort erhalten.')
      handlers.onDone({
        query_time: dataBody.usage?.latency_ms ?? 0,
        tokens_used: dataBody.usage?.llm_tokens ?? 0,
        model_used: model,
      })
      return
    }

    if (!response.body) throw new Error('Der Antwortstream konnte nicht geöffnet werden.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    let currentModel = 'Cloudflare AI Search'

    const processFrame = (frame: string) => {
      const lines = frame.split(/\r?\n/)
      const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
      const rawData = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!event || !rawData) return

      const data = JSON.parse(rawData) as StreamMeta & StreamDone & { text?: string; message?: string }
      if (event === 'meta') {
        currentModel = data.model ?? currentModel
        handlers.onStart({ sources: mapSources(data.sources), model: currentModel })
      } else if (event === 'delta' && typeof data.text === 'string') {
        handlers.onDelta(data.text)
      } else if (event === 'done') {
        currentModel = data.model ?? currentModel
        finished = true
        handlers.onDone({
          query_time: data.usage?.latency_ms ?? 0,
          tokens_used: data.usage?.llm_tokens ?? 0,
          model_used: currentModel,
        })
      } else if (event === 'error') {
        throw new Error(data.message ?? 'Die Antwort konnte nicht erzeugt werden.')
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split(/\r?\n\r?\n/)
        buffer = frames.pop() ?? ''
        frames.forEach(processFrame)
      }
      buffer += decoder.decode()
      if (buffer.trim()) processFrame(buffer)
      if (!finished) throw new Error('Der Antwortstream wurde vorzeitig beendet.')
    } finally {
      reader.releaseLock()
    }
  }

  async sendChatQuery(request: QueryRequest): Promise<ChatResponse> {
    let message = ''
    let sources: Source[] = []
    let metadata: ChatResponse['metadata'] = {
      query_time: 0,
      tokens_used: 0,
      model_used: 'Cloudflare AI Search',
    }
    await this.streamChatQuery(request, {
      onStart: (data) => {
        sources = data.sources
        metadata.model_used = data.model
      },
      onDelta: (text) => {
        message += text
      },
      onDone: (doneMetadata) => {
        metadata = doneMetadata
      },
    })
    return { message, sources, metadata }
  }
}

export const chatAPI = new ChatAPIClient()

export function sendChatQuery(request: QueryRequest): Promise<ChatResponse> {
  return chatAPI.sendChatQuery(request)
}

export function streamChatQuery(request: QueryRequest, handlers: ChatStreamHandlers): Promise<void> {
  return chatAPI.streamChatQuery(request, handlers)
}
