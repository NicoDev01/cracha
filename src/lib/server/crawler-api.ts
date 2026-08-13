import 'server-only'

import { getWorkerEnv } from './cloudflare'
import {
  affordablePages,
  CreditError,
  crawlCost,
  getCreditState,
  holdCrawlCredits,
  releaseCrawlCredits,
} from './credits'
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
  //
  // Deliberately the same message whether the id is unknown or belongs to
  // somebody else: the previous pair of messages told a caller which ids exist.
  const rebuilding = input.database_id ? await getOwnedDatabase(input.database_id, userId) : null
  if (input.database_id && !rebuilding) {
    throw new Error('Wissensbasis nicht gefunden oder Zugriff verweigert.')
  }

  // Every crawl is priced here rather than in the two routes that lead to it,
  // so a route added later cannot forget to ask. It happens before anything is
  // created: a refused crawl must not leave an empty knowledge base behind.
  //
  // A re-crawl costs the same as a first crawl. It fetches and indexes the
  // pages again, so it consumes the capacity again — the old model's
  // high-water mark, where rebuilding was free, was charging for the record
  // rather than for the work.
  const state = await getCreditState(userId)
  if (!rebuilding && state.databases >= state.maxDatabases) throw new CreditError('databases', state)
  const budget = affordablePages(state.balance)
  if (budget <= 0) throw new CreditError('credits', state, crawlCost(1))

  let database: DatabaseRecord
  if (rebuilding) {
    database = rebuilding
  } else {
    const name = input.database_name?.trim()
    if (!name) throw new Error('Ein Name für die Wissensbasis ist erforderlich.')
    database = await createDatabase(userId, name.slice(0, 160), sourceUrl.toString())
  }

  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) {
    throw new Error('Crawler-Service ist nicht konfiguriert.')
  }

  // Asking for more pages than the balance covers is capped rather than
  // refused. Someone with 30 credits who requests 100 pages gets the 30 they
  // can pay for; refusing the whole crawl would leave them to guess the number.
  const requested = resolveCrawlSettings(input, database.crawl_settings)
  const settings = { ...requested, limit: Math.min(requested.limit, budget) }

  // The ceiling is held now and settled against the real page count when the
  // crawl ends. Charging the ceiling outright would make every crawl cost its
  // limit; charging only at the end would let ten crawls started in the same
  // second each see the whole balance as free.
  //
  // The reference is minted here because the job id does not exist yet, and it
  // is written into the job record below so the settlement can find the hold.
  const holdReference = crypto.randomUUID()
  if (!(await holdCrawlCredits(userId, settings.limit, holdReference))) {
    throw new CreditError('credits', state, crawlCost(settings.limit))
  }

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
    // Nothing was fetched, so nothing is charged. Without this the credits stay
    // held until the 24-hour reaper releases them, and the account looks poorer
    // than it is for a day because a service was briefly down.
    await releaseCrawlCredits(holdReference)
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
    JSON.stringify({ user_id: userId, database_id: database.id, hold_reference: holdReference }),
    { expirationTtl: 86_400 },
  )
  // The caller no longer knows the id it is crawling into, so it is returned —
  // and so is the page limit actually granted, which the interface needs to say
  // when it came out lower than what was asked for.
  return {
    ...result,
    database_id: database.id,
    page_limit: settings.limit,
    requested_page_limit: requested.limit,
    credits_held: crawlCost(settings.limit),
  }
}
