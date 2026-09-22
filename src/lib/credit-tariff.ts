// Public display tariff; authoritative welcome grant is maintained by the SQL migration.
export const CREDITS = {
  /** One page fetched and indexed. The unit the whole scale is built on. */
  perPage: 1,
  /** One answered question, regardless of how long the answer turns out. */
  perChatMessage: 5,
  /**
   * Handed to a new account. Enough to crawl a small site and ask a handful of
   * questions — a trial, not a free tier. Repeated here for display only: the
   * number that is actually granted lives in the migration that owns the
   * signup trigger, because what a new account is worth must not be something
   * a caller can name.
   */
  welcome: 100,
  /**
   * Knowledge bases per account. Not a money limit: every knowledge base holds
   * an AI Search instance, and the account-wide ceiling for those is 5 000.
   */
  maxDatabases: 25,
} as const

export interface CreditPackage {
  id: string
  credits: number
  /** Gross, in euro cents. Matches the Stripe price it names. */
  priceCents: number
  /** The Worker var holding the Stripe price id for this package. */
  priceEnvKey: 'STRIPE_PRICE_CREDITS_S' | 'STRIPE_PRICE_CREDITS_M' | 'STRIPE_PRICE_CREDITS_L'
  label: string
}

/**
 * Three sizes, with the discount growing on the larger ones. The smallest is
 * the anchor: ten euros buys 1 250 credits, so a credit is 0.8 cents and the
 * headline is legible — 1 250 pages, or 250 questions, or any mix of the two.
 */
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  { id: 'S', credits: 1_250, priceCents: 1_000, priceEnvKey: 'STRIPE_PRICE_CREDITS_S', label: 'Start' },
  { id: 'M', credits: 3_500, priceCents: 2_500, priceEnvKey: 'STRIPE_PRICE_CREDITS_M', label: 'Plus' },
  { id: 'L', credits: 7_500, priceCents: 5_000, priceEnvKey: 'STRIPE_PRICE_CREDITS_L', label: 'Pro' },
] as const

export function findPackage(id: unknown): CreditPackage | null {
  return CREDIT_PACKAGES.find((entry) => entry.id === id) ?? null
}

/** What a crawl of this many pages costs before it starts. */
export function crawlCost(pages: number): number {
  return Math.max(0, Math.ceil(pages)) * CREDITS.perPage
}

/** How many pages a balance still pays for. */
export function affordablePages(available: number): number {
  return Math.max(0, Math.floor(available / CREDITS.perPage))
}

