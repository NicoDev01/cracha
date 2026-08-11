import { authenticateIngest, authenticateQuery } from './auth'
import {
  deleteRetrievalCache,
  readRetrievalCache,
  retrievalCacheKey,
  writeRetrievalCache,
} from './cache'
import { databaseForIngest, databaseForUser, removeOwnership, saveDatabase } from './database'
import { assertText, HttpError, json, readJson } from './http'
import { deleteInstanceIfExists, deleteStaleItems, ensureInstance, instanceIdFor, retrieve, uploadPages } from './search'
import type { ConversationMessage, DatabaseRecord, Env, IngestPage, QueryBody } from './types'

interface IngestBody {
  database_id: string
  user_id: string
  pages: IngestPage[]
}

interface CompleteBody {
  database_id: string
  user_id: string
  active_keys: string[]
  pages_count: number
  chunks_count?: number
}

interface IndexStatusBody {
  database_id: string
  user_id: string
  active_keys: string[]
}

interface FailedBody {
  database_id: string
  user_id: string
  error?: string
}

function validPage(value: unknown): value is IngestPage {
  if (!value || typeof value !== 'object') return false
  const page = value as Partial<IngestPage>
  return Boolean(
    page.url &&
      page.title &&
      page.markdown &&
      page.checksum &&
      page.crawled_at &&
      // Optional, but a non-string would be indexed as a datetime and fail.
      (page.published_at === undefined || page.published_at === null || typeof page.published_at === 'string') &&
      new TextEncoder().encode(page.markdown).byteLength <= 3_750_000,
  )
}

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

async function handleQuery(request: Request, env: Env): Promise<Response> {
  const started = Date.now()
  await authenticateQuery(request, env)
  const body = await readJson<QueryBody>(request)
  const question = assertText(body.question, 'question', 4_000)
  const databaseId = assertText(body.tenant_id, 'tenant_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  const database = await databaseForUser(env, databaseId, userId)

  const topK = Number.isFinite(body.top_k) ? Math.min(Math.max(Number(body.top_k), 1), 12) : 8
  const messages = validHistory(body.messages)

  // Only the search is cached, never the answer. Retrieval is deterministic for
  // a given index version and is the larger half of the wait; the answer is
  // written fresh every time, so nobody is served yesterday's wording.
  const cacheKey = await retrievalCacheKey(database, question, topK, messages)
  const cached = await readRetrievalCache(env, cacheKey)
  if (cached) {
    return json(request, env, { ...cached, usage: { latency_ms: Date.now() - started, cached: true } })
  }

  const instance = env.AI_SEARCH.get(database.ai_search_instance_id ?? (await instanceIdFor(databaseId)))
  let retrieval
  try {
    retrieval = await retrieve(instance, question, topK, messages)
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
  return json(request, env, { ...payload, usage: { latency_ms: Date.now() - started, cached: false } })
}

async function handleIngest(request: Request, env: Env): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<IngestBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  if (!Array.isArray(body.pages) || !body.pages.length || body.pages.length > 25) {
    throw new HttpError(400, 'pages muss 1 bis 25 Seiten enthalten.')
  }
  if (!body.pages.every(validPage)) throw new HttpError(400, 'Ungültige Seite im Ingest-Request.')

  const database = await databaseForIngest(env, databaseId, userId)
  const instance = await ensureInstance(env, databaseId)
  const activeKeys = await uploadPages(instance, body.pages)
  await saveDatabase(env, {
    ...database,
    status: 'crawling',
    ai_search_instance_id: await instanceIdFor(databaseId),
    updated_at: new Date().toISOString(),
  })

  return json(request, env, { success: true, active_keys: activeKeys }, 202)
}

async function handleComplete(request: Request, env: Env): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<CompleteBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  if (!Array.isArray(body.active_keys) || !body.active_keys.every((key) => typeof key === 'string')) {
    throw new HttpError(400, 'active_keys ist ungültig.')
  }

  const database = await databaseForIngest(env, databaseId, userId)
  const instanceId = database.ai_search_instance_id ?? (await instanceIdFor(databaseId))
  const instance = env.AI_SEARCH.get(instanceId)
  const deleted = await deleteStaleItems(instance, new Set(body.active_keys))
  // The crawler calls this endpoint only after every retained item has produced
  // searchable chunks. The supplied count is therefore the committed index state.
  const chunksCount = Number.isFinite(body.chunks_count)
    ? Math.max(0, Math.floor(Number(body.chunks_count)))
    : database.chunks_count ?? 0
  const now = new Date().toISOString()
  const pagesCount = Math.max(0, Math.floor(body.pages_count))
  const updated: DatabaseRecord = {
    ...database,
    status: 'active',
    ai_search_instance_id: instanceId,
    pages_count: pagesCount,
    // This is the moment the real page count is known, so it is the moment the
    // owner's quota is settled. Taking the larger of the two keeps a re-crawl
    // that shrank the site from handing budget back.
    pages_charged: Math.max(database.pages_charged ?? 0, pagesCount),
    document_count: pagesCount,
    chunks_count: chunksCount,
    last_crawl: now,
    updated_at: now,
    last_error: undefined,
  }
  await saveDatabase(env, updated)

  return json(request, env, { success: true, deleted_stale_items: deleted, database: updated })
}

async function handleIndexStatus(request: Request, env: Env): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<IndexStatusBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  if (
    !Array.isArray(body.active_keys) ||
    !body.active_keys.length ||
    body.active_keys.length > 500 ||
    !body.active_keys.every((key) => typeof key === 'string')
  ) throw new HttpError(400, 'active_keys ist ungültig.')

  const database = await databaseForIngest(env, databaseId, userId)
  const instance = env.AI_SEARCH.get(database.ai_search_instance_id ?? (await instanceIdFor(databaseId)))
  const activeKeys = new Set(body.active_keys)
  const foundKeys = new Set<string>()
  const failures: string[] = []
  let pending = 0
  let searchable = 0
  let chunksCount = 0
  const pageSize = 50

  for (let page = 1; ; page += 1) {
    const response = await instance.items.list({ page, per_page: pageSize })
    for (const item of response.result) {
      if (!activeKeys.has(item.key)) continue
      foundKeys.add(item.key)
      const itemChunks = item.chunks_count ?? 0
      chunksCount += itemChunks
      // Chunks are queryable as soon as they exist: a stalled "running" item
      // was verified to be the top hit for text that only it contains. The item
      // may still gain chunks though, so it stays pending.
      if (item.status !== 'error' && itemChunks > 0) searchable += 1
      if (item.status === 'error') failures.push(`${item.key}: ${item.error ?? 'Indexierungsfehler'}`)
      else if (item.status === 'completed' || item.status === 'skipped') {
        if (itemChunks === 0) failures.push(`${item.key}: keine durchsuchbaren Inhalte erzeugt`)
      } else {
        pending += 1
      }
    }
    const totalCount = response.result_info?.total_count ?? response.result.length
    if (page * pageSize >= totalCount) break
  }

  pending += activeKeys.size - foundKeys.size
  return json(request, env, {
    ready: pending === 0 && failures.length === 0,
    pending,
    // How much of the knowledge base already answers questions. A crawl that
    // stalls on a few items is still usable and must not be reported as failed.
    searchable,
    failures,
    chunks_count: chunksCount,
  })
}

async function handleFailed(request: Request, env: Env): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<FailedBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  const database = await databaseForIngest(env, databaseId, userId)
  await saveDatabase(env, {
    ...database,
    status: 'failed',
    updated_at: new Date().toISOString(),
    last_error: typeof body.error === 'string' ? body.error.slice(0, 500) : 'Crawl oder Indexierung fehlgeschlagen.',
  })
  return json(request, env, { success: true })
}

async function handleDelete(request: Request, env: Env, databaseId: string): Promise<Response> {
  await authenticateQuery(request, env)
  const userId = assertText(new URL(request.url).searchParams.get('user_id'), 'user_id', 160)
  const database = await databaseForUser(env, databaseId, userId)
  const instanceId = database.ai_search_instance_id ?? (await instanceIdFor(databaseId))

  await deleteInstanceIfExists(env.AI_SEARCH, instanceId)

  const [, , purgedCacheEntries] = await Promise.all([
    env.DATABASE_REGISTRY.delete(databaseId),
    removeOwnership(env, userId, databaseId),
    deleteRetrievalCache(env, databaseId),
  ])
  return json(request, env, { success: true, purged_cache_entries: purgedCacheEntries })
}

async function route(request: Request, env: Env): Promise<Response> {
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
  if (request.method === 'POST' && url.pathname === '/query') return handleQuery(request, env)
  if (request.method === 'POST' && url.pathname === '/ingest/pages') return handleIngest(request, env)
  if (request.method === 'POST' && url.pathname === '/ingest/status') return handleIndexStatus(request, env)
  if (request.method === 'POST' && url.pathname === '/ingest/complete') return handleComplete(request, env)
  if (request.method === 'POST' && url.pathname === '/ingest/failed') return handleFailed(request, env)
  const deleteMatch = url.pathname.match(/^\/databases\/([^/]+)$/)
  if (request.method === 'DELETE' && deleteMatch) {
    return handleDelete(request, env, decodeURIComponent(deleteMatch[1]))
  }
  throw new HttpError(404, `Endpoint ${url.pathname} nicht gefunden.`)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID()
    const started = Date.now()
    try {
      const response = await route(request, env)
      console.log(JSON.stringify({ event: 'request', request_id: requestId, method: request.method, path: new URL(request.url).pathname, status: response.status, latency_ms: Date.now() - started }))
      return response
    } catch (error) {
      if (error instanceof HttpError) return json(request, env, { error: error.message }, error.status)
      console.error(JSON.stringify({ event: 'request_error', request_id: requestId, method: request.method, path: new URL(request.url).pathname, latency_ms: Date.now() - started, error: error instanceof Error ? error.message : 'unknown' }))
      return json(request, env, { error: 'Interner Serverfehler.' }, 500)
    }
  },
} satisfies ExportedHandler<Env>
