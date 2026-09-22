import { HttpError } from './http'
import type { DatabaseRecord, Env } from './types'
import { forwardOperation } from './coordinator'

/** Mirrors the frontend registry: one key per membership, no shared array. */
export function ownerKey(userId: string, databaseId: string): string {
  return `owner:${userId}:${databaseId}`
}

export async function databaseForUser(
  env: Env,
  databaseId: string,
  userId: string,
): Promise<DatabaseRecord> {
  const response = await forwardOperation(env, databaseId, new Request(`https://coordinator/coordinator/${encodeURIComponent(databaseId)}/owned`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.QUERY_SECRET}` }, body: JSON.stringify({ user_id: userId }),
  }))
  if (!response.ok) throw new HttpError(response.status, 'Wissensbasis nicht verfügbar.')
  return ((await response.json()) as { database: DatabaseRecord }).database
}

export async function databaseForIngest(
  env: Env,
  databaseId: string,
  userId: string,
): Promise<DatabaseRecord> {
  return databaseForUser(env, databaseId, userId)
}

export async function saveDatabase(env: Env, database: DatabaseRecord, options?: { expectedJobId?: string; expectedGeneration?: number }): Promise<void> {
  const response = await forwardOperation(env, database.id, new Request(`https://coordinator/coordinator/${encodeURIComponent(database.id)}/save`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.QUERY_SECRET}` }, body: JSON.stringify({ database, options }),
  }))
  if (!response.ok) throw new HttpError(response.status, 'Speichern fehlgeschlagen.')
}

/**
 * Both forms are cleared, because an account that has not been listed since the
 * migration still carries its knowledge bases in the old array — and a deleted
 * base that reappears in the selector is worse than one that never left.
 */
export async function removeOwnership(
  env: Env,
  userId: string,
  databaseId: string,
): Promise<void> {
  const legacyKey = `user_index:${userId}`
  const index = await env.DATABASE_REGISTRY.get<{ databases?: string[] }>(legacyKey, 'json')
  const results = await Promise.allSettled([
    env.DATABASE_REGISTRY.delete(ownerKey(userId, databaseId)),
    index
      ? env.DATABASE_REGISTRY.put(
        legacyKey,
        JSON.stringify({ databases: (index.databases ?? []).filter((id) => id !== databaseId) }),
      )
      : Promise.resolve(),
  ])
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (rejected) throw rejected.reason
}
