import { describe, expect, it } from 'vitest'

import { resolveCrawlSettings } from './crawler-api'
import { normalizeCrawlSettings, type CrawlSettings } from './database-registry'

const sitemapBase: CrawlSettings = {
  type: 'sitemap',
  max_depth: 4,
  limit: 350,
  include_patterns: ['*/docs/*'],
  exclude_patterns: ['*/private/*'],
  respect_robots_txt: false,
}

describe('re-crawl settings', () => {
  it('reproduces the crawl the knowledge base was built with', () => {
    // A re-crawl passes no settings. It previously fell back to limit 100 and
    // depth 2, so a base crawled with 350 pages shrank on every refresh.
    expect(resolveCrawlSettings({ url: 'https://example.com', database_id: 'kb' }, sitemapBase))
      .toEqual(sitemapBase)
  })

  it('lets an explicit value win over the stored one', () => {
    const resolved = resolveCrawlSettings(
      { url: 'https://example.com', database_id: 'kb', limit: 20 },
      sitemapBase,
    )
    expect(resolved.limit).toBe(20)
    expect(resolved.type).toBe('sitemap')
    expect(resolved.include_patterns).toEqual(['*/docs/*'])
  })

  it('falls back to the defaults for bases stored before settings were kept', () => {
    expect(resolveCrawlSettings({ url: 'https://example.com', database_id: 'kb' }, undefined))
      .toEqual({
        type: 'recursive',
        max_depth: 2,
        limit: 100,
        include_patterns: [],
        exclude_patterns: [],
        respect_robots_txt: true,
      })
  })

  it('keeps a deliberate false for robots.txt instead of reading it as absent', () => {
    const resolved = resolveCrawlSettings(
      { url: 'https://example.com', database_id: 'kb', respect_robots_txt: false },
      undefined,
    )
    expect(resolved.respect_robots_txt).toBe(false)
  })
})

describe('stored settings validation', () => {
  it('ignores records written before settings existed', () => {
    expect(normalizeCrawlSettings(undefined)).toBeUndefined()
    expect(normalizeCrawlSettings('recursive')).toBeUndefined()
  })

  it('bounds values that would overload the crawler', () => {
    const settings = normalizeCrawlSettings({ type: 'nonsense', max_depth: 99, limit: 100_000 })
    expect(settings).toMatchObject({ type: 'recursive', max_depth: 5, limit: 500 })
  })

  it('drops non-string patterns', () => {
    expect(normalizeCrawlSettings({ include_patterns: ['*/a/*', 7, null] })?.include_patterns)
      .toEqual(['*/a/*'])
  })
})
