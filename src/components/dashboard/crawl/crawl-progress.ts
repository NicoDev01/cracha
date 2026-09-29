import type { CrawlJob } from '@/stores/crawl-store'

const number = new Intl.NumberFormat('de-DE')

/**
 * The most pages this crawl may fetch. Jobs started before the limit was
 * stored fall back to the crawler's own figure, which during the crawl phase is
 * the same limit.
 */
export function crawlPageLimit(job: Pick<CrawlJob, 'page_limit' | 'progress'>): number | null {
  if (typeof job.page_limit === 'number' && job.page_limit > 0) return job.page_limit
  const progress = job.progress
  return progress?.stage === 'crawling' && progress.total > 0 ? progress.total : null
}

/**
 * One line saying where the crawl stands, in the reader's words. While pages
 * are fetched the total is only a ceiling -- a site may have fewer pages than
 * the limit -- so it reads "von max.", and there is no percentage or ETA.
 */
export function crawlProgressLabel(job: Pick<CrawlJob, 'phase' | 'page_limit' | 'progress' | 'pages_crawled'>): string {
  const current = job.progress?.current ?? 0
  if (job.phase === 'queued') return 'Wird gestartet'
  if (job.phase === 'indexing') {
    return current === 0
      ? 'Seiten werden aufbereitet'
      : `${number.format(current)} von ${number.format(job.progress?.total ?? job.pages_crawled)} Seiten bereit`
  }
  const limit = crawlPageLimit(job)
  if (current === 0) return limit ? `Seiten werden gesucht (max. ${number.format(limit)})` : 'Seiten werden gesucht'
  return limit
    ? `${number.format(current)} von max. ${number.format(limit)} Seiten erfasst`
    : `${number.format(current)} Seiten erfasst`
}

/**
 * The one figure a finished crawl shows: how many pages the knowledge base
 * holds. A completed crawl always has searchable pages, so a 0 can only come
 * from a job recorded before the indexed count was fixed; it falls back to the
 * pages that were handed to the index.
 */
export function crawlIndexedLabel(job: Pick<CrawlJob, 'indexed_pages' | 'pages_crawled'>): string {
  const pages = job.indexed_pages || job.pages_crawled
  return `${number.format(pages)} ${pages === 1 ? 'Seite' : 'Seiten'} in der Wissensbasis`
}

export function crawlResultLabel(job: Pick<CrawlJob, 'indexed_pages' | 'pages_crawled' | 'pages_skipped'>): string {
  const label = crawlIndexedLabel(job)
  return job.pages_skipped > 0 ? `${label} · ${number.format(job.pages_skipped)} übersprungen` : label
}

/** Typical length of each phase with no progress figure of its own, in seconds. */
const PREPARE_SECONDS = 4
const INDEX_SECONDS = 30

/** Rises quickly at first and never reaches the end on its own. */
function easeTowards(seconds: number, scale: number, ceiling: number): number {
  return ceiling * (1 - Math.exp(-Math.max(0, seconds) / scale))
}

/**
 * How full each of the three bars is, from 0 to 1.
 *
 * Only crawling has a count, and it is measured against the page limit. The
 * other two phases report nothing until they end -- the index even turns all
 * its pages searchable at once -- so their bars move with the time spent and
 * slow down before the end instead of jumping from 0 to 100.
 */
export function crawlStepProgress(
  job: Pick<CrawlJob, 'phase' | 'status' | 'page_limit' | 'progress' | 'pages_crawled' | 'phase_started_at' | 'created_at'>,
  now: number,
): [number, number, number] {
  const since = (now - new Date(job.phase_started_at ?? job.created_at).getTime()) / 1000
  switch (job.phase) {
    case 'queued':
      return [easeTowards(since, PREPARE_SECONDS, 0.9), 0, 0]
    case 'crawling': {
      const limit = crawlPageLimit(job)
      const found = job.progress?.current ?? job.pages_crawled
      const counted = limit ? Math.min(1, found / limit) : 0
      // A start without pages yet still moves, a little.
      return [1, Math.min(0.97, Math.max(counted, easeTowards(since, 20, 0.12))), 0]
    }
    case 'indexing': {
      // Searchable pages are the one real signal; the clock only fills the
      // time before the first ones appear. The last step waits for a
      // confirming poll, so a full count still stops short of the end.
      const total = job.progress?.total || job.pages_crawled
      const searchable = total > 0 ? Math.min(1, (job.progress?.searchable ?? 0) / total) : 0
      return [1, 1, Math.max(easeTowards(since, INDEX_SECONDS, 0.95), searchable * 0.97)]
    }
    case 'completed':
      return [1, 1, 1]
    default:
      return [0, 0, 0]
  }
}

/** How much of the whole run each step stands for: starting is quick, fetching takes longest. */
const STEP_WEIGHTS = [0.1, 0.6, 0.3] as const

/** The three step bars as one figure from 0 to 100, for the bar above the steps. */
export function crawlOverallPercent(progress: [number, number, number]): number {
  const total = progress.reduce((sum, value, index) => sum + Math.min(1, Math.max(0, value)) * STEP_WEIGHTS[index], 0)
  return Math.round(total * 100)
}
