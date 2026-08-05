import { describe, expect, it } from 'vitest'

import { assertText, HttpError } from '../src/http'
import {
  ancestorCandidates,
  appendWithoutOverlap,
  classifyQuestion,
  deleteInstanceIfExists,
  deleteStaleItems,
  instanceIdFor,
  isExhaustiveQuestion,
  itemKeyFor,
  retrieve,
} from '../src/search'

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
  it('keeps diverse chunks per source and drops near-duplicates', async () => {
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
            text: 'Laravel is a PHP framework.',
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
    // Two distinct chunks per source, but the repeated one is dropped.
    expect(result.blocks).toHaveLength(2)
    expect(searchRequest).toMatchObject({
      messages: expect.arrayContaining([{ role: 'user', content: 'Wie deploye ich es?' }]),
      ai_search_options: { query_rewrite: { enabled: true } },
    })
    expect(result.searchQuery).toBe('Laravel')
  })

  it('rewrites the very first question too', async () => {
    let searchRequest: AiSearchSearchRequest | undefined
    const instance = {
      search: async (request: AiSearchSearchRequest) => {
        searchRequest = request
        return { search_query: 'x', chunks: [] }
      },
    }
    await retrieve(instance, 'wer ist im team von weben?', 6)
    expect(searchRequest?.ai_search_options?.query_rewrite?.enabled).toBe(true)
  })

  it('fuses vector and hybrid rankings with source relevance for exhaustive questions', async () => {
    const chunk = (id: string, title: string, url: string, text: string, score = 0.5) => ({
      id,
      type: 'text',
      score,
      text,
      item: { key: `${id}.md`, metadata: { title, url } },
    })
    const homepage = chunk('home', 'Webmen Agentur', 'https://www.webmen.de/', 'Webmen bietet digitale Leistungen und nennt Alena Scholz.')
    const team = chunk(
      'team',
      'Unser Team | Webmen',
      'https://www.webmen.de/agentur-bremen/team',
      '# Lernen Sie uns kennen\n\nChristiane Niebuhr-Redder\nMark Hapke Reichardt\nAlena Scholz\nKathleen Marx-Colonius\nDirk Borchers\nVolker Redder',
    )
    const details = [
      chunk('detail-1', 'Kathleen Marx-Colonius | Webmen', 'https://www.webmen.de/agentur-bremen/team/detail/kathleen-marx-colonius', 'Kathleen Marx-Colonius gehört zum Team von Webmen.'),
      chunk('detail-2', 'Nicole Haider | Webmen', 'https://www.webmen.de/agentur-bremen/team/detail/nicole-haider', 'Nicole Haider gehört zum Team von Webmen.'),
      chunk('detail-3', 'Klaus Becker | Webmen', 'https://www.webmen.de/agentur-bremen/team/detail/klaus-becker', 'Klaus Becker gehört zum Team von Webmen.'),
    ]
    const noise = Array.from({ length: 8 }, (_, index) => chunk(
      `noise-${index}`,
      `Leistung ${index}`,
      `https://www.webmen.de/leistung/${index}`,
      `Allgemeine Informationen zur Agentur und Leistung ${index}.`,
    ))
    const requests: AiSearchSearchRequest[] = []
    const instance = {
      search: async (request: AiSearchSearchRequest) => {
        requests.push(request)
        const type = request.ai_search_options?.retrieval?.retrieval_type
        return {
          search_query: 'team webmen mitglieder',
          chunks: type === 'vector'
            ? [homepage, ...details, ...noise.slice(0, 3), team, ...noise.slice(3)]
            : [homepage, ...details, ...noise, team],
        }
      },
    }

    const result = await retrieve(instance, 'wer ist im team von weben? alle mitglieder bitte', 8)
    expect(isExhaustiveQuestion('Bitte nenne alle Mitglieder')).toBe(true)
    expect(requests).toHaveLength(2)
    expect(requests.map((request) => request.ai_search_options?.retrieval?.retrieval_type).sort()).toEqual(['hybrid', 'vector'])
    expect(requests.every((request) => request.ai_search_options?.retrieval?.match_threshold === 0)).toBe(true)
    expect(result.sources[0].url).toBe('https://www.webmen.de/agentur-bremen/team')
    expect(result.context.indexOf('Christiane Niebuhr-Redder')).toBeLessThan(result.context.indexOf('digitale Leistungen'))
  })
})

describe('question intent', () => {
  it('recognises enumerating questions that never say "alle"', () => {
    for (const question of [
      'Wer sind die Teammitglieder von Webmen?',
      'Wer ist alles im Team?',
      'Ich möchte das gesamte team von webmen',
      'Welche Leistungen bietet ihr an?',
      'Nenne mir die Ansprechpartner',
    ]) {
      expect(classifyQuestion(question).list, question).toBe(true)
    }
  })

  it('leaves ordinary questions on the narrow path', () => {
    for (const question of ['Was kostet eine Website?', 'Wie lange dauert ein Projekt?']) {
      expect(classifyQuestion(question).list, question).toBe(false)
    }
  })

  it('separates completeness from list intent', () => {
    expect(classifyQuestion('Wer ist im Team?')).toEqual({ list: true, exhaustive: false })
    expect(classifyQuestion('Nenne alle Mitglieder')).toEqual({ list: true, exhaustive: true })
  })
})

describe('collection page detection', () => {
  it('ranks the shared ancestor of sibling detail pages, most specific first', () => {
    const urls = [
      'https://www.webmen.de/agentur-bremen/team/detail/stephan-mueller',
      'https://www.webmen.de/agentur-bremen/team/detail/klaus-becker',
      'https://www.webmen.de/agentur-bremen/team/detail/ben-mahrenholz',
      'https://www.webmen.de/blog/ueber-webmen',
    ]
    const candidates = ancestorCandidates(urls)
    expect(candidates.map((candidate) => candidate.url)).toEqual([
      'https://www.webmen.de/agentur-bremen/team/detail',
      'https://www.webmen.de/agentur-bremen/team',
      'https://www.webmen.de/agentur-bremen',
    ])
    expect(candidates[1].descendants).toBe(3)
  })

  it('ignores ancestors without enough siblings', () => {
    expect(ancestorCandidates(['https://a.de/x/1', 'https://a.de/x/2'])).toEqual([])
  })

  it('removes the seam between overlapping chunks', () => {
    // Real chunks overlap by ~15% of 800 tokens, so the shared tail is long.
    const shared = Array.from({ length: 6 }, (_, index) => `Mitarbeiterin Nummer ${index + 1}`).join('\n')
    expect(appendWithoutOverlap(`Kopfzeile\n${shared}`, `${shared}\nLetzter Eintrag`))
      .toBe(`Kopfzeile\n${shared}\nLetzter Eintrag`)
    expect(appendWithoutOverlap('', 'Anna')).toBe('Anna')
    // Unrelated chunks stay separated instead of being spliced together.
    expect(appendWithoutOverlap('Erster Absatz', 'Zweiter Absatz')).toBe('Erster Absatz\nZweiter Absatz')
  })
})

describe('enumerating retrieval', () => {
  const TEAM_URL = 'https://www.webmen.de/agentur-bremen/team'
  const names = Array.from({ length: 34 }, (_, index) => `Person Nummer ${index + 1}`)

  const detailChunk = (index: number) => ({
    id: `detail-${index}`,
    type: 'text',
    score: 0.9 - index * 0.001,
    text: `${names[index]} gehört zum Team von Webmen und arbeitet in Bremen.`,
    item: {
      key: `page-detail-${index}.md`,
      metadata: {
        url: `https://www.webmen.de/agentur-bremen/team/detail/person-${index + 1}`,
        title: `${names[index]} | Webmen | Digitalagentur Bremen`,
      },
    },
  })

  // Every detail page outranks the collection page, exactly as in production.
  const chunks = Array.from({ length: 32 }, (_, index) => detailChunk(index))

  function instanceWithTeamPage() {
    const teamKeyPromise = itemKeyFor(TEAM_URL)
    return {
      search: async () => ({ search_query: 'team webmen', chunks }),
      items: {
        list: async ({ search }: { search?: string }) => {
          const teamKey = await teamKeyPromise
          return {
            result: search === teamKey
              ? [{ id: 'team-item', key: teamKey, status: 'completed' as const, metadata: { url: TEAM_URL, title: 'Team | Webmen' } }]
              : [],
            result_info: { count: 1, page: 1, per_page: 5, total_count: 1 },
          }
        },
        get: (itemId: string) => ({
          chunks: async () => ({
            result: itemId === 'team-item'
              ? [
                  { id: 'team-c1', text: `# Unser Team\n\n${names.slice(0, 18).join('\n')}`, start_byte: 0, end_byte: 400 },
                  { id: 'team-c2', text: `${names.slice(16, 34).join('\n')}`, start_byte: 340, end_byte: 800 },
                ]
              : [],
            result_info: { count: 2, total: 2, limit: 60, offset: 0 },
          }),
        }),
      },
    } as unknown as Parameters<typeof retrieve>[0]
  }

  it('delivers every entry of the collection page for a plain "who is in the team" question', async () => {
    const result = await retrieve(instanceWithTeamPage(), 'Wer sind die Teammitglieder von Webmen?', 8)

    expect(result.sources[0].url).toBe(TEAM_URL)
    for (const name of names) {
      expect(result.context, name).toContain(name)
    }
    // The overlapping chunk boundary must not duplicate entries.
    expect(result.context.split('Person Nummer 17').length - 1).toBe(1)
  })

  it('does not probe for a collection page on ordinary questions', async () => {
    const instance = instanceWithTeamPage()
    const result = await retrieve(instance, 'Was kostet eine Website?', 8)
    expect(result.sources[0].url).not.toBe(TEAM_URL)
  })

  it('falls back to ranked chunks when the collection page is not indexed', async () => {
    const instance = {
      search: async () => ({ search_query: 'team webmen', chunks }),
      items: {
        list: async () => ({ result: [], result_info: { count: 0, page: 1, per_page: 5, total_count: 0 } }),
        get: () => ({ chunks: async () => ({ result: [], result_info: { count: 0, total: 0, limit: 60, offset: 0 } }) }),
      },
    } as unknown as Parameters<typeof retrieve>[0]

    const result = await retrieve(instance, 'Wer sind die Teammitglieder von Webmen?', 8)
    // No hub, but the list budget still admits far more than the old eight blocks.
    expect(result.sources.length).toBeGreaterThan(8)
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
