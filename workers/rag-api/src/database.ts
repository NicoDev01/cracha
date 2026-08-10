import { HttpError } from './http'
import type { DatabaseRecord, Env } from './types'

/** Mirrors the frontend registry: one key per membership, no shared array. */
export function ownerKey(userId: string, databaseId: string): string {
  return `owner:${userId}:${databaseId}`
}

export async function databaseForUser(
  env: Env,
  databaseId: string,
  userId: string,
): Promise<DatabaseRecord> {
  const database = await env.DATABASE_REGISTRY.get<DatabaseRecord>(databaseId, 'json')
  if (!database) throw new HttpError(404, 'Wissensbasis nicht gefunden.')
  if (!database.user_id) {
    // Written before ownership lived on the record. Proven from this user's own
    // membership key, or from the array it is being migrated out of.
    const owned = await env.DATABASE_REGISTRY.get(ownerKey(userId, databaseId))
    if (owned === null) {
      const index = await env.DATABASE_REGISTRY.get<{ databases?: string[] }>(`user_index:${userId}`, 'json')
      if (!(index?.databases ?? []).includes(databaseId)) {
        throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
      }
    }
    database.user_id = userId
    await Promise.all([
      saveDatabase(env, database),
      env.DATABASE_REGISTRY.put(ownerKey(userId, databaseId), '1'),
    ])
  }
  if (database.user_id !== userId) throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
  return database
}

export async function databaseForIngest(
  env: Env,
  databaseId: string,
  userId: string,
): Promise<DatabaseRecord> {
  return databaseForUser(env, databaseId, userId)
}

export async function saveDatabase(env: Env, database: DatabaseRecord): Promise<void> {
  await env.DATABASE_REGISTRY.put(database.id, JSON.stringify(database))
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
  await Promise.all([
    env.DATABASE_REGISTRY.delete(ownerKey(userId, databaseId)),
    index
      ? env.DATABASE_REGISTRY.put(
        legacyKey,
        JSON.stringify({ databases: (index.databases ?? []).filter((id) => id !== databaseId) }),
      )
      : Promise.resolve(),
  ])
}
