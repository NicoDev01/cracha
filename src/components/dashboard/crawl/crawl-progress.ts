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
