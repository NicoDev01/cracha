import { describe, expect, it } from 'vitest'

import {
  deleteRetrievalCache,
  readRetrievalCache,
  retrievalCacheKey,
  writeRetrievalCache,
} from '../src/cache'
import type { CachedRetrieval } from '../src/cache'
import type { DatabaseRecord, Env } from '../src/types'

const database: DatabaseRecord = {
  id: 'webmen-1',
  name: 'Webmen',
  source_url: 'https://www.webmen.de',
  user_id: 'user-1',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-05T00:00:00.000Z',
  last_crawl: '2026-08-05T00:00:00.000Z',
  document_count: 87,
  pages_count: 87,
  chunks_count: 400,
  status: 'active',
}

const result: CachedRetrieval = {
  context: '[1] Unser Team\nURL: https://www.webmen.de/agentur-bremen/team\n...',
  blocks: [{ n: 1, title: 'Unser Team', url: 'https://www.webmen.de/agentur-bremen/team', text: '...' }],
  sources: [{
    id: 'chunk-1',
    title: 'Unser Team',
    url: 'https://www.webmen.de/agentur-bremen/team',
    snippet: '...',
    score: 1,
    chunk_index: 'chunk-1',
  }],
  search_query: 'team webmen',
}

function memoryEnv(): Env & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    AI_SEARCH: {} as Env['AI_SEARCH'],
    INGEST_SECRET: 'i',
    QUERY_SECRET: 'q',
    DATABASE_REGISTRY: {
      get: async (key: string) => {
        const raw = store.get(key)
        return raw ? JSON.parse(raw) : null
      },
      put: async (key: string, value: string) => {
        store.set(key, value)
      },
      delete: async (key: string) => {
        store.delete(key)
      },
      list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
        keys: [...store.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
        list_complete: true,
        cursor: undefined,
      }),
    } as unknown as KVNamespace,
  }
}

describe('retrievalCacheKey', () => {
  it('is stable for the same question against the same index', async () => {
    expect(await retrievalCacheKey(database, 'Wer ist im Team?', 8, []))
      .toBe(await retrievalCacheKey(database, 'Wer ist im Team?', 8, []))
  })

  it('changes when the knowledge base is recrawled', async () => {
    // The whole point: nobody has to purge anything. A finished crawl moves
    // last_crawl, and every entry from before it becomes unreachable.
    const recrawled = { ...database, last_crawl: '2026-08-07T10:00:00.000Z' }
    expect(await retrievalCacheKey(recrawled, 'Wer ist im Team?', 8, []))
      .not.toBe(await retrievalCacheKey(database, 'Wer ist im Team?', 8, []))
  })

  it('separates the same words after a different conversation', async () => {
    // "Und die Adresse?" retrieves against the preceding turns, so history is
    // part of the query, not context around it.
    const withHistory = await retrievalCacheKey(database, 'Und die Adresse?', 8, [
      { role: 'user', content: 'Wer ist im Team?' },
    ])
    expect(withHistory).not.toBe(await retrievalCacheKey(database, 'Und die Adresse?', 8, []))
  })

  it('separates different result counts', async () => {
    expect(await retrievalCacheKey(database, 'Wer ist im Team?', 12, []))
      .not.toBe(await retrievalCacheKey(database, 'Wer ist im Team?', 8, []))
  })

  it('separates results retrieved without reranking, and only those', async () => {
    const plain = await retrievalCacheKey(database, 'Wer ist im Team?', 8, [])
    // Reranking on is the default, so its entries keep the keys they had.
    expect(await retrievalCacheKey(database, 'Wer ist im Team?', 8, [], { rerank: true })).toBe(plain)
    expect(await retrievalCacheKey(database, 'Wer ist im Team?', 8, [], { rerank: false })).not.toBe(plain)
  })

  it('keeps one knowledge base out of another', async () => {
    expect(await retrievalCacheKey({ ...database, id: 'laravel-1' }, 'Wer ist im Team?', 8, []))
      .not.toBe(await retrievalCacheKey(database, 'Wer ist im Team?', 8, []))
  })
})

describe('retrieval cache', () => {
  it('returns what was written', async () => {
    const env = memoryEnv()
    const key = await retrievalCacheKey(database, 'Wer ist im Team?', 8, [])
    await writeRetrievalCache(env, key, result)

    expect(await readRetrievalCache(env, key)).toEqual(result)
  })

  it('never stores an empty result', async () => {
    // A knowledge base that is still indexing returns nothing. Caching that
    // would keep it looking empty long after it finished.
    const env = memoryEnv()
    const key = await retrievalCacheKey(database, 'Wer ist im Team?', 8, [])
    await writeRetrievalCache(env, key, { ...result, sources: [], blocks: [] })

    expect(env.store.size).toBe(0)
    expect(await readRetrievalCache(env, key)).toBeNull()
  })

  it('answers a miss with null rather than throwing', async () => {
    const env = memoryEnv()
    expect(await readRetrievalCache(env, 'qcache:absent')).toBeNull()
  })

  it('is emptied when the knowledge base is deleted', async () => {
    // Without this the crawled source text of a deleted base stayed readable
    // until the TTL ran out — a day after someone pressed delete.
    const env = memoryEnv()
    for (const question of ['Wer ist im Team?', 'Was kostet eine Website?']) {
      await writeRetrievalCache(env, await retrievalCacheKey(database, question, 8, []), result)
    }
    const other = { ...database, id: 'laravel-1' }
    await writeRetrievalCache(env, await retrievalCacheKey(other, 'Wie migriere ich?', 8, []), result)
    env.store.set(database.id, JSON.stringify(database))

    expect(await deleteRetrievalCache(env, database.id)).toBe(2)
    // The record itself and another base's cache are untouched.
    expect([...env.store.keys()].filter((key) => key.startsWith(`qcache:${database.id}:`))).toEqual([])
    expect([...env.store.keys()].some((key) => key.startsWith('qcache:laravel-1:'))).toBe(true)
    expect(env.store.has(database.id)).toBe(true)
  })

  it('does not fail a delete when the purge cannot run', async () => {
    const env = memoryEnv()
    env.DATABASE_REGISTRY = {
      list: async () => {
        throw new Error('KV unavailable')
      },
    } as unknown as KVNamespace

    expect(await deleteRetrievalCache(env, database.id)).toBe(0)
  })

  it('falls through to a real search when KV is unavailable', async () => {
    const env = memoryEnv()
    env.DATABASE_REGISTRY = {
      get: async () => {
        throw new Error('KV unavailable')
      },
      put: async () => {
        throw new Error('KV unavailable')
      },
    } as unknown as KVNamespace

    expect(await readRetrievalCache(env, 'qcache:any')).toBeNull()
    await expect(writeRetrievalCache(env, 'qcache:any', result)).resolves.toBeUndefined()
  })
})
