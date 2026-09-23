import 'server-only'
import { z } from 'zod'

import { getWorkerEnv } from './cloudflare'
import {
  affordablePages,
  bindCrawlHold,
  CreditError,
  crawlCost,
  getCreditState,
  holdCrawlCredits,
  releaseCrawlCredits,
} from './credits'
import {
  coordinatorCommand,
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
    signal: AbortSignal.timeout(130_000),
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
  if (rebuilding?.status === 'deleting') {
    throw new Error('Wissensbasis wird derzeit gelöscht.')
  }
  if (rebuilding?.status === 'crawling') {
    throw new Error('Wissensbasis wird bereits indexiert.')
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

  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) throw new Error('Crawler-Service ist nicht konfiguriert.')
  // A cold crawler container takes longer than five seconds to answer, and that
  // limit failed the crawl with a bare "The operation was aborted due to timeout".
  const healthResponse = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(30_000) })
    .catch(() => { throw new Error('Der Crawler ist gerade nicht erreichbar. Bitte versuche es in einer Minute erneut.') })
  const health = await healthResponse.json() as { billing_protocol?: number; settlement_configured?: boolean }
  if (!healthResponse.ok || health?.billing_protocol !== 1 || health?.settlement_configured !== true) throw new Error('Der Crawler ist noch nicht für die Guthabenabrechnung eingerichtet. Bitte kontaktiere den Support.')
  const name = input.database_name?.trim()
  if (!rebuilding && !name) throw new Error('Ein Name für die Wissensbasis ist erforderlich.')

  // Asking for more pages than the balance covers is capped rather than
  // refused. Someone with 30 credits who requests 100 pages gets the 30 they
  // can pay for; refusing the whole crawl would leave them to guess the number.
  const requested = resolveCrawlSettings(input, rebuilding?.crawl_settings)
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

  let database: DatabaseRecord
  try {
    database = rebuilding ?? await createDatabase(userId, name!.slice(0, 160), sourceUrl.toString())
    await bindCrawlHold(holdReference, database.id)
    await saveDatabase({
      ...database,
      name: input.database_name || database.name,
      source_url: sourceUrl.toString(),
      url: sourceUrl.toString(),
      status: 'crawling',
      current_job_id: holdReference,
      updated_at: new Date().toISOString(),
      last_error: undefined,
      crawl_settings: settings,
    })
  } catch (error) {
    await releaseCrawlCredits(holdReference)
    throw error
  }

  // Register the deterministic ID before dispatch so a lost reply remains observable.
  await env.DATABASE_REGISTRY.put(`crawl_job:${holdReference}`,
    JSON.stringify({ user_id: userId, database_id: database.id, hold_reference: holdReference }),
    { expirationTtl: 604_800 })
  let result: { success?: boolean; job_id?: string; status?: string; detail?: string } = {}
  let rejected: string | undefined
  try {
    const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/crawl`, {
      method: 'POST', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceUrl.toString(), tenant_id: database.id, user_id: userId, hold_reference: holdReference, ...settings }),
    })
    result = z.object({ success: z.boolean().optional(), job_id: z.string().optional(), status: z.string().optional(), detail: z.string().optional() }).parse(await response.json())
    // 5xx or a broken body might follow a successful dispatch. Keep that hold.
    if (response.status >= 400 && response.status < 500) rejected = result.detail ?? 'Crawler hat den Auftrag abgelehnt.'
    if (result.job_id && result.job_id !== holdReference) throw new Error('Crawler version mismatch')
  } catch {
    console.warn(JSON.stringify({ event: 'crawl_dispatch_uncertain', reference: holdReference }))
  }
  if (rejected) {
    await saveDatabase({ ...database, status: 'failed', current_job_id: undefined, updated_at: new Date().toISOString(), last_error: rejected }, { expectedJobId: holdReference })
    await releaseCrawlCredits(holdReference)
    throw new Error(rejected)
  }
  return {
    success: true, job_id: holdReference, status: result.status ?? 'queued',
    database_id: database.id, page_limit: settings.limit,
    requested_page_limit: requested.limit, credits_held: crawlCost(settings.limit),
  }
}

export type CrawlCancellation = { ok: true } | { ok: false; stage: 'crawler' | 'settlement' }

/**
 * Stops a crawl at the crawler, lets the coordinator retire the job — it
 * finishes every admitted index write first — and only then hands the hold
 * back. The `crawl_job:` record stays in KV on any failure, so the same
 * cancellation can simply be repeated.
 *
 * `finishedIsFine` accepts a crawler that says the job already ended (409).
 * The cancel button treats that as a failure; deleting an account only needs
 * the job to be no longer running.
 */
export async function cancelCrawlJob(
  job: { jobId: string; databaseId?: string | null; holdReference?: string | null },
  options: { finishedIsFine?: boolean; reason?: string } = {},
): Promise<CrawlCancellation> {
  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) return { ok: false, stage: 'crawler' }

  let response: Response
  try {
    response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/cancel/${encodeURIComponent(job.jobId)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}` },
    })
  } catch {
    return { ok: false, stage: 'crawler' }
  }
  const result = await response.json().catch(() => null) as { status?: unknown } | null
  const stopped = (response.ok && result?.status === 'cancelled')
    || response.status === 404
    || (options.finishedIsFine === true && response.status === 409)
  if (!stopped) return { ok: false, stage: 'crawler' }

  try {
    if (job.databaseId) {
      await coordinatorCommand(job.databaseId, 'cancel-job', {
        jobId: job.jobId,
        reason: response.status === 404
          ? 'Crawl-Auftrag wurde im Crawler nicht gefunden und storniert.'
          : options.reason ?? 'Vom Benutzer abgebrochen.',
      })
    }
    if (job.holdReference) await releaseCrawlCredits(job.holdReference)
  } catch {
    return { ok: false, stage: 'settlement' }
  }

  await env.DATABASE_REGISTRY.delete(`crawl_job:${job.jobId}`)
  return { ok: true }
}
