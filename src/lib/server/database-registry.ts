import 'server-only'

import { getWorkerEnv } from './cloudflare'

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
  status: 'pending' | 'crawling' | 'active' | 'failed'
  ai_search_instance_id?: string
  last_error?: string
  crawl_settings?: CrawlSettings
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
export function ownerKey(userId: string, databaseId: string): string {
  return `owner:${userId}:${databaseId}`
}

function legacyIndexKey(userId: string): string {
  return `user_index:${userId}`
}

/**
 * Existing accounts still have their list in the old array. It is migrated the
 * first time it is read: the membership keys are written, then the array goes.
 * Doing it twice writes the same keys, so a concurrent read cannot break it.
 */
export async function listOwnedDatabaseIds(userId: string): Promise<string[]> {
  const kv = databaseRegistry()
  const prefix = ownerKey(userId, '')
  const ids = new Set<string>()

  let cursor: string | undefined
  do {
    // A user with more knowledge bases than one page holds would otherwise see
    // the list silently cut off, which is the bug this replaces.
    const page = await kv.list({ prefix, cursor })
    for (const key of page.keys) ids.add(key.name.slice(prefix.length))
    cursor = page.list_complete ? undefined : page.cursor
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
  await Promise.all([
    saveDatabase(database),
    databaseRegistry().put(ownerKey(database.user_id, database.id), '1'),
  ])
}

export async function releaseDatabase(userId: string, databaseId: string): Promise<void> {
  const kv = databaseRegistry()
  await Promise.all([kv.delete(databaseId), kv.delete(ownerKey(userId, databaseId))])
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
    status: raw.status === 'active' || raw.status === 'crawling' || raw.status === 'failed'
      ? raw.status
      : 'pending',
    ai_search_instance_id: raw.ai_search_instance_id,
    last_error: raw.last_error,
    crawl_settings: normalizeCrawlSettings(raw.crawl_settings),
  }

  // Stamping the owner onto the record also writes the membership key, so the
  // record stops depending on the index that is about to disappear.
  if (!raw.user_id) await claimDatabase(database)
  return database
}

export async function saveDatabase(database: DatabaseRecord): Promise<void> {
  await databaseRegistry().put(database.id, JSON.stringify(database))
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
  const database: DatabaseRecord = {
    id: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
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
  await claimDatabase(database)
  return database
}
