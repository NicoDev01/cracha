import { HttpError } from './http'
import type { DatabaseRecord, Env } from './types'

export async function databaseForUser(
  env: Env,
  databaseId: string,
  userId: string,
): Promise<DatabaseRecord> {
  const database = await env.DATABASE_REGISTRY.get<DatabaseRecord>(databaseId, 'json')
  if (!database) throw new HttpError(404, 'Wissensbasis nicht gefunden.')
  if (!database.user_id) {
    const index = await env.DATABASE_REGISTRY.get<{ databases?: string[] }>(`user_index:${userId}`, 'json')
    if (!(index?.databases ?? []).includes(databaseId)) {
      throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
    }
    database.user_id = userId
    await saveDatabase(env, database)
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

export async function removeFromUserIndex(
  env: Env,
  userId: string,
  databaseId: string,
): Promise<void> {
  const key = `user_index:${userId}`
  const index = await env.DATABASE_REGISTRY.get<{ databases?: string[] }>(key, 'json')
  const databases = (index?.databases ?? []).filter((id) => id !== databaseId)
  await env.DATABASE_REGISTRY.put(key, JSON.stringify({ databases }))
}
