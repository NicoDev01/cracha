import type { ConversationMessage, DatabaseRecord, Env, RetrievalResponse } from './types'

/**
 * Long enough that a knowledge base nobody recrawls still answers repeat
 * questions instantly, short enough that entries of superseded index versions
 * do not accumulate. Correctness never depends on it: the version is part of
 * the key, so a recrawl retires every entry the moment it completes.
 */
const CACHE_TTL_SECONDS = 86_400

export type CachedRetrieval = Omit<RetrievalResponse, 'usage'>

/**
 * What the answer was retrieved against. `last_crawl` moves on every completed
 * crawl and `updated_at` on every other change to the record, so a knowledge
 * base that gained pages can never serve the results it had before them.
 */
function indexVersion(database: DatabaseRecord): string {
  return database.last_crawl ?? database.updated_at ?? 'initial'
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

/**
 * Every input `retrieve` reads goes into the key. History matters as much as the
 * question: AI Search rewrites a follow-up against the preceding turns, so the
 * same words after a different conversation are a different query.
 */
export async function retrievalCacheKey(
  database: DatabaseRecord,
  question: string,
  topK: number,
  messages: ConversationMessage[],
): Promise<string> {
  const shape = JSON.stringify([
    question.trim(),
    topK,
    messages.map((message) => [message.role, message.content]),
  ])
  return `qcache:${database.id}:${await digest(`${indexVersion(database)}|${shape}`)}`
}

export async function readRetrievalCache(env: Env, key: string): Promise<CachedRetrieval | null> {
  try {
    const cached = await env.DATABASE_REGISTRY.get<CachedRetrieval>(key, 'json')
    // A cached miss would keep a knowledge base that was still indexing looking
    // empty for a day, so only results with sources are trusted on the way out.
    return cached && cached.sources?.length ? cached : null
  } catch (error) {
    console.log(JSON.stringify({
      event: 'retrieval_cache_read_failed',
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return null
  }
}

export async function writeRetrievalCache(
  env: Env,
  key: string,
  value: CachedRetrieval,
): Promise<void> {
  if (!value.sources.length) return
  try {
    await env.DATABASE_REGISTRY.put(key, JSON.stringify(value), {
      expirationTtl: CACHE_TTL_SECONDS,
    })
  } catch (error) {
    // A search that cannot be cached is still a search that answered.
    console.log(JSON.stringify({
      event: 'retrieval_cache_write_failed',
      error: error instanceof Error ? error.message : 'unknown',
    }))
  }
}
