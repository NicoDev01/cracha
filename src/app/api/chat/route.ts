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

type StreamEvent = 'progress' | 'meta' | 'delta' | 'done' | 'error'

function encodeEvent(event: StreamEvent, data: unknown): Uint8Array {
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
  // From here on the reply is a stream, so the reader can watch the search
  // work. Every later failure is an `error` event carrying the refund state,
  // which the client shows exactly like the HTTP errors it replaced.
  const cancellation = new AbortController()
  const signal = AbortSignal.any([request.signal, cancellation.signal])
  const mode = parsed.data.mode

  return streamResponse(new ReadableStream({
    cancel() { cancellation.abort() },
    async start(controller) {
      const send = (event: StreamEvent, data: unknown) => {
        try { controller.enqueue(encodeEvent(event, data)) } catch { /* The reader has gone. */ }
      }
      const fail = async (message: string) => {
        const refunded = await refund()
        send('error', {
          message: refunded ? `${message} Credits wurden erstattet.` : `${message} Guthaben bitte mit Referenz ${reference} prüfen lassen.`,
          refunded,
          reference,
        })
      }
      try {
        let env: CloudflareEnv
        let retrieval: RetrievalResponse & { context: string }
        try {
          env = getWorkerEnv()
          retrieval = await searchKnowledgeBase(env, {
            signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
            body: { question, tenant_id: tenantId, user_id: user.id, top_k, messages },
            onProgress: (progress) => send('progress', progress),
          })
        } catch (error) {
          await fail(error instanceof RetrievalError ? error.message : 'Suche vorübergehend nicht verfügbar.')
          return
        }

        const sources: Source[] = (retrieval.sources ?? []).map((source) => ({
          id: source.id,
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          relevance_score: source.score,
        }))
        const usage = () => ({
          latency_ms: Date.now() - started,
          retrieval_ms: retrieval.usage?.latency_ms ?? 0,
          retrieval_cached: retrieval.usage?.cached === true,
        })
        if (!retrieval.context || sources.length === 0) {
          const refunded = await refund()
          // No model ran, so the answer line names none. It used to carry the
          // search service, which is the one place the reader saw it.
          const model = ''
          send('meta', { sources: [], model })
          send('delta', { text: 'Ich konnte in dieser Wissensbasis keine ausreichend relevanten Informationen finden.' })
          send('done', { usage: usage(), model, refunded, reference })
          return
        }

        // The key is read from the body only. It used to be accepted as a header as
        // well, and request headers are what platform logs and proxies record.
        const byokKey = parsed.data.api_key || undefined
        const configuredModel = env.GENERATION_MODEL || DEFAULT_GENERATION_MODEL
        const selectedModel = byokKey ? (parsed.data.model || DEFAULT_BYOK_MODEL) : configuredModel
        const gatewayId = (env as unknown as { AI_GATEWAY_ID?: string }).AI_GATEWAY_ID || process.env.CF_AI_GATEWAY_ID || process.env.AI_GATEWAY_ID

        let generated: Awaited<ReturnType<typeof streamGroundedAnswer>>
        try {
          generated = await streamGroundedAnswer({
            ai: env.AI,
            signal,
            model: selectedModel,
            question,
            history: messages,
            context: retrieval.context,
            // A content check quotes the draft, not a collection page; checking its
            // findings against the sources as list entries stripped their citations.
            blocks: mode === 'verification' ? [] : retrieval.blocks ?? [],
            apiKey: byokKey,
            gatewayId,
            mode,
          })
        } catch (error) {
          console.error(JSON.stringify({ event: 'chat_generation_failed', reason: error instanceof Error ? error.name : 'unknown' }))
          await fail('Die Antwort konnte nicht erzeugt werden.')
          return
        }

        const model = generated.model
        const usedModel = generated.usedModel || generated.model
        const fallback = generated.fallback
        const fallbackReason = generated.fallbackReason
        const fallbackDetail = generated.fallbackDetail
        const substituteReason = generated.substituteReason
        const substituteDetail = generated.substituteDetail
        let hasText = false
        try {
          send('meta', { sources, model, usedModel, fallback, fallbackReason, fallbackDetail, substituteReason, substituteDetail, mode })
          for await (const text of generated.text) {
            signal.throwIfAborted()
            hasText ||= Boolean(text.trim())
            send('delta', { text })
          }
          signal.throwIfAborted()
          if (!hasText) throw new Error('Empty generation')
          send('done', { usage: usage(), model, usedModel, fallback, fallbackReason, fallbackDetail, substituteReason, substituteDetail, mode, reference, refunded: false })
        } catch (error) {
          console.error(JSON.stringify({ event: 'chat_generation_failed', reason: error instanceof Error ? error.name : 'unknown' }))
          // Deliberately stopping after receiving text must not permit unlimited
          // free generation by cancelling just before the final event.
          if (signal.aborted && hasText) {
            send('error', { message: 'Die begonnene Antwort wurde gestoppt und berechnet.', refunded: false, reference })
          } else {
            await fail('Die Antwort konnte nicht erzeugt werden.')
          }
        }
      } finally {
        try { controller.close() } catch { /* Already cancelled by the reader. */ }
      }
    },
  }))
}

/** A failure the search service explained; its message is safe to show. */
class RetrievalError extends Error {}

const NDJSON = 'application/x-ndjson'

type RetrievalLine =
  | ({ type: 'progress' } & Record<string, unknown>)
  | ({ type: 'result' } & RetrievalResponse)
  | { type: 'error'; status?: number; error?: string }

/** Only the fields the reader is shown, so nothing else of the service leaks. */
function progressOf(data: Record<string, unknown>) {
  const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)
  return {
    stage: typeof data.stage === 'string' ? data.stage : 'found',
    pages: count(data.pages),
    passages: count(data.passages),
    sources: count(data.sources),
    search_query: typeof data.search_query === 'string' ? data.search_query.slice(0, 200) : undefined,
    title: typeof data.title === 'string' ? data.title.slice(0, 160) : undefined,
  }
}

/**
 * Asks the search service for progress lines and forwards each one; the last
 * line carries the result. A service that answers with plain JSON (an error
 * before the search started, or a version without progress) is read as before.
 */
async function searchKnowledgeBase(env: CloudflareEnv, options: {
  signal: AbortSignal
  body: Record<string, unknown>
  onProgress: (progress: ReturnType<typeof progressOf>) => void
}): Promise<RetrievalResponse & { context: string }> {
  const response = await env.RAG_API.fetch('https://cracha-rag.internal/query', {
    method: 'POST',
    signal: options.signal,
    headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}`, 'Content-Type': 'application/json', Accept: NDJSON },
    body: JSON.stringify(options.body),
  })
  let result: RetrievalResponse | undefined
  if ((response.headers.get('Content-Type') ?? '').includes(NDJSON) && response.body) {
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    const readLine = (line: string) => {
      if (!line.trim()) return
      const data = JSON.parse(line) as RetrievalLine
      if (data.type === 'progress') options.onProgress(progressOf(data))
      else if (data.type === 'result') result = data
      else if (data.type === 'error') throw new RetrievalError(data.error || 'Suche in der Wissensbasis fehlgeschlagen.')
    }
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.forEach(readLine)
      }
      readLine(buffer)
    } finally {
      reader.releaseLock()
    }
  } else {
    const data = await response.json() as RetrievalResponse
    if (!response.ok) throw new RetrievalError(data?.error ?? 'Suche in der Wissensbasis fehlgeschlagen.')
    result = data
  }
  if (!result || typeof result !== 'object') throw new Error('Invalid retrieval response')
  if (result.context !== undefined && typeof result.context !== 'string') throw new Error('Invalid context')
  if (result.sources !== undefined && (!Array.isArray(result.sources) || result.sources.some((source) =>
    !source || typeof source.id !== 'string' || typeof source.title !== 'string' || typeof source.url !== 'string'
  ))) throw new Error('Invalid sources')
  return { ...result, context: result.context ?? '' }
}
