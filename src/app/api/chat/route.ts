import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { streamGroundedAnswer } from '@/lib/server/generation'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import type { Source } from '@/types/chat'

export const dynamic = 'force-dynamic'

interface ChatBody {
  question?: string
  tenant_id?: string
  top_k?: number
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

interface RetrievalResponse {
  context?: string
  blocks?: Array<{
    n: number
    title: string
    url: string
    text: string
    collection?: boolean
    truncated?: boolean
    authoritative?: boolean
  }>
  sources?: Array<{ id: string; title: string; url: string; snippet: string; score: number; chunk_index: string }>
  usage?: { latency_ms?: number; cached?: boolean }
  error?: string
}

const encoder = new TextEncoder()

function encodeEvent(event: 'meta' | 'delta' | 'done' | 'error', data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function streamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const body = await request.json().catch(() => null) as ChatBody | null
  const question = body?.question?.trim()
  const tenantId = body?.tenant_id?.trim()
  if (!question || question.length > 4_000 || !tenantId || tenantId.length > 160) {
    return NextResponse.json({ error: 'Frage oder Wissensbasis-ID ist ungültig.' }, { status: 400 })
  }
  const messages = Array.isArray(body?.messages)
    ? body.messages.filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim()).slice(-12).map((message) => ({ role: message.role, content: message.content.trim().slice(0, 2_000) }))
    : []

  const env = getWorkerEnv()
  const retrievalResponse = await env.RAG_API.fetch('https://cracha-rag.internal/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, tenant_id: tenantId, user_id: user.id, top_k: body?.top_k ?? 8, messages }),
  })
  const retrieval = await retrievalResponse.json().catch(() => ({})) as RetrievalResponse
  if (!retrievalResponse.ok) {
    return NextResponse.json({ error: retrieval.error ?? 'Suche in der Wissensbasis fehlgeschlagen.' }, { status: retrievalResponse.status })
  }

  const sources: Source[] = (retrieval.sources ?? []).map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    relevance_score: source.score,
  }))
  if (!retrieval.context || sources.length === 0) {
    return streamResponse(new ReadableStream({
      start(controller) {
        const model = 'Cloudflare AI Search'
        controller.enqueue(encodeEvent('meta', { sources: [], model }))
        controller.enqueue(encodeEvent('delta', { text: 'Ich konnte in dieser Wissensbasis keine ausreichend relevanten Informationen finden.' }))
        controller.enqueue(encodeEvent('done', {
          usage: {
            latency_ms: Date.now() - started,
            retrieval_ms: retrieval.usage?.latency_ms ?? 0,
            retrieval_cached: retrieval.usage?.cached === true,
          },
          model,
        }))
        controller.close()
      },
    }))
  }

  return streamResponse(new ReadableStream({
    async start(controller) {
      try {
        const generated = await streamGroundedAnswer({
          ai: env.AI,
          model: env.GENERATION_MODEL || 'google/gemini-3.5-flash',
          question,
          history: messages,
          context: retrieval.context as string,
          blocks: retrieval.blocks ?? [],
        })
        const model = `${generated.model} + Cloudflare AI Search`
        controller.enqueue(encodeEvent('meta', { sources, model, fallback: generated.fallback }))

        for await (const text of generated.text) {
          controller.enqueue(encodeEvent('delta', { text }))
        }

        controller.enqueue(encodeEvent('done', {
          usage: {
            latency_ms: Date.now() - started,
            retrieval_ms: retrieval.usage?.latency_ms ?? 0,
            retrieval_cached: retrieval.usage?.cached === true,
          },
          model,
          fallback: generated.fallback,
        }))
      } catch (error) {
        console.error(JSON.stringify({ event: 'chat_generation_failed', error: error instanceof Error ? error.message : 'unknown' }))
        controller.enqueue(encodeEvent('error', { message: 'Die Antwort konnte nicht erzeugt werden.' }))
      } finally {
        controller.close()
      }
    },
  }))
}
