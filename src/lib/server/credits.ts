import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

import { getWorkerEnv } from './cloudflare'
import { listOwnedDatabaseIds, coordinatorCommand } from './database-registry'

import { CREDITS, crawlCost } from '../credit-tariff'
export { CREDITS, CREDIT_PACKAGES, findPackage, crawlCost, affordablePages } from '../credit-tariff'
export type { CreditPackage } from '../credit-tariff'

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
  blocked?: boolean
  /** Spendable now. */
  balance: number
  /** Held for crawls that are still running. */
  reserved: number
  databases: number
  maxDatabases: number
  costs: { page: number; chatMessage: number }
}

export async function getCreditState(userId: string): Promise<CreditState> {
  await reconcileStaleCrawlHolds(userId)
  const ids = await listOwnedDatabaseIds(userId)
  const [state, dbCount] = await Promise.all([
    rpc<{ balance?: number; reserved?: number; blocked?: boolean }>('credit_state', { p_user: userId }),
    syncDatabaseSlots(userId, ids).catch(() => ids.length),
  ])

  return {
    balance: state?.balance ?? 0,
    blocked: state?.blocked === true,
    reserved: state?.reserved ?? 0,
    databases: Math.max(dbCount, ids.length),
    maxDatabases: CREDITS.maxDatabases,
    costs: { page: CREDITS.perPage, chatMessage: CREDITS.perChatMessage },
  }
}

/**
 * Charges for one answer. Decided and booked in a single statement, so two
 * questions sent at the same instant cannot both find the last credit unspent.
 *
 * References identify bookings. A new HTTP request currently receives a new
 * reference; end-to-end request idempotency is a separate outstanding change.
 */
export async function spendChatCredits(userId: string, reference: string): Promise<boolean> {
  const result = await rpc<{ allowed?: boolean; duplicate?: boolean }>('credit_spend', {
    p_user: userId,
    p_amount: CREDITS.perChatMessage,
    p_kind: 'chat',
    p_reference: reference,
    p_detail: null,
  })
  if (result?.duplicate) throw new DuplicateRequestError()
  return result?.allowed === true
}

/** Refund only an existing debit, at most once through the ledger's unique key. */
export async function refundChatCredits(userId: string, reference: string): Promise<void> {
  const { data, error } = await creditsAdmin()
    .from('credit_entries')
    .select('amount')
    .eq('user_id', userId)
    .eq('kind', 'chat')
    .eq('reference', reference)
    .maybeSingle()
  if (error) throw new Error('Chat-Abbuchung konnte nicht geprüft werden.')
  if (!data || !Number.isSafeInteger(data.amount) || data.amount >= 0) return
  await rpc('credit_grant', {
    p_user: userId,
    p_amount: -data.amount,
    p_kind: 'refund',
    p_reference: `chat:${reference}`,
    p_detail: 'Keine vollständige Antwort geliefert',
  })
}

/** Holds the ceiling a crawl is allowed to reach. Settled when it finishes. */
export async function holdCrawlCredits(userId: string, pages: number, jobReference: string): Promise<boolean> {
  const result = await rpc<{ allowed?: boolean; reason?: string }>('credit_hold', {
    p_user: userId,
    p_amount: crawlCost(pages),
    p_reference: jobReference,
  })
  if (result?.reason === 'concurrent') throw new Error('Ein Crawl läuft noch oder wartet auf seine Abrechnung. Bitte versuche es später erneut.')
  if (result?.reason === 'blocked') throw new Error('Bitte kläre die offene Zahlung mit dem Support, bevor du einen neuen Crawl startest.')
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
  if (state.blocked) return 'Dein Guthaben ist wegen einer offenen Zahlungsprüfung gesperrt. Bitte kontaktiere den Support.'
  if (reason === 'databases') {
    return `Dein Konto darf ${state.maxDatabases} Wissensbasen halten, und die sind angelegt. Lösche eine, um Platz zu schaffen.`
  }
  const need = required ? ` Benötigt werden ${required.toLocaleString('de-DE')}.` : ''
  return `Dein Guthaben reicht nicht: ${state.balance.toLocaleString('de-DE')} Credits verfügbar.${need} Lade Guthaben auf, um weiterzumachen.`
}

/** Recover uncertain delivery; age alone must never make delivered work free. */
async function reconcileStaleCrawlHolds(userId: string): Promise<void> {
  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) return
  const { data, error } = await creditsAdmin().from('credit_holds').select('reference,database_id')
    .eq('user_id', userId).not('database_id', 'is', null)
    .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()).limit(1)
  if (error || !data?.length) return
  const hold = data[0]
  try {
    const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/status/${encodeURIComponent(hold.reference)}`, {
      headers: { Authorization: `Bearer ${env.CRAWLER_API_SECRET}` }, signal: AbortSignal.timeout(5000),
    })
    const status = await response.json() as { status?: string; result?: { indexed_pages?: number; pages_count?: number } }
    if (response.status !== 404 && (!response.ok || !['completed', 'failed', 'cancelled'].includes(status.status ?? ''))) return
    if (status.status !== 'completed') {
      await coordinatorCommand(hold.database_id, 'cancel-job', {
        jobId: hold.reference, reason: 'Crawl wurde nicht abgeschlossen. Die Reservierung wird freigegeben.',
      })
    }
    await settleCrawlCredits(hold.reference, status.status === 'completed' ? (status.result?.indexed_pages ?? status.result?.pages_count ?? 0) : 0)
  } catch {
    console.warn(JSON.stringify({ event: 'crawl_reconciliation_pending', reference: hold.reference }))
  }
}

export class DuplicateRequestError extends Error {
  constructor() { super('Diese Anfrage wurde bereits verarbeitet.'); this.name = 'DuplicateRequestError' }
}

export async function admitRequest(userId: string, action: string, limit: number, seconds: number): Promise<boolean> {
  return rpc<boolean>('admit_request', { p_user: userId, p_action: action, p_limit: limit, p_seconds: seconds })
}

export async function bindCrawlHold(reference: string, databaseId: string): Promise<void> {
  await rpc('bind_crawl_hold', { p_reference: reference, p_database: databaseId })
}

export async function hasUnsettledCrawl(userId: string, databaseId: string): Promise<boolean> {
  const [accessRes, holdsRes] = await Promise.all([
    creditsAdmin().from('crawl_access').select('ready,reference').eq('user_id', userId).eq('database_id', databaseId).maybeSingle(),
    creditsAdmin().from('credit_holds').select('reference').eq('user_id', userId).eq('database_id', databaseId).limit(1),
  ])
  if (accessRes.error || holdsRes.error) throw new Error('Crawl-Abrechnung konnte nicht geprüft werden.')
  if (holdsRes.data && holdsRes.data.length > 0) return true
  if (accessRes.data && accessRes.data.ready === false) {
    if (!accessRes.data.reference) return false
    const { data: hold } = await creditsAdmin().from('credit_holds').select('reference').eq('reference', accessRes.data.reference).maybeSingle()
    return Boolean(hold)
  }
  return false
}

export async function deleteCrawlAccess(databaseId: string, userId: string): Promise<void> {
  const { data: holds, error: holdsError } = await creditsAdmin()
    .from('credit_holds')
    .select('reference')
    .eq('user_id', userId)
    .eq('database_id', databaseId)
  if (holdsError) {
    throw new Error(`Ausstehende Holds konnten nicht geprüft werden: ${holdsError.message}`)
  }
  if (holds && holds.length > 0) {
    for (const hold of holds) {
      await releaseCrawlCredits(hold.reference)
    }
  }
  const { error: deleteError } = await creditsAdmin()
    .from('crawl_access')
    .delete()
    .eq('database_id', databaseId)
    .eq('user_id', userId)
  if (deleteError) {
    throw new Error(`Crawl-Zugriff konnte nicht gelöscht werden: ${deleteError.message}`)
  }
}

export async function allocateDatabaseSlot(
  userId: string,
  databaseId: string,
  max = CREDITS.maxDatabases,
  existingIds?: string[],
): Promise<{ allowed: boolean; currentCount: number }> {
  try {
    const result = await rpc<Array<{ allowed?: boolean; current_count?: number }>>('database_allocate', {
      p_user: userId,
      p_database: databaseId,
      p_max: max,
      p_existing_ids: existingIds && existingIds.length > 0 ? existingIds : null,
    })
    const row = Array.isArray(result) ? result[0] : (result as { allowed?: boolean; current_count?: number } | null)
    if (row && typeof row.allowed === 'boolean') {
      return { allowed: row.allowed, currentCount: row.current_count ?? 0 }
    }
  } catch (err) {
    console.error('database_allocate failed', err)
  }
  throw new Error('Datenbankkontingent konnte nicht geprüft werden.')
}

export async function claimDatabaseDeletion(
  userId: string,
  databaseId: string,
): Promise<{ allowed: boolean; reason: string }> {
  try {
    const result = await rpc<Array<{ allowed?: boolean; reason?: string }>>('database_claim_delete', {
      p_user: userId,
      p_database: databaseId,
    })
    const row = Array.isArray(result) ? result[0] : (result as { allowed?: boolean; reason?: string } | null)
    if (row && typeof row.allowed === 'boolean') {
      return { allowed: row.allowed, reason: row.reason ?? '' }
    }
  } catch (err) {
    console.error('database_claim_delete failed', err)
  }
  throw new Error('Datenbank-Löschung konnte nicht koordiniert werden.')
}

export async function getActiveDeletionClaim(
  userId: string,
  databaseId: string,
): Promise<{ database_id: string; user_id: string; claimed_at: string } | null> {
  const { data, error } = await creditsAdmin()
    .from('user_database_deletions')
    .select('database_id, user_id, claimed_at, completed_at')
    .eq('database_id', databaseId)
    .eq('user_id', userId)
    .is('completed_at', null)
    .maybeSingle()
  if (error) {
    console.error('getActiveDeletionClaim failed', error)
    throw new Error('Aktiver Lösch-Claim konnte nicht geprüft werden.')
  }
  return data ?? null
}

export async function deallocateDatabaseSlot(userId: string, databaseId: string): Promise<void> {
  try {
    await rpc('database_deallocate', { p_user: userId, p_database: databaseId })
  } catch (err) {
    console.warn('database_deallocate RPC failed', err)
    throw new Error('Datenbank-Freigabe konnte nicht durchgeführt werden.')
  }
}

export async function syncDatabaseSlots(userId: string, databaseIds: string[]): Promise<number> {
  try {
    const count = await rpc<number>('database_sync_batch', { p_user: userId, p_database_ids: databaseIds })
    if (typeof count === 'number') return count
  } catch {
    // Fall back to local list count
  }
  return databaseIds.length
}
