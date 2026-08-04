import 'server-only'

import { getWorkerEnv } from './cloudflare'

export interface DatabaseRecord {
  id: string
  name: string
  description: string
  user_id: string
  source_url: string
  url: string
  created_at: string
  updated_at: string
  last_crawl: string | null
  document_count: number
  chunks_count: number
  pages_count: number
  status: 'pending' | 'crawling' | 'active' | 'failed'
  ai_search_instance_id?: string
  last_error?: string
}

export function databaseRegistry(): KVNamespace {
  return getWorkerEnv().DATABASE_REGISTRY
}

export async function getOwnedDatabase(id: string, userId: string): Promise<DatabaseRecord | null> {
  const kv = databaseRegistry()
  const raw = await kv.get<Partial<DatabaseRecord>>(id, 'json')
  if (!raw) return null
  if (raw.user_id && raw.user_id !== userId) return null

  if (!raw.user_id) {
    const index = await kv.get<{ databases?: string[] }>(`user_index:${userId}`, 'json')
    if (!(index?.databases ?? []).includes(id)) return null
  }

  const now = new Date().toISOString()
  const sourceUrl = raw.source_url ?? raw.url ?? ''
  const database: DatabaseRecord = {
    id,
    name: raw.name ?? id,
    description: raw.description ?? '',
    user_id: userId,
    source_url: sourceUrl,
    url: sourceUrl,
    created_at: raw.created_at ?? now,
    updated_at: raw.updated_at ?? raw.created_at ?? now,
    last_crawl: raw.last_crawl ?? null,
    document_count: raw.document_count ?? 0,
    chunks_count: raw.chunks_count ?? 0,
    pages_count: raw.pages_count ?? raw.document_count ?? 0,
    status: raw.status === 'active' || raw.status === 'crawling' || raw.status === 'failed'
      ? raw.status
      : 'pending',
    ai_search_instance_id: raw.ai_search_instance_id,
    last_error: raw.last_error,
  }

  if (!raw.user_id) await saveDatabase(database)
  return database
}

export async function saveDatabase(database: DatabaseRecord): Promise<void> {
  await databaseRegistry().put(database.id, JSON.stringify(database))
}
