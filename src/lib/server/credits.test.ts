import { describe, expect, it, vi } from 'vitest'

// Nothing under test reads a binding, but the module graph reaches the
// Cloudflare context and Supabase, neither of which exists outside a Worker.
vi.mock('./cloudflare', () => ({ getWorkerEnv: () => ({}) }))
vi.mock('./database-registry', () => ({ listOwnedDatabaseIds: async () => [] }))

const {
  CREDITS,
  CREDIT_PACKAGES,
  affordablePages,
  crawlCost,
  findPackage,
  shortfallMessage,
} = await import('./credits')

describe('the exchange rate', () => {
  it('prices a page at one credit, because that is the unit everything else is read against', () => {
    expect(CREDITS.perPage).toBe(1)
    expect(crawlCost(250)).toBe(250)
  })

  it('charges an answer more than a page, because an answer costs more', () => {
    // The intuition runs the other way — crawling feels like the expensive part
    // — but crawling is network and a little CPU, while every question pushes
    // the whole retrieval context through a language model.
    expect(CREDITS.perChatMessage).toBeGreaterThan(CREDITS.perPage)
  })

  it('rounds a partial page up, so a crawl can never be cheaper than it is', () => {
    expect(crawlCost(0.2)).toBe(1)
    expect(crawlCost(0)).toBe(0)
    expect(crawlCost(-5)).toBe(0)
  })

  it('never promises more pages than the balance pays for', () => {
    expect(affordablePages(250)).toBe(250)
    expect(affordablePages(0)).toBe(0)
    expect(affordablePages(-10)).toBe(0)
  })
})

describe('package tariff consistency', () => {
  const packages = [...CREDIT_PACKAGES]

  it('gets cheaper per credit as the package gets bigger', () => {
    const perCredit = packages.map((pack) => pack.priceCents / pack.credits)
    for (let index = 1; index < perCredit.length; index += 1) {
      expect(perCredit[index]).toBeLessThan(perCredit[index - 1])
    }
  })

  it('names a distinct Stripe price for each package', () => {
    const keys = new Set(packages.map((pack) => pack.priceEnvKey))
    expect(keys.size).toBe(packages.length)
  })
})

describe('which package a request asked for', () => {
  it('finds the ones that exist', () => {
    expect(findPackage('S')?.credits).toBe(1_250)
  })

  it('refuses anything else, whatever shape it arrives in', () => {
    // This is the number that gets charged, so an unknown id has to be a
    // refusal rather than a fallback to the cheapest or the first.
    for (const value of ['', 'XL', 's', 0, 1, null, undefined, {}, ['S']]) {
      expect(findPackage(value)).toBeNull()
    }
  })
})

describe('what the refusal says', () => {
  const state = {
    balance: 3,
    reserved: 0,
    databases: 25,
    maxDatabases: 25,
    costs: { page: CREDITS.perPage, chatMessage: CREDITS.perChatMessage },
  }

  it('names the balance and what was needed, so the gap is visible', () => {
    const message = shortfallMessage('credits', state, CREDITS.perChatMessage)
    expect(message).toContain('3')
    expect(message).toContain(String(CREDITS.perChatMessage))
  })

  it('says the knowledge bases are full rather than blaming the balance', () => {
    const message = shortfallMessage('databases', state)
    expect(message).toContain('25')
    expect(message).not.toContain('Guthaben')
  })
})
