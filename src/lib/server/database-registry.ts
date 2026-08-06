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

export async function getOwnedDatabase(id: string, userId: string): Promise<DatabaseRecord | null> {
  const kv = databaseRegistry()
  const raw = await kv.get<Partial<DatabaseRecord>>(id, 'json')
  if (!raw) return null
  if (raw.user_id && raw.user_id !== userId) return null

  if (!raw.user_id) {
    const index = await kv.get<{ databases?: string[] }>(`user_index:${userId}`, 'json')
    if (!(index?.databases ?? []).includes(id)) return null
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
    status: raw.status === 'active' || raw.status === 'crawling' || raw.status === 'failed'
      ? raw.status
      : 'pending',
    ai_search_instance_id: raw.ai_search_instance_id,
    last_error: raw.last_error,
    crawl_settings: normalizeCrawlSettings(raw.crawl_settings),
  }

  if (!raw.user_id) await saveDatabase(database)
  return database
}

export async function saveDatabase(database: DatabaseRecord): Promise<void> {
  await databaseRegistry().put(database.id, JSON.stringify(database))
}
