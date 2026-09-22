import { authenticateIngest, authenticateQuery } from './auth'
import { deleteRetrievalCache } from './cache'
import { removeOwnership } from './database'
import { assertText, HttpError, json, readJson } from './http'
import { deleteInstanceIfExists, deleteStaleItems, ensureInstance, instanceIdFor, uploadPages } from './search'
import type { DatabaseRecord, Env, IngestPage, KnownItem } from './types'
import type { MutationContext } from './coordinator'

interface IngestBody {
  database_id: string
  user_id: string
  pages: IngestPage[]
  /** The previous batch's item listing, so the scan runs once per crawl. */
  known_items?: Record<string, KnownItem>
  job_id?: string
}

interface CompleteBody {
  database_id: string
  user_id: string
  active_keys: string[]
  pages_count: number
  chunks_count?: number
  job_id?: string
}

interface IndexStatusBody {
  database_id: string
  user_id: string
  active_keys: string[]
  job_id?: string
}

interface FailedBody {
  database_id: string
  user_id: string
  error?: string
  job_id?: string
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

async function assertActiveJob(
  env: Env,
  databaseId: string,
  userId: string,
  jobId: string | undefined,
  coord: MutationContext,
): Promise<DatabaseRecord> {
  await coord.assertActive(jobId)
  const database = await coord.owned(databaseId, userId)
  if (database.status === 'deleting') {
    await coord.markDeleting()
    throw new HttpError(409, 'Die Wissensbasis wird derzeit gelöscht.')
  }
  if (database.status !== 'crawling') {
    throw new HttpError(409, `Wissensbasis befindet sich nicht im Indexierungszustand (Status: ${database.status}).`)
  }
  if (database.current_job_id && (!jobId || database.current_job_id !== jobId)) {
    throw new HttpError(409, `Callback gehört nicht zum aktiven Crawl-Job (${jobId ?? 'keine ID'} != ${database.current_job_id}).`)
  }
  return database
}

async function handleIngest(request: Request, env: Env, coord: MutationContext): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<IngestBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  if (!Array.isArray(body.pages) || !body.pages.length || body.pages.length > 25) {
    throw new HttpError(400, 'pages muss 1 bis 25 Seiten enthalten.')
  }
  if (!body.pages.every(validPage)) throw new HttpError(400, 'Ungültige Seite im Ingest-Request.')

  await assertActiveJob(env, databaseId, userId, body.job_id, coord)
  await coord.beginExternal()
  const instance = await ensureInstance(env, databaseId)
  const { keys, known_items } = await uploadPages(
    instance,
    body.pages,
    body.known_items,
    async () => {
      await assertActiveJob(env, databaseId, userId, body.job_id, coord)
    },
  )

  const fresh = await assertActiveJob(env, databaseId, userId, body.job_id, coord)
  await coord.save(
    {
      ...fresh,
      status: 'crawling',
      ai_search_instance_id: await instanceIdFor(databaseId),
      updated_at: new Date().toISOString(),
    },
    { expectedJobId: body.job_id },
  )

  return json(request, env, { success: true, active_keys: keys, known_items }, 202)
}

async function handleComplete(request: Request, env: Env, coord: MutationContext): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<CompleteBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)
  if (!Array.isArray(body.active_keys) || !body.active_keys.every((key) => typeof key === 'string')) {
    throw new HttpError(400, 'active_keys ist ungültig.')
  }

  const database = await assertActiveJob(env, databaseId, userId, body.job_id, coord)
  const instanceId = database.ai_search_instance_id ?? (await instanceIdFor(databaseId))
  const instance = env.AI_SEARCH.get(instanceId)
  await coord.beginExternal()
  const deleted = await deleteStaleItems(
    instance,
    new Set(body.active_keys),
    async () => {
      await assertActiveJob(env, databaseId, userId, body.job_id, coord)
    },
  )

  const fresh = await assertActiveJob(env, databaseId, userId, body.job_id, coord)
  // The crawler calls this endpoint only after every retained item has produced
  // searchable chunks. The supplied count is therefore the committed index state.
  const chunksCount = Number.isFinite(body.chunks_count)
    ? Math.max(0, Math.floor(Number(body.chunks_count)))
    : fresh.chunks_count ?? 0
  const now = new Date().toISOString()
  const pagesCount = Math.max(0, Math.floor(body.pages_count))
  const updated: DatabaseRecord = {
    ...fresh,
    status: 'active',
    ai_search_instance_id: instanceId,
    pages_count: pagesCount,
    // This is the moment the real page count is known, so it is the moment the
    // owner's quota is settled. Taking the larger of the two keeps a re-crawl
    // that shrank the site from handing budget back.
    pages_charged: Math.max(fresh.pages_charged ?? 0, pagesCount),
    document_count: pagesCount,
    chunks_count: chunksCount,
    last_crawl: now,
    updated_at: now,
    last_error: undefined,
    current_job_id: undefined,
  }
  await coord.save(updated, { expectedJobId: body.job_id })

  return json(request, env, { success: true, deleted_stale_items: deleted, database: updated })
}

async function handleIndexStatus(request: Request, env: Env, coord: MutationContext): Promise<Response> {
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

  const database = await assertActiveJob(env, databaseId, userId, body.job_id, coord)
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

async function handleFailed(request: Request, env: Env, coord: MutationContext): Promise<Response> {
  await authenticateIngest(request, env)
  const body = await readJson<FailedBody>(request)
  const databaseId = assertText(body.database_id, 'database_id', 160)
  const userId = assertText(body.user_id, 'user_id', 160)

  const database = await coord.owned(databaseId, userId)
  if (database.status === 'deleting') {
    throw new HttpError(409, 'Die Wissensbasis wird derzeit gelöscht.')
  }
  if (database.status !== 'crawling') {
    return json(request, env, { success: true, ignored: true })
  }
  if (database.current_job_id && (!body.job_id || database.current_job_id !== body.job_id)) {
    return json(request, env, { success: true, ignored: true })
  }
  const fresh = await coord.owned(databaseId, userId)
  if (fresh.status !== 'crawling') {
    return json(request, env, { success: true, ignored: true })
  }
  if (fresh.current_job_id && (!body.job_id || fresh.current_job_id !== body.job_id)) {
    return json(request, env, { success: true, ignored: true })
  }
  await coord.save(
    {
      ...fresh,
      status: 'failed',
      current_job_id: undefined,
      updated_at: new Date().toISOString(),
      last_error: typeof body.error === 'string' ? body.error.slice(0, 500) : 'Crawl oder Indexierung fehlgeschlagen.',
    },
    { expectedJobId: body.job_id },
  )
  return json(request, env, { success: true })
}

async function handleDelete(request: Request, env: Env, databaseId: string, coord: MutationContext): Promise<Response> {
  await authenticateQuery(request, env)
  const userId = assertText(new URL(request.url).searchParams.get('user_id'), 'user_id', 160)

  let database: DatabaseRecord | null = null
  try {
    database = await coord.owned(databaseId, userId)
  } catch (err) {
    if (err instanceof HttpError && err.status === 403) {
      throw err
    }
    if (err instanceof HttpError && err.status === 404) {
      // Not found for this user in registry. Verify no other user owns it:
      const raw = await env.DATABASE_REGISTRY.get<DatabaseRecord>(databaseId, 'json')
      if (raw && raw.user_id && raw.user_id !== userId) {
        throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
      }
      database = null
    } else {
      throw err
    }
  }

  if (database && database.status === 'crawling') {
    throw new HttpError(409, 'Wissensbasis wird noch indexiert.')
  }

  await coord.markDeleting()

  if (database) {
    await coord.save({
      ...database,
      status: 'deleting',
      updated_at: new Date().toISOString(),
    })
  }

  const instanceId = database?.ai_search_instance_id ?? (await instanceIdFor(databaseId))
  await coord.beginExternal()
  await deleteInstanceIfExists(env.AI_SEARCH, instanceId)

  await removeOwnership(env, userId, databaseId)
  const purgedCacheEntries = await deleteRetrievalCache(env, databaseId)

  await coord.markDeleted()

  return json(request, env, { success: true, purged_cache_entries: purgedCacheEntries })
}

async function handleCoordinatorRequest(
  request: Request,
  env: Env,
  databaseId: string,
  action: string,
  coord: MutationContext,
): Promise<Response> {
  await authenticateQuery(request, env)
  const body = (request.method === 'POST' ? await readJson<Record<string, unknown>>(request).catch(() => ({})) : {}) as Record<string, unknown>
  if (action === 'save' && request.method === 'POST') {
    if ((body.database as DatabaseRecord)?.id !== databaseId) throw new HttpError(400, 'Database ID mismatch.')
    await coord.externalSave(
      body.database as DatabaseRecord,
      body.options as { expectedJobId?: string; expectedGeneration?: number } | undefined,
    )
    return json(request, env, { success: true })
  }
  if (action === 'start-job' && request.method === 'POST') {
    const record = await coord.startJob({
      jobId: body.jobId as string,
      record: body.record as Partial<DatabaseRecord>,
    })
    return json(request, env, { success: true, record })
  }
  if (action === 'cancel-job' && request.method === 'POST') {
    const res = await coord.cancelJob({ jobId: body.jobId as string, reason: body.reason as string | undefined })
    return json(request, env, res)
  }
  if (action === 'update-metadata' && request.method === 'POST') {
    const record = await coord.updateMetadata(body)
    return json(request, env, { success: true, database: record })
  }
  if (action === 'owned' && request.method === 'POST') {
    const database = await coord.owned(databaseId, assertText(body.user_id, 'user_id', 160))
    return json(request, env, { database })
  }
  if (action === 'state' && request.method === 'GET') {
    const state = await coord.getState()
    return json(request, env, { state })
  }
  throw new HttpError(404, `Coordinator endpoint ${action} nicht gefunden.`)
}


export async function executeOperation(request: Request, env: Env, coord: MutationContext): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'POST') {
    if (url.pathname === '/ingest/pages') return handleIngest(request, env, coord)
    if (url.pathname === '/ingest/complete') return handleComplete(request, env, coord)
    if (url.pathname === '/ingest/status') return handleIndexStatus(request, env, coord)
    if (url.pathname === '/ingest/failed') return handleFailed(request, env, coord)
  }
  const del = url.pathname.match(/^\/databases\/([^/]+)$/)
  if (del && request.method === 'DELETE') return handleDelete(request, env, decodeURIComponent(del[1]), coord)
  const command = url.pathname.match(/^\/coordinator\/([^/]+)\/([^/]+)$/)
  if (command) return handleCoordinatorRequest(request, env, decodeURIComponent(command[1]), command[2], coord)
  throw new HttpError(404, 'Unbekannter Befehl.')
}
