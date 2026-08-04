import 'server-only'

import { getWorkerEnv } from './cloudflare'
import { databaseRegistry, getOwnedDatabase, saveDatabase, type DatabaseRecord } from './database-registry'

export interface CrawlInput {
  url: string
  tenant_id: string
  type?: 'single' | 'recursive' | 'sitemap'
  max_depth?: number
  limit?: number
  include_patterns?: string[]
  exclude_patterns?: string[]
  respect_robots_txt?: boolean
}

export async function enqueueCrawl(input: CrawlInput, userId: string) {
  let database = await getOwnedDatabase(input.tenant_id, userId)
  if (!database) {
    const kv = databaseRegistry()
    const existing = await kv.get<Partial<DatabaseRecord>>(input.tenant_id, 'json')
    if (existing) throw new Error('Wissensbasis nicht gefunden oder Zugriff verweigert.')
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(input.tenant_id)) {
      throw new Error('Die ID darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten.')
    }
    const sourceUrl = new URL(input.url)
    if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('Ungültige Crawl-URL.')
    const now = new Date().toISOString()
    database = {
      id: input.tenant_id,
      name: input.tenant_id,
      description: '',
      user_id: userId,
      source_url: sourceUrl.toString(),
      url: sourceUrl.toString(),
      created_at: now,
      updated_at: now,
      last_crawl: null,
      document_count: 0,
      chunks_count: 0,
      pages_count: 0,
      status: 'pending',
    }
    const indexKey = `user_index:${userId}`
    const index = await kv.get<{ databases?: string[] }>(indexKey, 'json')
    await Promise.all([
      saveDatabase(database),
      kv.put(indexKey, JSON.stringify({ databases: [...new Set([...(index?.databases ?? []), database.id])] })),
    ])
  }

  const env = getWorkerEnv()
  if (!env.MODAL_CRAWLER_URL || !env.CRAWLER_API_SECRET) {
    throw new Error('Crawler-Service ist nicht konfiguriert.')
  }

  await saveDatabase({
    ...database,
    status: 'crawling',
    updated_at: new Date().toISOString(),
    last_error: undefined,
  })

  const response = await fetch(`${env.MODAL_CRAWLER_URL.replace(/\/$/, '')}/crawl`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CRAWLER_API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      url: database.source_url,
      user_id: userId,
      type: input.type ?? 'recursive',
      max_depth: input.max_depth ?? 2,
      limit: input.limit ?? 100,
      respect_robots_txt: input.respect_robots_txt !== false,
    }),
  })

  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean
    job_id?: string
    status?: string
    detail?: string
  }
  if (!response.ok || !result.success || !result.job_id) {
    await saveDatabase({
      ...database,
      status: 'failed',
      updated_at: new Date().toISOString(),
      last_error: 'Crawler-Auftrag konnte nicht gestartet werden.',
    })
    throw new Error(result.detail ?? `Crawler-Service antwortete mit ${response.status}.`)
  }

  await env.DATABASE_REGISTRY.put(
    `crawl_job:${result.job_id}`,
    JSON.stringify({ user_id: userId, database_id: database.id }),
    { expirationTtl: 86_400 },
  )
  return result
}
