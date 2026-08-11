import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DatabaseRecord } from './database-registry'

const { store, meta, plan, PAGE_SIZE } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  meta: new Map<string, unknown>(),
  // Two keys per page, so the cursor loop in the tombstone scan is exercised by
  // a user with three deleted knowledge bases rather than by a thousand.
  plan: { row: null as Record<string, unknown> | null },
  PAGE_SIZE: 2,
}))

vi.mock('./cloudflare', () => ({
  getWorkerEnv: () => ({
    DATABASE_REGISTRY: {
      get: async (key: string, type?: string) => {
        const raw = store.get(key)
        if (raw === undefined) return null
        return type === 'json' ? JSON.parse(raw) : raw
      },
      put: async (key: string, value: string, options?: { metadata?: unknown }) => {
        store.set(key, value)
        if (options?.metadata !== undefined) meta.set(key, options.metadata)
      },
      delete: async (key: string) => {
        store.delete(key)
        meta.delete(key)
      },
      list: async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
        const matching = [...store.keys()].filter((key) => key.startsWith(prefix)).sort()
        const start = cursor ? Number(cursor) : 0
        const page = matching.slice(start, start + PAGE_SIZE)
        const next = start + PAGE_SIZE
        const complete = next >= matching.length
        return {
          keys: page.map((name) => ({ name, metadata: meta.get(name) })),
          list_complete: complete,
          cursor: complete ? undefined : String(next),
        }
      },
    },
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: plan.row, error: null }) }),
      }),
    }),
  }),
}))

const {
  PLAN_LIMITS,
  canCreateDatabase,
  chargedPages,
  getUsage,
  recordDeletedPages,
  remainingPages,
} = await import('./plan')
const { claimDatabase } = await import('./database-registry')

const ANNA = 'anna-0000-1111'
const BEN = 'ben-2222-3333'

const NOW = Date.parse('2026-08-11T12:00:00Z')
const RECENT = '2026-08-11T11:30:00Z'
const LONG_AGO = '2026-08-09T12:00:00Z'

function base(overrides: Partial<DatabaseRecord> & { id: string }): DatabaseRecord {
  return {
    name: overrides.id,
    description: '',
    user_id: ANNA,
    source_url: 'https://example.com',
    url: 'https://example.com',
    created_at: RECENT,
    updated_at: RECENT,
    last_crawl: null,
    document_count: 0,
    chunks_count: 0,
    pages_count: 0,
    pages_charged: 0,
    status: 'active',
    ...overrides,
  }
}

beforeEach(() => {
  store.clear()
  meta.clear()
  plan.row = null
})

describe('what a knowledge base costs its owner', () => {
  it('charges the high-water mark, not the current page count', () => {
    // A re-crawl that found a shrunken site. The pages of the first crawl were
    // still fetched and indexed, so they stay on the meter.
    const database = base({ id: 'kb', pages_count: 12, pages_charged: 40 })
    expect(chargedPages(database, NOW)).toBe(40)
  })

  it('falls back to the page count for records written before quotas existed', () => {
    const { pages_charged: _dropped, ...legacy } = base({ id: 'kb', pages_count: 30 })
    expect(chargedPages(legacy as DatabaseRecord, NOW)).toBe(30)
  })

  it('reserves the whole allowance while the crawl is still running', () => {
    // Without this, five crawls started in the same minute would each see the
    // full budget as free and the account would end up at five times the limit.
    const database = base({
      id: 'kb',
      status: 'crawling',
      pages_count: 0,
      pages_charged: 0,
      updated_at: RECENT,
      crawl_settings: {
        type: 'recursive',
        max_depth: 2,
        limit: 100,
        include_patterns: [],
        exclude_patterns: [],
        respect_robots_txt: true,
      },
    })
    expect(chargedPages(database, NOW)).toBe(100)
  })

  it('keeps the earlier bill when a re-crawl asks for less than it already cost', () => {
    const database = base({
      id: 'kb',
      status: 'crawling',
      pages_charged: 80,
      updated_at: RECENT,
      crawl_settings: {
        type: 'recursive',
        max_depth: 2,
        limit: 10,
        include_patterns: [],
        exclude_patterns: [],
        respect_robots_txt: true,
      },
    })
    expect(chargedPages(database, NOW)).toBe(80)
  })

  it('stops reserving for a crawl that has been silent for a day', () => {
    // A crawl writes to its record on every batch. One that has not written in
    // 24 hours died somewhere the failure callback could not reach, and the
    // account would never get the budget back.
    const database = base({
      id: 'kb',
      status: 'crawling',
      pages_charged: 0,
      updated_at: LONG_AGO,
      crawl_settings: {
        type: 'recursive',
        max_depth: 2,
        limit: 100,
        include_patterns: [],
        exclude_patterns: [],
        respect_robots_txt: true,
      },
    })
    expect(chargedPages(database, NOW)).toBe(0)
  })
})

describe('how much an account has left', () => {
  it('counts live knowledge bases and deleted ones alike', async () => {
    await claimDatabase(base({ id: 'kb-1', pages_charged: 30 }))
    await recordDeletedPages(ANNA, base({ id: 'kb-gone', pages_charged: 25 }))

    const usage = await getUsage(ANNA)
    expect(usage.pages).toBe(55)
    expect(usage.databases).toBe(1)
  })

  it('reads every marker, not just the first page of them', async () => {
    for (const id of ['gone-1', 'gone-2', 'gone-3', 'gone-4', 'gone-5']) {
      await recordDeletedPages(ANNA, base({ id, pages_charged: 4 }))
    }
    expect((await getUsage(ANNA)).pages).toBe(20)
  })

  it('keeps one account out of another', async () => {
    await claimDatabase(base({ id: 'kb-anna', pages_charged: 60 }))
    await recordDeletedPages(ANNA, base({ id: 'kb-anna-gone', pages_charged: 20 }))
    await claimDatabase(base({ id: 'kb-ben', user_id: BEN, pages_charged: 90 }))

    expect((await getUsage(ANNA)).pages).toBe(80)
    expect((await getUsage(BEN)).pages).toBe(90)
  })

  it('gives a free account the free ceiling and a paying one the paid ceiling', async () => {
    plan.row = { plan: 'pro', current_period_end: '2099-01-01T00:00:00Z', chat_messages_used: 4_000 }
    expect((await getUsage(ANNA)).limits.pages).toBe(PLAN_LIMITS.pro.pages)

    // An expired period is free again even if the webhook that should have said
    // so never arrived: the paid plan has to prove itself.
    plan.row = { plan: 'pro', current_period_end: '2020-01-01T00:00:00Z', chat_messages_used: 4_000 }
    expect((await getUsage(ANNA)).limits.pages).toBe(PLAN_LIMITS.free.pages)
  })
})

describe('what the next crawl may still fetch', () => {
  const usage = {
    plan: 'free' as const,
    limits: PLAN_LIMITS.free,
    databases: 2,
    pages: 70,
    chatMessages: 0,
  }

  it('offers what is left of the allowance', () => {
    expect(remainingPages(usage)).toBe(30)
  })

  it('does not charge a re-crawl twice for the pages it already paid for', () => {
    // Rebuilding a 40-page site must not fail just because those 40 pages are
    // on the meter — they are the ones being replaced.
    const rebuilding = base({ id: 'kb', pages_charged: 40 })
    expect(remainingPages(usage, rebuilding)).toBe(70)
  })

  it('never reports a negative budget', () => {
    expect(remainingPages({ ...usage, pages: 500 })).toBe(0)
  })

  it('refuses the sixth knowledge base and allows the fifth', () => {
    expect(canCreateDatabase({ ...usage, databases: 4 })).toBe(true)
    expect(canCreateDatabase({ ...usage, databases: 5 })).toBe(false)
  })
})
