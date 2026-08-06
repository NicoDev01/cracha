import 'server-only'

import { getWorkerEnv } from './cloudflare'
import {
  DEFAULT_CRAWL_SETTINGS,
  databaseRegistry,
  getOwnedDatabase,
  normalizeCrawlSettings,
  saveDatabase,
  type CrawlSettings,
  type CrawlType,
  type DatabaseRecord,
} from './database-registry'

export interface CrawlInput {
  url: string
  tenant_id: string
  database_name?: string
  type?: CrawlType
  max_depth?: number
  limit?: number
  include_patterns?: string[]
  exclude_patterns?: string[]
  respect_robots_txt?: boolean
}

/**
 * A re-crawl supplies no settings and must rebuild the knowledge base the way
 * it was built the first time. Anything the caller leaves out therefore falls
 * back to what the record stores, and only then to the defaults.
 */
export function resolveCrawlSettings(
  input: CrawlInput,
  stored: CrawlSettings | undefined,
): CrawlSettings {
  const base = stored ?? DEFAULT_CRAWL_SETTINGS
  return normalizeCrawlSettings({
    type: input.type ?? base.type,
    max_depth: input.max_depth ?? base.max_depth,
    limit: input.limit ?? base.limit,
    include_patterns: input.include_patterns ?? base.include_patterns,
    exclude_patterns: input.exclude_patterns ?? base.exclude_patterns,
    respect_robots_txt: input.respect_robots_txt ?? base.respect_robots_txt,
  })!
}

export async function enqueueCrawl(input: CrawlInput, userId: string) {
  const sourceUrl = new URL(input.url)
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('Ungültige Crawl-URL.')

  let database = await getOwnedDatabase(input.tenant_id, userId)
  if (!database) {
    const kv = databaseRegistry()
    const existing = await kv.get<Partial<DatabaseRecord>>(input.tenant_id, 'json')
    if (existing) throw new Error('Wissensbasis nicht gefunden oder Zugriff verweigert.')
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(input.tenant_id)) {
      throw new Error('Die ID darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten.')
    }
    const now = new Date().toISOString()
    database = {
      id: input.tenant_id,
      name: input.database_name || input.tenant_id,
      description: '',
      user_id: userId,
      source_url: sourceUrl.toString(),
      url: sourceUrl.toString(),
      created_at: now,
      updated_at: now,
      last_crawl: null,
      document_count: 0,
      chunks_count: 0,
      pages_count: 0,
      status: 'pending',
    }
    const indexKey = `user_index:${userId}`
    const index = await kv.get<{ databases?: string[] }>(indexKey, 'json')
    await Promise.all([
      saveDatabase(database),
      kv.put(indexKey, JSON.stringify({ databases: [...new Set([...(index?.databases ?? []), database.id])] })),
    ])
  }

  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) {
    throw new Error('Crawler-Service ist nicht konfiguriert.')
  }

  const settings = resolveCrawlSettings(input, database.crawl_settings)
  await saveDatabase({
    ...database,
    name: input.database_name || database.name,
    source_url: sourceUrl.toString(),
    url: sourceUrl.toString(),
    status: 'crawling',
    updated_at: new Date().toISOString(),
    last_error: undefined,
    crawl_settings: settings,
  })

  const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/crawl`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CRAWLER_API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: sourceUrl.toString(),
      tenant_id: input.tenant_id,
      user_id: userId,
      ...settings,
    }),
  })

  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean
    job_id?: string
    status?: string
    detail?: string
  }
  if (!response.ok || !result.success || !result.job_id) {
    await saveDatabase({
      ...database,
      status: 'failed',
      updated_at: new Date().toISOString(),
      last_error: 'Crawler-Auftrag konnte nicht gestartet werden.',
    })
    throw new Error(result.detail ?? `Crawler-Service antwortete mit ${response.status}.`)
  }

  await env.DATABASE_REGISTRY.put(
    `crawl_job:${result.job_id}`,
    JSON.stringify({ user_id: userId, database_id: database.id }),
    { expirationTtl: 86_400 },
  )
  return result
}
