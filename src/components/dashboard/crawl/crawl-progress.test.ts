import { describe, expect, it } from 'vitest'

import type { CrawlJob } from '@/stores/crawl-store'

import { crawlPageLimit, crawlProgressLabel, crawlResultLabel } from './crawl-progress'

type Job = Pick<CrawlJob, 'phase' | 'page_limit' | 'progress' | 'pages_crawled'>
const job = (overrides: Partial<Job>): Job => ({ phase: 'crawling', pages_crawled: 0, ...overrides })

describe('crawlProgressLabel', () => {
  it('shows fetched pages against the configured limit while crawling', () => {
    expect(crawlProgressLabel(job({ page_limit: 200, progress: { stage: 'crawling', current: 37, total: 200, percent: 18 } })))
      .toBe('37 von max. 200 Seiten erfasst')
  })

  it('names the limit before the first page arrives', () => {
    expect(crawlProgressLabel(job({ page_limit: 20, progress: { stage: 'crawling', current: 0, total: 20, percent: 0 } })))
      .toBe('Seiten werden gesucht (max. 20)')
  })

  it('falls back to the crawler total for jobs stored without a limit', () => {
    expect(crawlPageLimit(job({ progress: { stage: 'crawling', current: 3, total: 50, percent: 6 } }))).toBe(50)
    expect(crawlProgressLabel(job({ progress: { stage: 'crawling', current: 3, total: 0, percent: 0 } })))
      .toBe('3 Seiten erfasst')
  })

  it('keeps the indexing and queued wording', () => {
    expect(crawlProgressLabel(job({ phase: 'indexing', page_limit: 200, progress: { stage: 'indexing', current: 12, total: 40, percent: 30 } })))
      .toBe('12 von 40 Seiten bereit')
    expect(crawlProgressLabel(job({ phase: 'queued', page_limit: 200 }))).toBe('Wird gestartet')
  })

  it('formats large numbers the German way', () => {
    expect(crawlProgressLabel(job({ page_limit: 1500, progress: { stage: 'crawling', current: 1200, total: 1500, percent: 80 } })))
      .toBe('1.200 von max. 1.500 Seiten erfasst')
  })
})

describe('crawlResultLabel', () => {
  it('shows the pages in the knowledge base', () => {
    expect(crawlResultLabel({ indexed_pages: 13, pages_crawled: 13, pages_skipped: 0 })).toBe('13 Seiten in der Wissensbasis')
  })

  it('mentions skipped pages only when there are any', () => {
    expect(crawlResultLabel({ indexed_pages: 1, pages_crawled: 1, pages_skipped: 2 })).toBe('1 Seite in der Wissensbasis · 2 übersprungen')
  })

  it('falls back to the fetched pages for jobs recorded with 0 indexed', () => {
    expect(crawlResultLabel({ indexed_pages: 0, pages_crawled: 13, pages_skipped: 0 })).toBe('13 Seiten in der Wissensbasis')
  })
})
