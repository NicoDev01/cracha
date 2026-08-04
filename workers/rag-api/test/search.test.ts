import { describe, expect, it } from 'vitest'

import { assertText, HttpError } from '../src/http'
import { deleteInstanceIfExists, deleteStaleItems, instanceIdFor, itemKeyFor, retrieve } from '../src/search'

describe('deterministic identifiers', () => {
  it('creates a valid, stable AI Search instance id', async () => {
    const first = await instanceIdFor('Laravel Dokumentation')
    expect(first).toBe(await instanceIdFor('Laravel Dokumentation'))
    expect(first).toMatch(/^kb-[a-f0-9]{28}$/)
    expect(first.length).toBeLessThanOrEqual(32)
  })

  it('creates stable item keys per URL', async () => {
    expect(await itemKeyFor('https://example.com/docs')).toBe(
      await itemKeyFor('https://example.com/docs'),
    )
  })
})

describe('input validation', () => {
  it('rejects empty text', () => {
    expect(() => assertText('  ', 'question', 100)).toThrow(HttpError)
  })
})

describe('retrieval mapping', () => {
  it('uses conversational rewrite and keeps at most two chunks per source', async () => {
    let searchRequest: AiSearchSearchRequest | undefined
    const instance = {
      search: async (request: AiSearchSearchRequest) => {
        searchRequest = request
        return ({
        search_query: 'Laravel',
        chunks: [
          {
            id: 'c1',
            type: 'text',
            score: 0.9,
            text: 'Laravel is a PHP framework.',
            item: { key: 'a.md', metadata: { url: 'https://example.com/a', title: 'A' } },
          },
          {
            id: 'c2',
            type: 'text',
            score: 0.8,
            text: 'Laravel provides queues.',
            item: { key: 'a.md', metadata: { url: 'https://example.com/a', title: 'A' } },
          },
          {
            id: 'c3',
            type: 'text',
            score: 0.7,
            text: 'A third duplicate chunk.',
            item: { key: 'a.md', metadata: { url: 'https://example.com/a', title: 'A' } },
          },
        ],
      })
      },
    }

    const result = await retrieve(instance, 'Wie deploye ich es?', 6, [
      { role: 'user', content: 'Was ist Laravel?' },
      { role: 'assistant', content: 'Ein PHP-Framework.' },
    ])
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].url).toBe('https://example.com/a')
    expect(result.context).toContain('Laravel is a PHP framework.')
    expect(result.context).toContain('Laravel provides queues.')
    expect(result.context).not.toContain('third duplicate')
    expect(searchRequest).toMatchObject({
      messages: expect.arrayContaining([{ role: 'user', content: 'Wie deploye ich es?' }]),
      ai_search_options: { query_rewrite: { enabled: true } },
    })
    expect(result.searchQuery).toBe('Laravel')
  })
})

describe('stale item cleanup', () => {
  it('collects all pages before deleting so pagination is stable', async () => {
    const deleted: string[] = []
    const instance: { items: Pick<AiSearchInstance['items'], 'list' | 'delete'> } = {
      items: {
        list: async ({ page }: { page?: number }) => ({
          result: page === 1
            ? [{ id: 'old-1', key: 'old-1.md', status: 'completed' as const }, { id: 'keep', key: 'keep.md', status: 'completed' as const }]
            : [{ id: 'old-2', key: 'old-2.md', status: 'completed' as const }],
          result_info: { count: page === 1 ? 2 : 1, page: page ?? 1, per_page: 50, total_count: 51 },
        }),
        delete: async (id: string) => { deleted.push(id) },
      },
    }

    expect(await deleteStaleItems(instance, new Set(['keep.md']))).toBe(2)
    expect(deleted).toEqual(['old-1', 'old-2'])
  })
})

describe('instance cleanup', () => {
  it('deletes an existing AI Search instance', async () => {
    const deleted: string[] = []
    const namespace: Pick<AiSearchNamespace, 'list' | 'delete'> = {
      list: async () => ({
        result: [{ id: 'kb-existing' } as AiSearchInstanceInfo],
        result_info: { count: 1, page: 1, per_page: 50, total_count: 1 },
      }),
      delete: async (id: string) => { deleted.push(id) },
    }

    expect(await deleteInstanceIfExists(namespace, 'kb-existing')).toBe(true)
    expect(deleted).toEqual(['kb-existing'])
  })

  it('allows deleting legacy databases without an AI Search instance', async () => {
    const deleted: string[] = []
    const namespace: Pick<AiSearchNamespace, 'list' | 'delete'> = {
      list: async () => ({
        result: [],
        result_info: { count: 0, page: 1, per_page: 50, total_count: 0 },
      }),
      delete: async (id: string) => { deleted.push(id) },
    }

    expect(await deleteInstanceIfExists(namespace, 'kb-legacy')).toBe(false)
    expect(deleted).toEqual([])
  })
})
