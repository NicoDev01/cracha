import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_CRAWL_SETTINGS,
  databaseRegistry,
  getOwnedDatabase,
  listOwnedDatabaseIds,
  type DatabaseRecord,
} from './database-registry'

export type PlanName = 'free' | 'pro'

export interface PlanLimits {
  databases: number
  /** Pages crawled in total, over the lifetime of the account. */
  pages: number
  /** null means no ceiling. */
  chatMessages: number | null
}

/**
 * The tariff, in one place. Anyone can sign up now, so an account without a
 * ceiling is an account that can spend the crawler and the model budget of
 * everybody else.
 */
export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: { databases: 5, pages: 100, chatMessages: 50 },
  pro: { databases: 100, pages: 1_000, chatMessages: null },
}

/**
 * A running crawl writes to its record on every batch it ingests. One that has
 * been silent for this long is not running any more — it died somewhere the
 * failure callback could not reach — and it must stop holding page budget that
 * the account can never get back otherwise.
 */
const STALE_CRAWL_MS = 24 * 60 * 60 * 1_000

/**
 * What a knowledge base costs its owner. Pages are charged for good: deleting a
 * base does not hand the budget back, because the expensive part already
 * happened when the pages were fetched and indexed.
 *
 * `pages_charged` is a high-water mark, so a re-crawl that finds fewer pages
 * than last time does not refund the difference. While a crawl is running the
 * base has no result yet, so the number of pages it was allowed to fetch counts
 * instead — without that, five crawls started in the same minute would each see
 * the full budget as free.
 */
export function chargedPages(database: DatabaseRecord, now = Date.now()): number {
  const settled = database.pages_charged ?? database.pages_count ?? 0
  const updatedAt = Date.parse(database.updated_at)
  const running = database.status === 'crawling'
    && Number.isFinite(updatedAt)
    && now - updatedAt < STALE_CRAWL_MS
  const reserved = running
    ? database.crawl_settings?.limit ?? DEFAULT_CRAWL_SETTINGS.limit
    : 0
  return Math.max(settled, reserved)
}

function spentKey(userId: string, databaseId: string): string {
  return `spent:${userId}:${databaseId}`
}

/**
 * A deleted knowledge base leaves the number of pages it cost behind, so the
 * total keeps counting. The amount lives in the key's metadata rather than its
 * value, because a prefix listing returns metadata but not values — reading the
 * whole history is one request instead of one per deleted base.
 */
export async function recordDeletedPages(userId: string, database: DatabaseRecord): Promise<void> {
  const pages = chargedPages(database)
  if (pages <= 0) return
  await databaseRegistry().put(spentKey(userId, database.id), '', { metadata: { pages } })
}

async function deletedPages(userId: string): Promise<number> {
  const kv = databaseRegistry()
  const prefix = spentKey(userId, '')
  let total = 0
  let cursor: string | undefined
  do {
    const page = await kv.list<{ pages?: number }>({ prefix, cursor })
    for (const key of page.keys) total += key.metadata?.pages ?? 0
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return total
}

export interface Usage {
  plan: PlanName
  limits: PlanLimits
  databases: number
  pages: number
  chatMessages: number
}

/**
 * Read as the signed-in user, so row level security answers with their row and
 * no other. An account that has never chatted has no row at all, which is the
 * free plan with nothing used.
 */
async function planState(userId: string): Promise<{ plan: PlanName; chatMessages: number }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_plans')
    .select('plan, current_period_end, chat_messages_used')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return { plan: 'free', chatMessages: 0 }

  // An expired period counts as free even if the webhook that should have said
  // so never arrived. The paid plan has to prove itself, not the other way round.
  const paidUntil = data.current_period_end ? Date.parse(data.current_period_end) : null
  const pro = data.plan === 'pro' && (paidUntil === null || paidUntil > Date.now())
  return { plan: pro ? 'pro' : 'free', chatMessages: data.chat_messages_used ?? 0 }
}

export async function getUsage(userId: string): Promise<Usage> {
  const [state, ids, spent] = await Promise.all([
    planState(userId),
    listOwnedDatabaseIds(userId),
    deletedPages(userId),
  ])
  const records = await Promise.all(ids.map((id) => getOwnedDatabase(id, userId)))
  const live = records.filter((record): record is DatabaseRecord => Boolean(record))
  const now = Date.now()

  return {
    plan: state.plan,
    limits: PLAN_LIMITS[state.plan],
    databases: live.length,
    pages: live.reduce((sum, record) => sum + chargedPages(record, now), 0) + spent,
    chatMessages: state.chatMessages,
  }
}

/**
 * How many pages this account may still fetch. A re-crawl passes the base it is
 * about to rebuild: what that base already cost is not spent a second time, so
 * rebuilding a 40-page site never fails just because 40 pages are on the meter.
 */
export function remainingPages(usage: Usage, rebuilding?: DatabaseRecord | null): number {
  const ownShare = rebuilding ? chargedPages(rebuilding) : 0
  return Math.max(0, usage.limits.pages - usage.pages + ownShare)
}

export function canCreateDatabase(usage: Usage): boolean {
  return usage.databases < usage.limits.databases
}

/**
 * Decides and charges in one round trip. The database does the comparison and
 * the increment in a single statement, so two messages sent at the same instant
 * cannot both find the last one free — which is exactly what a counter read and
 * written from here would allow.
 *
 * The free allowance is passed in because the tariff belongs in this file; the
 * database decides only whether the account is currently paying.
 */
export async function consumeChatMessage(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('consume_chat_message', {
    p_free_limit: PLAN_LIMITS.free.chatMessages ?? 0,
  })
  if (error) throw new Error(`Kontingent konnte nicht geprüft werden: ${error.message}`)
  return (data as { allowed?: boolean } | null)?.allowed === true
}

export type QuotaReason = 'databases' | 'pages' | 'chat'

/**
 * Carries the reason as data rather than as prose, so a route can answer 402
 * with something the interface can act on — offering the upgrade for a free
 * account, and saying plainly that the paid ceiling is reached for a paying one.
 */
export class QuotaError extends Error {
  constructor(readonly reason: QuotaReason, readonly usage: Usage) {
    super(quotaMessage(reason, usage))
    this.name = 'QuotaError'
  }
}

export function quotaMessage(reason: QuotaReason, usage: Usage): string {
  const upgrade = usage.plan === 'free'
    ? ' Mit CraCha Pro steht dir deutlich mehr zur Verfügung.'
    : ''
  switch (reason) {
    case 'databases':
      return `Dein Tarif erlaubt ${usage.limits.databases} Wissensbasen, und die sind angelegt. Lösche eine, um Platz zu schaffen.${upgrade}`
    case 'pages':
      return `Dein Seitenkontingent von ${usage.limits.pages} Seiten ist aufgebraucht (${usage.pages} verwendet). Gelöschte Wissensbasen geben es nicht wieder frei, weil das Einlesen bereits stattgefunden hat.${upgrade}`
    case 'chat':
      return `Deine ${usage.limits.chatMessages} kostenlosen Chat-Nachrichten sind aufgebraucht.${upgrade}`
  }
}
