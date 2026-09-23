import 'server-only'

import { cancelCrawlJob } from './crawler-api'
import { creditsAdmin } from './credits'
import { deleteOwnedDatabase } from './database-deletion'
import { databaseRegistry, getOwnedDatabase, listOwnedDatabaseIds, ownerKey } from './database-registry'

/** A step failed; nothing after it ran, the auth user still exists and a retry resumes. */
export class AccountDeletionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'AccountDeletionError'
  }
}

const NOT_DELETED = 'Dein Konto wurde nicht gelöscht.'
const TRY_AGAIN = `${NOT_DELETED} Bitte versuche es erneut.`

/**
 * Deletes everything that belongs to `userId`, the auth user last.
 *
 * Every step is idempotent and the order is what makes a failure harmless:
 * crawls are stopped before their knowledge bases go, knowledge bases go
 * before the account, and the account — the only thing that lets the user
 * come back and retry — goes only once nothing else is left. Deleting the auth
 * user cascades through every account table in PostgreSQL; payment records
 * stay without an owner (see 20260923120000_account_self_deletion.sql).
 */
export async function deleteAccount(userId: string): Promise<void> {
  await refuseWhilePaymentDisputed(userId)
  await cancelRunningCrawls(userId)
  await deleteAllDatabases(userId)
  await assertNothingLeft(userId)
  await deleteAuthUser(userId)
}

/** For a retry after the account is already gone: nothing left to do. */
export async function accountIsGone(userId: string): Promise<boolean> {
  const { data, error } = await creditsAdmin().auth.admin.getUserById(userId)
  if (error) return error.status === 404 || error.code === 'user_not_found'
  return !data?.user
}

/**
 * An open dispute is a legal claim in progress. Deleting the account would
 * detach the payment from the only record that ties it to the person, so this
 * goes through support instead.
 */
async function refuseWhilePaymentDisputed(userId: string): Promise<void> {
  const { data, error } = await creditsAdmin()
    .from('billing_payments').select('session_id').eq('user_id', userId).eq('disputed', true).limit(1)
  if (error) throw new AccountDeletionError(`Zahlungsstatus konnte nicht geprüft werden. ${TRY_AGAIN}`, 503)
  if (data?.length) {
    throw new AccountDeletionError(
      'Zu einer deiner Zahlungen läuft noch eine Prüfung. Bitte wende dich an den Support, um dein Konto zu löschen.',
      409,
    )
  }
}

/**
 * Every hold is a crawl that may still be running, and a knowledge base marked
 * `crawling` may have one whose hold is already settled. Both are cancelled
 * through the same path as the cancel button; the hold reference is the job id.
 */
async function cancelRunningCrawls(userId: string): Promise<void> {
  const { data: holds, error } = await creditsAdmin()
    .from('credit_holds').select('reference,database_id').eq('user_id', userId)
  if (error) throw new AccountDeletionError(`Laufende Crawls konnten nicht geprüft werden. ${TRY_AGAIN}`, 503)

  const jobs = new Map<string, string | null>()
  for (const hold of holds ?? []) jobs.set(hold.reference as string, (hold.database_id as string | null) ?? null)
  for (const id of await listOwnedDatabaseIds(userId)) {
    const record = await getOwnedDatabase(id, userId)
    if (record?.status === 'crawling' && record.current_job_id && !jobs.has(record.current_job_id)) {
      jobs.set(record.current_job_id, id)
    }
  }

  for (const [jobId, databaseId] of jobs) {
    const result = await cancelCrawlJob(
      { jobId, databaseId, holdReference: jobId },
      { finishedIsFine: true, reason: 'Konto wird gelöscht.' },
    )
    if (!result.ok) {
      console.error(JSON.stringify({ event: 'account_deletion_crawl_cancel_failed', userId, jobId, stage: result.stage }))
      throw new AccountDeletionError(
        `Ein laufender Crawl konnte nicht sicher abgebrochen werden. ${NOT_DELETED} Bitte versuche es in ein paar Minuten erneut.`,
        503,
      )
    }
  }
}

/** KV lists what the user sees; PostgreSQL also knows half-created and half-deleted ones. */
async function ownedDatabaseIds(userId: string): Promise<{ all: string[]; fromSql: Set<string> }> {
  const admin = creditsAdmin()
  const [kvIds, slots, claims] = await Promise.all([
    listOwnedDatabaseIds(userId),
    admin.from('user_databases').select('database_id').eq('user_id', userId),
    admin.from('user_database_deletions').select('database_id').eq('user_id', userId).is('completed_at', null),
  ])
  if (slots.error || claims.error) {
    throw new AccountDeletionError(`Wissensbasen konnten nicht vollständig ermittelt werden. ${TRY_AGAIN}`, 503)
  }
  const fromSql = new Set([...(slots.data ?? []), ...(claims.data ?? [])].map((row) => row.database_id as string))
  return { all: [...new Set([...kvIds, ...fromSql])], fromSql }
}

async function deleteAllDatabases(userId: string): Promise<void> {
  const { all, fromSql } = await ownedDatabaseIds(userId)
  // One at a time: each removes an AI Search instance, and a failure should
  // stop the run before it touches the next one.
  for (const id of all) {
    const knownOwned = fromSql.has(id)
    const result = await deleteOwnedDatabase(userId, id, { knownOwned })
    if (result.ok) continue
    if (result.status === 404 && !knownOwned) {
      // A membership key without a record this user owns. Only the key is
      // ours to remove; the record, if any, is not.
      await databaseRegistry().delete(ownerKey(userId, id))
      continue
    }
    console.error(JSON.stringify({ event: 'account_deletion_database_failed', userId, databaseId: id, status: result.status }))
    throw new AccountDeletionError(
      `Eine Wissensbasis konnte nicht gelöscht werden (${result.error}) ${TRY_AGAIN}`,
      result.status >= 500 ? 503 : 409,
    )
  }
}

/** A crawl or knowledge base created while this ran would otherwise be orphaned. */
async function assertNothingLeft(userId: string): Promise<void> {
  const [{ all }, holds] = await Promise.all([
    ownedDatabaseIds(userId),
    creditsAdmin().from('credit_holds').select('reference').eq('user_id', userId).limit(1),
  ])
  if (holds.error) throw new AccountDeletionError(`Laufende Crawls konnten nicht geprüft werden. ${TRY_AGAIN}`, 503)
  if (all.length || holds.data?.length) {
    throw new AccountDeletionError(
      `Während der Löschung wurde eine Wissensbasis oder ein Crawl gestartet. ${TRY_AGAIN}`,
      409,
    )
  }
}

async function deleteAuthUser(userId: string): Promise<void> {
  const { error } = await creditsAdmin().auth.admin.deleteUser(userId)
  if (!error || error.status === 404 || error.code === 'user_not_found') return
  console.error(JSON.stringify({ event: 'account_deletion_auth_failed', userId, status: error.status, code: error.code }))
  throw new AccountDeletionError(`Dein Konto konnte nicht gelöscht werden. Bitte versuche es erneut.`, 503)
}
