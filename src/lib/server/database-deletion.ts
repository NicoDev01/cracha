import 'server-only'

import { getWorkerEnv } from './cloudflare'
import { claimDatabaseDeletion, deallocateDatabaseSlot, deleteCrawlAccess, getActiveDeletionClaim, hasUnsettledCrawl } from './credits'
import { getOwnedDatabase, releaseDatabase, saveDatabase } from './database-registry'

export type DatabaseDeletionResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

const CRAWL_IN_PROGRESS =
  'Die Wissensbasis kann während eines laufenden oder noch nicht abgerechneten Crawls nicht gelöscht werden.'
const NOT_FOUND = 'Wissensbasis nicht gefunden.'
const NOT_COORDINATED = 'Datenbank-Löschung konnte nicht koordiniert werden.'

function failure(status: number, error: string): DatabaseDeletionResult {
  return { ok: false, status, error }
}

/**
 * Deletes one knowledge base of `userId`: the claim in PostgreSQL that keeps a
 * crawl from binding to it, the coordinator and its AI Search instance, then
 * the registry entries and finally the quota slot. Every step is safe to repeat,
 * so a caller that gets an error back can simply call again.
 *
 * `knownOwned` is for ids the caller already proved to belong to the user from
 * PostgreSQL (`user_databases`) rather than from the KV registry. Without it an
 * id missing from KV is only resumed when an unfinished deletion claim exists;
 * with it a claim is taken first, so a half-registered knowledge base does not
 * outlive the account it belonged to.
 */
export async function deleteOwnedDatabase(
  userId: string,
  id: string,
  options: { knownOwned?: boolean } = {},
): Promise<DatabaseDeletionResult> {
  const database = await getOwnedDatabase(id, userId)

  if (!database) {
    // If the database was already released from KV during a prior partial delete,
    // check if there is an in-progress deletion claim for this user in PostgreSQL that can be completed.
    let activeClaim: { database_id: string; user_id: string; claimed_at: string } | null
    try {
      activeClaim = await getActiveDeletionClaim(userId, id)
    } catch (err) {
      console.error(JSON.stringify({ event: 'get_active_deletion_claim_failed', databaseId: id, error: String(err) }))
      return failure(503, NOT_COORDINATED)
    }

    if (!activeClaim) {
      if (!options.knownOwned) return failure(404, NOT_FOUND)
      const claim = await claimDatabaseDeletion(userId, id).catch((err) => {
        console.error(JSON.stringify({ event: 'claim_deletion_failed', databaseId: id, error: String(err) }))
        return null
      })
      if (!claim) return failure(503, NOT_COORDINATED)
      // Completed or never ours: nothing left to delete remotely.
      if (!claim.allowed && claim.reason === 'not_found') return { ok: true }
      if (!claim.allowed) return failure(409, CRAWL_IN_PROGRESS)
    }

    return removeRemotely(userId, id, 'retry')
  }

  if (database.status === 'crawling' || (await hasUnsettledCrawl(userId, id))) {
    return failure(409, CRAWL_IN_PROGRESS)
  }

  // Atomically claim deletion in PostgreSQL to prevent a concurrent crawl from starting
  const claim = await claimDatabaseDeletion(userId, id).catch((err) => {
    console.error(JSON.stringify({ event: 'claim_deletion_failed', databaseId: id, error: String(err) }))
    return null
  })
  if (!claim) return failure(503, NOT_COORDINATED)
  if (!claim.allowed) {
    return claim.reason === 'not_found' ? failure(404, NOT_FOUND) : failure(409, CRAWL_IN_PROGRESS)
  }

  // Mark database status as deleting in KV immediately to reject in-flight ingest/status requests
  await saveDatabase({ ...database, status: 'deleting', updated_at: new Date().toISOString() })

  // Nothing to book. What the crawl cost was charged when it ran and is a row
  // in the ledger; deleting the knowledge base does not undo the fetching and
  // indexing that was paid for.
  return removeRemotely(userId, id, 'initial')
}

async function removeRemotely(userId: string, id: string, attempt: 'initial' | 'retry'): Promise<DatabaseDeletionResult> {
  const env = getWorkerEnv()
  let response: Response
  try {
    response = await env.RAG_API.fetch(
      `https://cracha-rag.internal/databases/${encodeURIComponent(id)}?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${env.RAG_QUERY_SECRET}` },
      },
    )
  } catch (err) {
    const event = attempt === 'retry' ? 'rag_delete_retry_network_failed' : 'rag_delete_network_failed'
    console.error(JSON.stringify({ event, databaseId: id, error: String(err) }))
    return failure(503, 'RAG-Dienst nicht erreichbar.')
  }

  const result = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok && response.status !== 404) {
    return failure(response.status, result.error ?? 'Löschen fehlgeschlagen.')
  }

  try {
    await deleteCrawlAccess(id, userId)
    await releaseDatabase(userId, id)
    await deallocateDatabaseSlot(userId, id)
  } catch (cleanupErr) {
    const event = attempt === 'retry' ? 'database_cleanup_retry_failed' : 'database_cleanup_failed'
    console.error(JSON.stringify({ event, databaseId: id, error: String(cleanupErr) }))
    return failure(500, 'Wissensbasis wurde gelöscht, aber die Bereinigung ist fehlgeschlagen.')
  }
  return { ok: true }
}
