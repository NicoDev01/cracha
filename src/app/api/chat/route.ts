import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { DEFAULT_GENERATION_MODEL, streamGroundedAnswer } from '@/lib/server/generation'
import { CreditError, getCreditState, spendChatCredits, refundChatCredits, CREDITS } from '@/lib/server/credits'
import { getOwnedDatabase } from '@/lib/server/database-registry'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import type { Source } from '@/types/chat'

export const dynamic = 'force-dynamic'

const chatBody = z.object({
  question: z.string().trim().min(1).max(4_000),
  tenant_id: z.string().trim().min(1).max(160),
  top_k: z.number().int().min(1).max(12).default(8),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(100_000).transform((text) => text.slice(0, 2_000)),
  })).max(100).default([]).transform((messages) => messages.slice(-12)),
})

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

  const parsed = chatBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Frage oder Wissensbasis-ID ist ungültig.' }, { status: 400 })
  }
  const { question, tenant_id: tenantId, messages, top_k } = parsed.data
  if (!(await getOwnedDatabase(tenantId, user.id))) {
    return NextResponse.json({ error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  }
  // Charged before the search and the model run, not after: those are what the
  // balance exists to bound, so an account that cannot pay must not reach them.
  // The state is only read on refusal, where a few extra reads cost nothing.
  const reference = crypto.randomUUID()
  if (!(await spendChatCredits(user.id, reference))) {
    const state = await getCreditState(user.id)
    const shortfall = new CreditError('credits', state, CREDITS.perChatMessage)
    return NextResponse.json({ error: shortfall.message, reason: shortfall.reason, credits: state }, { status: 402 })
  }

  const refund = async (): Promise<boolean> => {
    try {
      await refundChatCredits(user.id, reference)
      return true
    } catch {
      // Preserve the reference for support reconciliation; never claim that a
      // failed database write returned the customer's money.
      console.error(JSON.stringify({ event: 'chat_refund_failed', reference }))
      return false
    }
  }
  let env: CloudflareEnv
  let retrievalResponse: Response
  let retrieval: RetrievalResponse
  try {
    env = getWorkerEnv()
    retrievalResponse = await env.RAG_API.fetch('https://cracha-rag.internal/query', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, tenant_id: tenantId, user_id: user.id, top_k, messages }),
    })
    retrieval = await retrievalResponse.json() as RetrievalResponse
    if (!retrieval || typeof retrieval !== 'object') throw new Error('Invalid retrieval response')
    if (retrieval.context !== undefined && typeof retrieval.context !== 'string') throw new Error('Invalid context')
    if (retrieval.sources !== undefined && (!Array.isArray(retrieval.sources) || retrieval.sources.some((source) =>
      !source || typeof source.id !== 'string' || typeof source.title !== 'string' || typeof source.url !== 'string'
    ))) throw new Error('Invalid sources')
  } catch {
    const refunded = await refund()
    return NextResponse.json({ error: 'Suche vorübergehend nicht verfügbar.', refunded, reference }, { status: 502 })
  }
  if (!retrievalResponse.ok) {
    const refunded = await refund()
    return NextResponse.json({ error: retrieval.error ?? 'Suche in der Wissensbasis fehlgeschlagen.', refunded, reference }, { status: retrievalResponse.status })
  }

  const sources: Source[] = (retrieval.sources ?? []).map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    relevance_score: source.score,
  }))
  if (!retrieval.context || sources.length === 0) {
    const refunded = await refund()
    return streamResponse(new ReadableStream({
      start(controller) {
        // No model ran, so the answer line names none. It used to carry the
        // search service, which is the one place the reader saw it.
        const model = ''
        controller.enqueue(encodeEvent('meta', { sources: [], model }))
        controller.enqueue(encodeEvent('delta', { text: 'Ich konnte in dieser Wissensbasis keine ausreichend relevanten Informationen finden.' }))
        controller.enqueue(encodeEvent('done', {
          usage: {
            latency_ms: Date.now() - started,
            retrieval_ms: retrieval.usage?.latency_ms ?? 0,
            retrieval_cached: retrieval.usage?.cached === true,
          },
          model,
          refunded,
          reference,
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
          model: env.GENERATION_MODEL || DEFAULT_GENERATION_MODEL,
          question,
          history: messages,
          context: retrieval.context as string,
          blocks: retrieval.blocks ?? [],
        })
        const model = generated.model
        controller.enqueue(encodeEvent('meta', { sources, model, fallback: generated.fallback }))

        let hasText = false
        for await (const text of generated.text) {
          hasText ||= Boolean(text.trim())
          controller.enqueue(encodeEvent('delta', { text }))
        }
        if (!hasText) throw new Error('Empty generation')

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
        const refunded = await refund()
        console.error(JSON.stringify({ event: 'chat_generation_failed', error: error instanceof Error ? error.message : 'unknown' }))
        try {
          controller.enqueue(encodeEvent('error', { message: refunded ? 'Die Antwort konnte nicht erzeugt werden. Credits wurden erstattet.' : `Die Antwort konnte nicht erzeugt werden. Guthaben bitte mit Referenz ${reference} prüfen lassen.`, refunded, reference }))
        } catch { /* The reader may already have disconnected. */ }
      } finally {
        try { controller.close() } catch { /* Already cancelled by the reader. */ }
      }
    },
  }))
}
