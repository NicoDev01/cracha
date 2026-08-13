import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

import { getWorkerEnv } from './cloudflare'
import { listOwnedDatabaseIds } from './database-registry'

/**
 * The tariff, in one place.
 *
 * The exchange rate is not a guess. It comes from what the two chargeable
 * actions actually cost us:
 *
 *   A crawled page — a Modal container at 2 CPU and 4 GB
 *   (services/crawler/modal_app.py:158) for one to two seconds, plus indexing,
 *   which Cloudflare AI Search includes at no charge during the open beta.
 *   Around $0.0002.
 *
 *   A chat answer — 10 000 to 20 000 input tokens through the generation model,
 *   because the retrieval budget is 24 000 characters and 64 000 for an
 *   enumerating question (workers/rag-api/src/search.ts:642), plus up to 4 000
 *   output tokens. At Gemini 3.5 Flash Lite rates, around $0.005.
 *
 * So an answer costs us roughly twenty-five times a page. That is the opposite
 * of what it looks like from the outside: crawling is network and a little CPU,
 * both nearly free, while every question pushes the whole context through a
 * language model, and model time is the most expensive thing we buy.
 *
 * The charged ratio is 5, not 25, on purpose. Metering the core interaction at
 * its true relative cost would make people ration the one thing the product is
 * for. The margin holds anyway, because the mixture pays for itself: at 0.8
 * cents a credit, a page earns 98 percent and an answer 88 percent.
 */
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

/**
 * Every credit movement runs as the service role.
 *
 * None of the ledger functions is callable by a signed-in user, and that is the
 * point: a balance is something you can add to as well as subtract from, so
 * there is no version of "they can only hurt themselves" that holds. The user
 * id always comes from the verified JWT on the server, never from a request
 * body.
 */
export function creditsAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getWorkerEnv().SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Abrechnung ist nicht konfiguriert.')
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await creditsAdmin().rpc(name, args)
  if (error) throw new Error(`${name} fehlgeschlagen: ${error.message}`)
  return data as T
}

export interface CreditState {
  /** Spendable now. */
  balance: number
  /** Held for crawls that are still running. */
  reserved: number
  databases: number
  maxDatabases: number
  costs: { page: number; chatMessage: number }
}

export async function getCreditState(userId: string): Promise<CreditState> {
  const [state, ids] = await Promise.all([
    rpc<{ balance?: number; reserved?: number }>('credit_state', { p_user: userId }),
    listOwnedDatabaseIds(userId),
  ])

  return {
    balance: state?.balance ?? 0,
    reserved: state?.reserved ?? 0,
    databases: ids.length,
    maxDatabases: CREDITS.maxDatabases,
    costs: { page: CREDITS.perPage, chatMessage: CREDITS.perChatMessage },
  }
}

/**
 * Charges for one answer. Decided and booked in a single statement, so two
 * questions sent at the same instant cannot both find the last credit unspent.
 *
 * The reference is fresh per request, which is what makes a retry after a
 * network failure cost once rather than twice.
 */
export async function spendChatCredits(userId: string, reference: string): Promise<boolean> {
  const result = await rpc<{ allowed?: boolean }>('credit_spend', {
    p_user: userId,
    p_amount: CREDITS.perChatMessage,
    p_kind: 'chat',
    p_reference: reference,
    p_detail: null,
  })
  return result?.allowed === true
}

/** Holds the ceiling a crawl is allowed to reach. Settled when it finishes. */
export async function holdCrawlCredits(userId: string, pages: number, jobReference: string): Promise<boolean> {
  const result = await rpc<{ allowed?: boolean }>('credit_hold', {
    p_user: userId,
    p_amount: crawlCost(pages),
    p_reference: jobReference,
  })
  return result?.allowed === true
}

export interface Settlement {
  settled: boolean
  spent: number
  refunded: number
}

/**
 * The crawl is over: charge the pages it really fetched and hand the rest of
 * the hold back. Safe to call more than once — the hold is deleted by the first
 * call, and every later one reports `settled: false` without moving anything.
 */
export async function settleCrawlCredits(jobReference: string, pages: number): Promise<Settlement> {
  const result = await rpc<{ settled?: boolean; spent?: number; refunded?: number }>('credit_settle', {
    p_reference: jobReference,
    p_actual: Math.max(0, Math.floor(pages)),
  })
  return {
    settled: result?.settled === true,
    spent: result?.spent ?? 0,
    refunded: result?.refunded ?? 0,
  }
}

/** The crawl failed or was cancelled: nothing delivered, nothing charged. */
export async function releaseCrawlCredits(jobReference: string): Promise<void> {
  await rpc('credit_release', { p_reference: jobReference })
}

/** A completed purchase. Idempotent on the Stripe session id. */
export async function grantPurchasedCredits(input: {
  userId: string
  credits: number
  sessionId: string
  detail?: string
}): Promise<boolean> {
  const result = await rpc<{ granted?: boolean }>('credit_grant', {
    p_user: input.userId,
    p_amount: input.credits,
    p_kind: 'purchase',
    p_reference: input.sessionId,
    p_detail: input.detail ?? null,
  })
  return result?.granted === true
}

export interface LedgerEntry {
  amount: number
  kind: string
  detail: string | null
  created_at: string
}

/** The last movements, newest first — what the account page shows. */
export async function recentEntries(userId: string, limit = 20): Promise<LedgerEntry[]> {
  const { data, error } = await creditsAdmin()
    .from('credit_entries')
    .select('amount, kind, detail, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Buchungen konnten nicht gelesen werden: ${error.message}`)
  return (data ?? []) as LedgerEntry[]
}

/** The Stripe customer this account already has, if it has ever bought. */
export async function existingCustomer(userId: string): Promise<string | null> {
  const { data } = await creditsAdmin()
    .from('credit_accounts')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.stripe_customer_id as string | null | undefined) ?? null
}

export async function rememberCustomer(userId: string, customerId: string): Promise<void> {
  await creditsAdmin()
    .from('credit_accounts')
    .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

export type ShortfallReason = 'credits' | 'databases'

/**
 * Carries the reason as data rather than as prose, so a route can answer 402
 * with something the interface can act on: offering a top-up when the balance
 * is the problem, and saying plainly that the knowledge bases are the problem
 * when they are.
 */
export class CreditError extends Error {
  constructor(readonly reason: ShortfallReason, readonly state: CreditState, readonly required?: number) {
    super(shortfallMessage(reason, state, required))
    this.name = 'CreditError'
  }
}

export function shortfallMessage(reason: ShortfallReason, state: CreditState, required?: number): string {
  if (reason === 'databases') {
    return `Dein Konto darf ${state.maxDatabases} Wissensbasen halten, und die sind angelegt. Lösche eine, um Platz zu schaffen.`
  }
  const need = required ? ` Benötigt werden ${required.toLocaleString('de-DE')}.` : ''
  return `Dein Guthaben reicht nicht: ${state.balance.toLocaleString('de-DE')} Credits verfügbar.${need} Lade Guthaben auf, um weiterzumachen.`
}
