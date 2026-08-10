import 'server-only'

import { getWorkerEnv } from './cloudflare'
import {
  createDatabase,
  DEFAULT_CRAWL_SETTINGS,
  getOwnedDatabase,
  normalizeCrawlSettings,
  saveDatabase,
  type CrawlSettings,
  type CrawlType,
  type DatabaseRecord,
} from './database-registry'

export interface CrawlInput {
  url: string
  /** An existing knowledge base of this user. Absent means: create a new one. */
  database_id?: string
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

export interface SiteAnalysis {
  total_pages: number | null
  sitemap_url: string | null
  truncated: boolean
}

/**
 * Reads the site's sitemaps and reports how many pages it declares. Nothing is
 * crawled or indexed, so this stays cheap enough to run on every keystroke-free
 * button press.
 */
export async function analyzeSite(url: string): Promise<SiteAnalysis> {
  const sourceUrl = new URL(url)
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('Ungültige URL.')

  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) {
    throw new Error('Crawler-Service ist nicht konfiguriert.')
  }

  const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CRAWLER_API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: sourceUrl.toString() }),
  })

  const result = (await response.json().catch(() => ({}))) as Partial<SiteAnalysis> & { detail?: string }
  if (!response.ok) throw new Error(result.detail ?? `Analyse fehlgeschlagen (${response.status}).`)

  return {
    total_pages: typeof result.total_pages === 'number' ? result.total_pages : null,
    sitemap_url: typeof result.sitemap_url === 'string' ? result.sitemap_url : null,
    truncated: result.truncated === true,
  }
}

export async function enqueueCrawl(input: CrawlInput, userId: string) {
  const sourceUrl = new URL(input.url)
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('Ungültige Crawl-URL.')

  // Naming an existing knowledge base means re-crawling that one, and it must
  // belong to the caller. Naming none means creating one, and only then does an
  // id come into existence — server-side.
  let database: DatabaseRecord
  if (input.database_id) {
    const owned = await getOwnedDatabase(input.database_id, userId)
    // Deliberately the same message whether the id is unknown or belongs to
    // somebody else: the previous pair of messages told a caller which ids
    // exist.
    if (!owned) throw new Error('Wissensbasis nicht gefunden oder Zugriff verweigert.')
    database = owned
  } else {
    const name = input.database_name?.trim()
    if (!name) throw new Error('Ein Name für die Wissensbasis ist erforderlich.')
    database = await createDatabase(userId, name.slice(0, 160), sourceUrl.toString())
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
      tenant_id: database.id,
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
  // The caller no longer knows the id it is crawling into, so it is returned.
  return { ...result, database_id: database.id }
}
