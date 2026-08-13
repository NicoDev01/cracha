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

/**
 * What one chargeable action costs us, in US dollars, from the measurements in
 * the comment on CREDITS. They are written down here so that a change to the
 * tariff has to face them: a price is only a price if somebody checks it is
 * still above cost.
 */
const COST_USD = {
  page: 0.0002,
  // 10 000 to 20 000 input tokens plus up to 4 000 output, at Gemini 3.5 Flash
  // Lite rates and the 5 percent AI Gateway credit fee.
  chatMessage: 0.005,
}
const USD_PER_EUR = 1.08

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
    expect(COST_USD.chatMessage).toBeGreaterThan(COST_USD.page)
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

describe('every package earns its keep', () => {
  const packages = [...CREDIT_PACKAGES]

  it.each(packages)('$label covers what it sells at a healthy margin', (pack) => {
    const revenueUsd = (pack.priceCents / 100) * USD_PER_EUR
    const perCreditUsd = revenueUsd / pack.credits

    // The two extremes: an account that spends everything on crawling, and one
    // that spends everything on questions. Both have to be profitable, because
    // either is a real customer.
    const pagesMargin = 1 - COST_USD.page / (perCreditUsd * CREDITS.perPage)
    const chatMargin = 1 - COST_USD.chatMessage / (perCreditUsd * CREDITS.perChatMessage)

    expect(pagesMargin).toBeGreaterThan(0.8)
    expect(chatMargin).toBeGreaterThan(0.5)
  })

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
