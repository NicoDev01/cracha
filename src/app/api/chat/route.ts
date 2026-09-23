import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { DEFAULT_BYOK_MODEL, DEFAULT_GENERATION_MODEL, streamGroundedAnswer } from '@/lib/server/generation'
import { CreditError, getCreditState, spendChatCredits, refundChatCredits, CREDITS, admitRequest, hasUnsettledCrawl, DuplicateRequestError } from '@/lib/server/credits'
import { getOwnedDatabase } from '@/lib/server/database-registry'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import type { Source } from '@/types/chat'

export const dynamic = 'force-dynamic'

const chatBody = z.object({
  request_id: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(4_000),
  tenant_id: z.string().trim().min(1).max(160),
  top_k: z.number().int().min(1).max(12).default(8),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(100_000).transform((text) => text.slice(0, 2_000)),
  })).max(100).default([]).transform((messages) => messages.slice(-12)),
  api_key: z.string().trim().max(500).optional(),
  model: z.string().trim().max(100).optional(),
  mode: z.enum(['default', 'verification']).optional().default('default'),
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

function streamResponse(stream: ReadableStream<Uint8Array>, customHeaders?: Record<string, string>): Response {
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
      ...customHeaders,
    },
  })
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const parsed = chatBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const questionIssue = parsed.error.issues.find((i) => i.path.includes('question'))
    if (questionIssue && questionIssue.code === 'too_big') {
      return NextResponse.json({ error: 'Die Eingabe überschreitet das Limit von 4.000 Zeichen.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Frage oder Wissensbasis-ID ist ungültig.' }, { status: 400 })
  }
  const { question, tenant_id: tenantId, messages, top_k } = parsed.data
  const database = await getOwnedDatabase(tenantId, user.id)
  if (!database) {
    return NextResponse.json({ error: 'Wissensbasis nicht gefunden.' }, { status: 404 })
  }
  if (database.status !== 'active') {
    return NextResponse.json({ error: 'Diese Wissensbasis ist nicht aktiv oder wurde abgebrochen.' }, { status: 403 })
  }
  if (database.pages_count !== undefined && database.pages_count === 0 && (database.document_count ?? 0) === 0) {
    return NextResponse.json({ error: 'Diese Wissensbasis enthält noch keine indexierten Seiten. Bitte starte zuerst einen Crawl.' }, { status: 400 })
  }
  // Charged before the search and the model run, not after: those are what the
  // balance exists to bound, so an account that cannot pay must not reach them.
  // The state is only read on refusal, where a few extra reads cost nothing.
  if (await hasUnsettledCrawl(user.id, tenantId)) return NextResponse.json({ error: 'Diese Wissensbasis ist noch nicht freigegeben. Warte auf den Crawl-Abschluss oder starte einen abgebrochenen Crawl erneut.' }, { status: 409 })
  if (!(await admitRequest(user.id, 'chat', 12, 60))) return NextResponse.json({ error: 'Zu viele Fragen in kurzer Zeit. Bitte warte einen Moment.' }, { status: 429, headers: { 'Retry-After': '60' } })
  const reference = `${user.id}:${parsed.data.request_id ?? crypto.randomUUID()}`
  let allowed: boolean
  try { allowed = await spendChatCredits(user.id, reference) }
  catch (error) {
    if (error instanceof DuplicateRequestError) return NextResponse.json({ error: 'Diese Anfrage wurde bereits verarbeitet. Prüfe deinen Chatverlauf.', reference }, { status: 409 })
    console.error(JSON.stringify({ event: 'chat_billing_unavailable' }))
    return NextResponse.json({ error: 'Guthaben konnte nicht geprüft werden.' }, { status: 503 })
  }
  if (!allowed) {
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
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
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

  const cancellation = new AbortController()
  const signal = AbortSignal.any([request.signal, cancellation.signal])

  // The key is read from the body only. It used to be accepted as a header as
  // well, and request headers are what platform logs and proxies record.
  const byokKey = parsed.data.api_key || undefined
  const configuredModel = env.GENERATION_MODEL || DEFAULT_GENERATION_MODEL
  const selectedModel = byokKey ? (parsed.data.model || DEFAULT_BYOK_MODEL) : configuredModel
  const gatewayId = (env as unknown as { AI_GATEWAY_ID?: string }).AI_GATEWAY_ID || process.env.CF_AI_GATEWAY_ID || process.env.AI_GATEWAY_ID
  const mode = parsed.data.mode

  let generated: Awaited<ReturnType<typeof streamGroundedAnswer>>
  try {
    generated = await streamGroundedAnswer({
      ai: env.AI,
      signal,
      model: selectedModel,
      question,
      history: messages,
      context: retrieval.context as string,
      // A content check quotes the draft, not a collection page; checking its
      // findings against the sources as list entries stripped their citations.
      blocks: mode === 'verification' ? [] : retrieval.blocks ?? [],
      apiKey: byokKey,
      gatewayId,
      mode,
    })
  } catch (error) {
    const refunded = await refund()
    console.error(JSON.stringify({ event: 'chat_generation_failed', reason: error instanceof Error ? error.name : 'unknown' }))
    return streamResponse(new ReadableStream({
      start(controller) {
        controller.enqueue(encodeEvent('error', {
          message: refunded
            ? 'Die Antwort konnte nicht erzeugt werden. Credits wurden erstattet.'
            : `Die Antwort konnte nicht erzeugt werden. Guthaben bitte mit Referenz ${reference} prüfen lassen.`,
          refunded,
          reference,
        }))
        controller.close()
      },
    }))
  }

  const model = generated.model
  const usedModel = generated.usedModel || generated.model
  const fallback = generated.fallback
  const fallbackReason = generated.fallbackReason

  return streamResponse(new ReadableStream({
    cancel() { cancellation.abort() },
    async start(controller) {
      let hasText = false
      try {
        controller.enqueue(encodeEvent('meta', { sources, model, usedModel, fallback, fallbackReason, mode }))

        for await (const text of generated.text) {
          signal.throwIfAborted()
          hasText ||= Boolean(text.trim())
          controller.enqueue(encodeEvent('delta', { text }))
        }
        signal.throwIfAborted()
        if (!hasText) throw new Error('Empty generation')

        controller.enqueue(encodeEvent('done', {
          usage: {
            latency_ms: Date.now() - started,
            retrieval_ms: retrieval.usage?.latency_ms ?? 0,
            retrieval_cached: retrieval.usage?.cached === true,
          },
          model,
          usedModel,
          fallback,
          fallbackReason,
          mode,
          reference,
          refunded: false,
        }))
      } catch (error) {
        // Deliberately stopping after receiving text must not permit unlimited
        // free generation by cancelling just before the final event.
        const stoppedAfterText = signal.aborted && hasText
        const refunded = stoppedAfterText ? false : await refund()
        console.error(JSON.stringify({ event: 'chat_generation_failed', reason: error instanceof Error ? error.name : 'unknown' }))
        try {
          controller.enqueue(encodeEvent('error', {
            message: stoppedAfterText
              ? 'Die begonnene Antwort wurde gestoppt und berechnet.'
              : refunded
                ? 'Die Antwort konnte nicht erzeugt werden. Credits wurden erstattet.'
                : `Die Antwort konnte nicht erzeugt werden. Guthaben bitte mit Referenz ${reference} prüfen lassen.`,
            refunded,
            reference,
          }))
        } catch { /* The reader may already have disconnected. */ }
      } finally {
        try { controller.close() } catch { /* Already cancelled by the reader. */ }
      }
    },
  }), {
    'x-generation-model': model,
    'x-used-model': usedModel,
    'x-byok-fallback': String(fallback),
  })
}
