'use client'

import type { ChatResponse, FallbackReason, QueryRequest, RetrievalProgress, Source } from '@/types/chat'
import { apiFetch } from '@/lib/api/request'

interface RawSource {
  id?: string
  chunk_index?: string | number
  title?: string
  url: string
  snippet?: string
  score?: number
}

interface Usage {
  latency_ms?: number
  retrieval_ms?: number
  retrieval_cached?: boolean
}

interface RAGWorkerResponse {
  answer?: string
  error?: string
  sources?: RawSource[]
  usage?: Usage
  model?: string
  fallback?: boolean
}

interface StreamMeta {
  sources?: RawSource[]
  model?: string
  fallback?: boolean
  fallbackReason?: FallbackReason
}

interface StreamDone {
  usage?: Usage
  model?: string
  fallback?: boolean
  fallbackReason?: FallbackReason
  refunded?: boolean
  reference?: string
}

export interface ChatStreamHandlers {
  onProgress?: (progress: RetrievalProgress) => void
  onStart: (data: { sources: Source[]; model: string; fallback?: boolean; fallbackReason?: FallbackReason }) => void
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
    request_id: request.request_id,
    question: request.question,
    tenant_id: request.tenant_id,
    top_k: request.top_k ?? 8,
    messages: request.messages ?? [],
    api_key: request.api_key,
    model: request.model,
    mode: request.mode ?? 'default',
  }
}

class ChatAPIClient {
  async streamChatQuery(request: QueryRequest, handlers: ChatStreamHandlers, signal?: AbortSignal): Promise<void> {
    // The key travels in the body only: headers are what logs and proxies keep.
    const response = await apiFetch('/api/chat', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody(request)),
    })

    const contentType = response.headers.get('content-type') ?? ''
    const headerModel = response.headers.get('x-generation-model') ?? ''
    const headerFallback = response.headers.get('x-byok-fallback') === 'true'

    if (!response.ok || !contentType.includes('text/event-stream')) {
      const dataBody = (await response.json().catch(() => ({}))) as RAGWorkerResponse & {
        refunded?: boolean
        reference?: string
      }
      if (!response.ok) {
        const errorMsg = dataBody.refunded
          ? `${dataBody.error ?? `RAG-Anfrage fehlgeschlagen (${response.status}).`} Credits wurden erstattet. Referenz: ${dataBody.reference}`
          : (dataBody.error ?? `RAG-Anfrage fehlgeschlagen (${response.status}).`)
        throw new Error(errorMsg)
      }

      const model = dataBody.model ?? headerModel
      handlers.onStart({ sources: mapSources(dataBody.sources), model, fallback: dataBody.fallback === true || headerFallback })
      handlers.onDelta(dataBody.answer ?? 'Keine Antwort erhalten.')
      handlers.onDone({
        query_time: dataBody.usage?.latency_ms ?? 0,
        retrieval_time: dataBody.usage?.retrieval_ms,
        retrieval_cached: dataBody.usage?.retrieval_cached === true,
        model_used: model,
        fallback: dataBody.fallback === true || headerFallback,
        refunded: dataBody.refunded,
        reference: dataBody.reference,
      })
      return
    }

    if (!response.body) throw new Error('Der Antwortstream konnte nicht geöffnet werden.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    let currentModel = headerModel
    let usedFallback = headerFallback
    let fallbackReason: FallbackReason | undefined

    const processFrame = (frame: string) => {
      const lines = frame.split(/\r?\n/)
      const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
      const rawData = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!event || !rawData) return

      const data = JSON.parse(rawData) as StreamMeta & StreamDone & { text?: string; message?: string }
      if (event === 'progress') {
        handlers.onProgress?.(data as unknown as RetrievalProgress)
      } else if (event === 'meta') {
        currentModel = data.model ?? currentModel
        usedFallback = data.fallback === true
        fallbackReason = data.fallbackReason
        handlers.onStart({ sources: mapSources(data.sources), model: currentModel, fallback: usedFallback, fallbackReason })
      } else if (event === 'delta' && typeof data.text === 'string') {
        handlers.onDelta(data.text)
      } else if (event === 'done') {
        currentModel = data.model ?? currentModel
        usedFallback = data.fallback ?? usedFallback
        fallbackReason = data.fallbackReason ?? fallbackReason
        finished = true
        handlers.onDone({
          query_time: data.usage?.latency_ms ?? 0,
          retrieval_time: data.usage?.retrieval_ms,
          retrieval_cached: data.usage?.retrieval_cached === true,
          model_used: currentModel,
          fallback: usedFallback,
          fallback_reason: usedFallback ? fallbackReason : undefined,
          refunded: data.refunded,
          reference: data.reference,
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
      model_used: '',
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

export function streamChatQuery(request: QueryRequest, handlers: ChatStreamHandlers, signal?: AbortSignal): Promise<void> {
  return chatAPI.streamChatQuery(request, handlers, signal)
}
