import { describe, expect, it } from 'vitest'

import worker from '../src/index'
import { retrieve, type RetrievalProgress } from '../src/search'
import type { DatabaseRecord, Env } from '../src/types'
import { createTestCoordinatorNamespace } from './coordinator-fixture'

const chunk = (id: string, page: string, text = 'Suchmaschinenoptimierung kostet nichts.') => ({
  id,
  type: 'text',
  score: 0.8,
  text,
  item: { key: `${page}.md`, metadata: { url: `https://example.com/${page}`, title: page } },
})

function instance() {
  return {
    search: async (request: AiSearchSearchRequest) => request.ai_search_options?.retrieval?.retrieval_type === 'hybrid'
      ? { search_query: 'seo kosten', chunks: [chunk('h1', 'a'), chunk('h2', 'b')] }
      : { search_query: 'ist seo kostenlos', chunks: [chunk('v1', 'b'), chunk('v2', 'c')] },
  }
}

describe('retrieval progress', () => {
  it('reports each search path as it lands, counting pages only once', async () => {
    const events: RetrievalProgress[] = []
    await retrieve(instance(), 'Ist SEO kostenlos?', 8, [], { onProgress: (event) => events.push(event) })
    const found = events.filter((event) => event.stage === 'found')
    expect(found).toHaveLength(2)
    expect(found.at(-1)).toMatchObject({ pages: 3, passages: 4 })
    expect(found.some((event) => event.search_query === 'seo kosten')).toBe(true)
    expect(events.at(-1)).toEqual({ stage: 'selected', sources: 3, pages: 3 })
  })
})

describe('/query as progress lines', () => {
  const record: DatabaseRecord = {
    id: 'kb', name: 'kb', source_url: 'https://example.com', user_id: 'anna',
    created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', last_crawl: null,
    document_count: 3, pages_count: 3, chunks_count: 4, status: 'active',
  }
  const store = new Map<string, string>([['kb', JSON.stringify(record)]])
  const env = {
    QUERY_SECRET: 'secret',
    INGEST_SECRET: 'ingest',
    AI_SEARCH: { get: () => instance() },
    DATABASE_REGISTRY: {
      get: async (key: string, type?: string) => {
        const raw = store.get(key)
        return raw === undefined ? null : type === 'json' ? JSON.parse(raw) : raw
      },
      put: async (key: string, value: string) => { store.set(key, value) },
      delete: async (key: string) => { store.delete(key) },
      list: async () => ({ keys: [...store.keys()].map((name) => ({ name })), list_complete: true }),
    },
  } as unknown as Env
  env.COORDINATOR = createTestCoordinatorNamespace(env).namespace

  const query = (accept?: string) => worker.fetch(new Request('https://cracha-rag.internal/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json', ...(accept ? { Accept: accept } : {}) },
    body: JSON.stringify({ tenant_id: 'kb', user_id: 'anna', question: `Ist SEO kostenlos? ${accept ?? 'json'}` }),
  }), env)

  it('streams progress before the result when asked for it', async () => {
    const response = await query('application/x-ndjson')
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')
    const lines = (await response.text()).trim().split('\n').map((line) => JSON.parse(line))
    expect(lines.map((line) => line.type)).toEqual(['progress', 'progress', 'progress', 'result'])
    expect(lines.at(-1)).toMatchObject({ sources: expect.any(Array), usage: { cached: false } })
  })

  it('keeps the single JSON answer for every other caller', async () => {
    const response = await query()
    const body = await response.json() as { sources: unknown[] }
    expect(body.sources).toHaveLength(3)
  })
})
