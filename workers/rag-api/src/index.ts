import { authenticateIngest, authenticateQuery } from './auth'
import {
  readRetrievalCache,
  retrievalCacheKey,
  writeRetrievalCache,
} from './cache'
import { databaseForUser } from './database'
import { forwardOperation, KnowledgeBaseCoordinator } from './coordinator'
import { assertText, HttpError, json, readJson } from './http'
import { instanceIdFor, resolveReranking, retrieve, type RetrievalProgress } from './search'
import type { ConversationMessage, Env, QueryBody, RetrievalResponse } from './types'

export { KnowledgeBaseCoordinator }

function validHistory(value: unknown): ConversationMessage[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 12) {
    throw new HttpError(400, 'messages darf höchstens 12 Einträge enthalten.')
  }
  return value.map((message) => {
    if (!message || typeof message !== 'object') throw new HttpError(400, 'Ungültige Nachricht.')
    const candidate = message as Partial<ConversationMessage>
    if (candidate.role !== 'user' && candidate.role !== 'assistant') {
      throw new HttpError(400, 'Ungültige Nachrichtenrolle.')
    }
    return { role: candidate.role, content: assertText(candidate.content, 'message.content', 2_000) }
  })
}

async function handleQuery(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const started = Date.now()
  await authenticateQuery(request, env)
  const body = await readJson<QueryBody>(request)
  const question = assertText(body.question, 'question', 4_000)
  const databaseId = assertText(body.tenant_id, 'tenant_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  const database = await databaseForUser(env, databaseId, userId)
  if (database.status === 'deleting') {
    throw new HttpError(409, 'Die Wissensbasis wird derzeit gelöscht.')
  }

  const topK = Number.isFinite(body.top_k) ? Math.min(Math.max(Number(body.top_k), 1), 12) : 8
  const messages = validHistory(body.messages)
  if (body.rerank !== undefined && typeof body.rerank !== 'boolean') {
    throw new HttpError(400, 'rerank muss true oder false sein.')
  }
  const rerank = resolveReranking(body.rerank, env.RERANKING)

  // Only the search is cached, never the answer. Retrieval is deterministic for
  // a given index version and is the larger half of the wait; the answer is
  // written fresh every time, so nobody is served yesterday's wording.
  const cacheKey = await retrievalCacheKey(database, question, topK, messages, { rerank })

  const run = async (onProgress?: (progress: RetrievalProgress) => void): Promise<RetrievalResponse> => {
    const cached = await readRetrievalCache(env, cacheKey)
    if (cached) {
      // Only the selected sources are cached, so that is all a repeat can show.
      onProgress?.({ stage: 'selected', sources: cached.sources.length, pages: cached.sources.length })
      return { ...cached, usage: { latency_ms: Date.now() - started, cached: true } }
    }

    const instance = env.AI_SEARCH.get(database.ai_search_instance_id ?? (await instanceIdFor(databaseId)))
    let retrieval
    try {
      retrieval = await retrieve(instance, question, topK, messages, { rerank, onProgress })
    } catch (error) {
      if (error instanceof Error && /ai_search_not_found|not found/i.test(error.message)) {
        throw new HttpError(409, 'Die Wissensbasis wird noch indexiert.')
      }
      throw error
    }
    const { context, blocks, sources, searchQuery } = retrieval
    const payload = {
      context,
      // The generator needs the blocks separately to verify citations against the
      // exact text each source number stands for.
      blocks,
      sources,
      search_query: searchQuery,
    }
    await writeRetrievalCache(env, cacheKey, payload)
    return { ...payload, usage: { latency_ms: Date.now() - started, cached: false } }
  }

  // The chat asks for progress lines so it can show the search working; every
  // other caller keeps the single JSON answer.
  if (!(request.headers.get('Accept') ?? '').includes(NDJSON)) return json(request, env, await run())

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const send = (line: unknown) => writer.write(encoder.encode(`${JSON.stringify(line)}\n`)).catch(() => undefined)
  const work = (async () => {
    try {
      const result = await run((progress) => { void send({ type: 'progress', ...progress }) })
      await send({ type: 'result', ...result })
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      if (!(error instanceof HttpError)) {
        console.error(JSON.stringify({ event: 'request_error', path: '/query', error: error instanceof Error ? error.message : 'unknown' }))
      }
      await send({ type: 'error', status, error: error instanceof HttpError ? error.message : 'Interner Serverfehler.' })
    } finally {
      await writer.close().catch(() => undefined)
    }
  })()
  ctx?.waitUntil(work)
  return new Response(readable, { headers: { 'Content-Type': `${NDJSON}; charset=utf-8`, 'Cache-Control': 'no-cache' } })
}

const NDJSON = 'application/x-ndjson'

async function route(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/health') {
    return json(request, env, { status: 'healthy', service: 'cracha-rag-api' })
  }
  if (request.method === 'GET' && url.pathname === '/') {
    return json(request, env, {
      service: 'CraCha RAG API',
      status: 'healthy',
      endpoints: ['/health', '/query'],
    })
  }
  if (request.method === 'POST' && url.pathname === '/query') return handleQuery(request, env, ctx)
  let databaseId: string | undefined
  if (request.method === 'POST' && url.pathname.startsWith('/ingest/')) {
    await authenticateIngest(request, env)
    const body = await readJson<{ database_id?: string }>(request.clone() as unknown as Request)
    databaseId = assertText(body.database_id, 'database_id', 160)
  } else if (/^\/(databases|coordinator)\//.test(url.pathname)) {
    await authenticateQuery(request, env)
    databaseId = assertText(decodeURIComponent(url.pathname.split('/')[2]), 'database_id', 160)
  }
  if (databaseId) return forwardOperation(env, databaseId, request)
  throw new HttpError(404, `Endpoint ${url.pathname} nicht gefunden.`)
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID()
    const started = Date.now()
    try {
      const response = await route(request as unknown as Request, env, ctx)
      console.log(JSON.stringify({ event: 'request', request_id: requestId, method: request.method, path: new URL(request.url).pathname, status: response.status, latency_ms: Date.now() - started }))
      return response
    } catch (error) {
      if (error instanceof HttpError) return json(request, env, { error: error.message }, error.status)
      console.error(JSON.stringify({ event: 'request_error', request_id: requestId, method: request.method, path: new URL(request.url).pathname, latency_ms: Date.now() - started, error: error instanceof Error ? error.message : 'unknown' }))
      return json(request, env, { error: 'Interner Serverfehler.' }, 500)
    }
  },
} satisfies ExportedHandler<Env>

