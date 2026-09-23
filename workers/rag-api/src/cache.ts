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
  options: { rerank?: boolean } = {},
): Promise<string> {
  const shape = JSON.stringify([
    question.trim(),
    topK,
    messages.map((message) => [message.role, message.content]),
    // Only a non-default setting joins the key, so switching the option in
    // keeps every entry cached before it valid.
    ...(options.rerank === false ? [{ rerank: false }] : []),
  ])
  return `qcache:${cachePrefix(database.id)}${await digest(`${indexVersion(database)}|${shape}`)}`
}

function cachePrefix(databaseId: string): string {
  return `${databaseId}:`
}

/**
 * Deleting a knowledge base has to take its cached source text with it. The TTL
 * alone would have kept the crawled content of a deleted base readable for
 * another day, which is not what "löschen" means to the person who clicked it.
 */
export async function deleteRetrievalCache(env: Env, databaseId: string): Promise<number> {
  const prefix = `qcache:${cachePrefix(databaseId)}`
  let deleted = 0
  let cursor: string | undefined
  try {
    // Bounded: a knowledge base cannot hold more entries than a day of asking
    // produces, and an unbounded loop here would block the delete response.
    for (let page = 0; page < 20; page += 1) {
      const listed = await env.DATABASE_REGISTRY.list({ prefix, cursor, limit: 1_000 })
      await Promise.all(listed.keys.map((key) => env.DATABASE_REGISTRY.delete(key.name)))
      deleted += listed.keys.length
      if (listed.list_complete) break
      cursor = listed.cursor
      if (!cursor) break
    }
  } catch (error) {
    // The knowledge base itself is already gone; the leftovers expire on their
    // own. Failing the delete over them would be the worse outcome.
    console.log(JSON.stringify({
      event: 'retrieval_cache_purge_failed',
      database_id: databaseId,
      error: error instanceof Error ? error.message : 'unknown',
    }))
  }
  return deleted
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
