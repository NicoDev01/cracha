import 'server-only'

import { getWorkerEnv } from './cloudflare'
import { allocateDatabaseSlot, deallocateDatabaseSlot, CreditError, getCreditState } from './credits'

export type CrawlType = 'single' | 'recursive' | 'sitemap'

/** What the knowledge base was built with, so a re-crawl can reproduce it. */
export interface CrawlSettings {
  type: CrawlType
  max_depth: number
  limit: number
  include_patterns: string[]
  exclude_patterns: string[]
  respect_robots_txt: boolean
}

export const DEFAULT_CRAWL_SETTINGS: CrawlSettings = {
  type: 'recursive',
  max_depth: 2,
  limit: 100,
  include_patterns: [],
  exclude_patterns: [],
  respect_robots_txt: true,
}

export interface DatabaseRecord {
  id: string
  name: string
  description: string
  user_id: string
  source_url: string
  url: string
  created_at: string
  updated_at: string
  last_crawl: string | null
  document_count: number
  chunks_count: number
  pages_count: number
  /**
   * The highest page count this knowledge base has ever reached, which is what
   * its owner's quota is charged. It never falls: a re-crawl that finds fewer
   * pages does not refund the ones already fetched. Absent on records written
   * before quotas existed, where pages_count is the best available stand-in.
   */
  pages_charged?: number
  status: 'pending' | 'crawling' | 'active' | 'failed' | 'deleting'
  ai_search_instance_id?: string
  last_error?: string
  crawl_settings?: CrawlSettings
  current_job_id?: string
}

export function ownerKey(userId: string, databaseId: string): string {
  return `owner:${userId}:${databaseId}`
}

function legacyIndexKey(userId: string): string {
  return `user_index:${userId}`
}

function patternList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, 20)
    : []
}

/** Records written before crawl settings were stored return undefined. */
export function normalizeCrawlSettings(value: unknown): CrawlSettings | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<CrawlSettings>
  const limit = Number(raw.limit)
  const maxDepth = Number(raw.max_depth)
  return {
    type: raw.type === 'single' || raw.type === 'sitemap' ? raw.type : 'recursive',
    max_depth: Number.isFinite(maxDepth) ? Math.min(Math.max(Math.floor(maxDepth), 0), 5) : 2,
    limit: Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 500) : 100,
    include_patterns: patternList(raw.include_patterns),
    exclude_patterns: patternList(raw.exclude_patterns),
    respect_robots_txt: raw.respect_robots_txt !== false,
  }
}

export function databaseRegistry(): KVNamespace {
  return getWorkerEnv().DATABASE_REGISTRY
}

/**
 * One key per membership instead of one array for all of them. The array was
 * read, extended and written back, so two knowledge bases created at the same
 * moment — a second tab, a double click — left only one behind in the list.
 * Independent keys have nothing to overwrite, and a prefix scan reads them back.
 */
export async function listOwnedDatabaseIds(userId: string): Promise<string[]> {
  const kv = databaseRegistry()
  const ids = new Set<string>()
  const prefix = `owner:${userId}:`
  let cursor: string | undefined

  do {
    const page = await kv.list({ prefix, cursor })
    for (const key of page.keys) {
      const id = key.name.slice(prefix.length)
      if (id) ids.add(id)
    }
    cursor = page.list_complete ? undefined : (page as { cursor?: string }).cursor
  } while (cursor)

  const legacy = await kv.get<{ databases?: string[] }>(legacyIndexKey(userId), 'json')
  const legacyIds = (legacy?.databases ?? []).filter(Boolean)
  if (legacyIds.length) {
    await Promise.all(legacyIds.map((id) => kv.put(ownerKey(userId, id), '1')))
    for (const id of legacyIds) ids.add(id)
  }
  if (legacy) await kv.delete(legacyIndexKey(userId))

  return [...ids]
}

/** The record and the membership are written as two independent keys. */
export async function claimDatabase(database: DatabaseRecord): Promise<void> {
  const kv = databaseRegistry()
  const results = await Promise.allSettled([
    saveDatabase(database),
    kv.put(ownerKey(database.user_id, database.id), '1'),
  ])
  const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (rejected) {
    throw rejected.reason
  }
}

export async function releaseDatabase(userId: string, databaseId: string): Promise<void> {
  const kv = databaseRegistry()
  const results = await Promise.allSettled([
    kv.delete(databaseId),
    kv.delete(ownerKey(userId, databaseId)),
  ])
  const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (rejected) {
    throw rejected.reason
  }
}

export async function getOwnedDatabase(id: string, userId: string): Promise<DatabaseRecord | null> {
  const kv = databaseRegistry()
  const raw = await kv.get<Partial<DatabaseRecord>>(id, 'json')
  if (!raw) return null
  if (raw.user_id && raw.user_id !== userId) return null

  if (!raw.user_id) {
    // Records written before ownership was stored on the record itself. The
    // claim has to be proven from this user's own index, never assumed.
    const owned = await kv.get(ownerKey(userId, id))
    if (owned === null) {
      const legacy = await kv.get<{ databases?: string[] }>(legacyIndexKey(userId), 'json')
      if (!(legacy?.databases ?? []).includes(id)) return null
    }
  }

  const now = new Date().toISOString()
  const sourceUrl = raw.source_url ?? raw.url ?? ''
  const storedName = raw.name?.trim()
  const legacyName = id
    .replace(/-[a-f0-9]{8}$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  const database: DatabaseRecord = {
    id,
    name: storedName && storedName !== id ? storedName : legacyName || id,
    description: raw.description ?? '',
    user_id: userId,
    source_url: sourceUrl,
    url: sourceUrl,
    created_at: raw.created_at ?? now,
    updated_at: raw.updated_at ?? raw.created_at ?? now,
    last_crawl: raw.last_crawl ?? null,
    document_count: raw.document_count ?? 0,
    chunks_count: raw.chunks_count ?? 0,
    pages_count: raw.pages_count ?? raw.document_count ?? 0,
    pages_charged: raw.pages_charged ?? raw.pages_count ?? raw.document_count ?? 0,
    status: raw.status === 'active' || raw.status === 'crawling' || raw.status === 'failed' || raw.status === 'deleting'
      ? raw.status
      : 'pending',
    ai_search_instance_id: raw.ai_search_instance_id,
    last_error: raw.last_error,
    crawl_settings: normalizeCrawlSettings(raw.crawl_settings),
    current_job_id: raw.current_job_id,
  }

  // Stamping the owner onto the record also writes the membership key, so the
  // record stops depending on the index that is about to disappear.
  if (!raw.user_id) await claimDatabase(database)
  return database
}

export async function coordinatorCommand<T>(databaseId: string, action: string, body: unknown): Promise<T> {
  const env = getWorkerEnv()
  if (!env.RAG_API) throw new Error('RAG_API-Binding fehlt.')
  const response = await env.RAG_API.fetch(`https://cracha-rag.internal/coordinator/${encodeURIComponent(databaseId)}/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RAG_QUERY_SECRET}` }, body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Koordination fehlgeschlagen (${response.status}).`)
  return response.json() as Promise<T>
}

export async function saveDatabase(database: DatabaseRecord, options?: { expectedJobId?: string; expectedGeneration?: number }): Promise<void> {
  await coordinatorCommand(database.id, 'save', { database, options })
}

/**
 * The only place a knowledge base id is minted. It used to be built in the
 * browser from the name plus eight characters of the user id and sent along
 * with the crawl, which let the client pick the key its own data is stored
 * under — and let a name someone else had taken block a new one. The name is
 * still the caller's; the key never is.
 */
export async function createDatabase(
  userId: string,
  name: string,
  sourceUrl: string,
  description = '',
): Promise<DatabaseRecord> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'kb'
  const now = new Date().toISOString()
  const databaseId = `${slug}-${crypto.randomUUID().slice(0, 8)}`

  const existingIds = await listOwnedDatabaseIds(userId)
  const allocation = await allocateDatabaseSlot(userId, databaseId, undefined, existingIds)
  if (!allocation.allowed) {
    const state = await getCreditState(userId)
    throw new CreditError('databases', state)
  }

  const database: DatabaseRecord = {
    id: databaseId,
    name,
    description,
    user_id: userId,
    source_url: sourceUrl,
    url: sourceUrl,
    created_at: now,
    updated_at: now,
    last_crawl: null,
    document_count: 0,
    chunks_count: 0,
    pages_count: 0,
    pages_charged: 0,
    status: 'pending',
  }

  try {
    await claimDatabase(database)
  } catch (err) {
    try {
      // A failed projection may already have committed inside the DO. Roll back
      // through that same authority before freeing its SQL reservation.
      const env = getWorkerEnv()
      const cleanup = await env.RAG_API.fetch(`https://cracha-rag.internal/databases/${encodeURIComponent(databaseId)}?user_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}` },
      })
      if (!cleanup.ok) throw new Error('Koordinierte Bereinigung unvollständig.')
      await releaseDatabase(userId, databaseId)
      const kv = databaseRegistry()
      const [record, owner] = await Promise.all([
        kv.get(databaseId),
        kv.get(ownerKey(userId, databaseId)),
      ])
      if (record === null && owner === null) {
        await deallocateDatabaseSlot(userId, databaseId)
      } else {
        console.error(JSON.stringify({ event: 'partial_kv_write_cleanup_ambiguous', userId, databaseId }))
      }
    } catch (cleanupErr) {
      console.error(JSON.stringify({ event: 'partial_kv_write_cleanup_failed', userId, databaseId, error: String(cleanupErr) }))
      // retain slot reservation on cleanup failure so quota is never bypassed
    }
    throw err
  }

  return database
}
