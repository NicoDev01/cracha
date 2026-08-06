import { describe, expect, it } from 'vitest'

import { assertText, HttpError } from '../src/http'
import {
  ancestorCandidates,
  appendWithoutOverlap,
  classifyQuestion,
  deleteInstanceIfExists,
  deleteStaleItems,
  hubCandidates,
  instanceConfigMatches,
  instanceIdFor,
  isExhaustiveQuestion,
  itemKeyFor,
  needsUpload,
  publishedAtRanking,
  retrieve,
  uploadPages,
} from '../src/search'
import type { IngestPage } from '../src/types'

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
    expect(classifyQuestion('Wer ist im Team?')).toMatchObject({ list: true, exhaustive: false })
    expect(classifyQuestion('Nenne alle Mitglieder')).toMatchObject({ list: true, exhaustive: true })
  })

  it('recognises enumerations in the other languages a site may be written in', () => {
    for (const question of [
      'Which commands does the CLI provide?',
      'List all configuration options',
      'Show me every endpoint',
      'Quels sont les services proposés ?',
      '¿Cuáles son todos los productos?',
      'Quali sono i membri del team?',
      'Geef een overzicht van de partners',
    ]) {
      expect(classifyQuestion(question).list, question).toBe(true)
    }
  })

  it('keeps definition questions off the enumerating path in any language', () => {
    for (const question of [
      'What is dependency injection?',
      'How do I install the package?',
      'Comment configurer le cache ?',
    ]) {
      expect(classifyQuestion(question).list, question).toBe(false)
    }
  })

  it('detects questions whose answer depends on which source is newest', () => {
    expect(classifyQuestion('Was ist der neueste Blogbeitrag?').recency).toBe(true)
    expect(classifyQuestion('What is the latest release?').recency).toBe(true)
    expect(classifyQuestion('Wer ist im Team?').recency).toBe(false)
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

  it('finds the overview of a flat site, where no detail page is its child', () => {
    // Plenty of sites keep every page one level deep. Ancestor analysis alone
    // returns nothing here, and those sites never got a complete list.
    const ranked = [
      'https://hochschule.example/anna-beispiel',
      'https://hochschule.example/bruno-muster',
      'https://hochschule.example/carla-probe',
    ].map((url, index) => ({
      chunk: { id: `c${index}`, text: 'Forscht zu verteilten Systemen.', item: { key: url, metadata: { url } } },
      score: 1 - index / 100,
    })).concat([{
      chunk: {
        id: 'overview',
        text: '# Team\n- Anna Beispiel\n- Bruno Muster\n- Carla Probe\n- Dora Test',
        item: { key: 'team', metadata: { url: 'https://hochschule.example/team' } },
      },
      score: 0.4,
    }]) as unknown as Parameters<typeof hubCandidates>[0]

    const candidates = hubCandidates(ranked, ['team'])
    expect(candidates[0].url).toBe('https://hochschule.example/team')
    expect(candidates[0].namesQuery).toBe(true)
  })

  it('does not treat a shared documentation ancestor as an overview of the question', () => {
    // Every page of a docs site shares an ancestor. Escalating on that alone
    // would turn "What is a queue?" into an enumeration of the docs index.
    const ranked = Array.from({ length: 4 }, (_, index) => ({
      chunk: {
        id: `c${index}`,
        text: 'Queues delay time consuming tasks.',
        item: { key: `k${index}`, metadata: { url: `https://laravel.com/docs/13.x/page-${index}` } },
      },
      score: 1,
    })) as unknown as Parameters<typeof hubCandidates>[0]

    expect(hubCandidates(ranked, ['queue', 'delay']).every((candidate) => !candidate.namesQuery)).toBe(true)
  })
})

describe('recency ranking', () => {
  const chunkWith = (url: string, publishedAt?: string) => ({
    chunk: { id: url, text: '', item: { key: url, metadata: { url, ...(publishedAt ? { published_at: publishedAt } : {}) } } },
  }) as unknown as Parameters<typeof publishedAtRanking>[0][number]

  it('ranks sources relative to each other, newest first', () => {
    const ranking = publishedAtRanking([
      chunkWith('https://a.example/alt', '2019-01-01T00:00:00+00:00'),
      chunkWith('https://a.example/neu', '2026-05-01T00:00:00+00:00'),
      chunkWith('https://a.example/mitte', '2022-09-01T00:00:00+00:00'),
    ])
    expect(ranking.get('https://a.example/neu')).toBe(1)
    expect(ranking.get('https://a.example/alt')).toBe(0)
    expect(ranking.get('https://a.example/mitte')).toBeGreaterThan(0)
    expect(ranking.get('https://a.example/mitte')).toBeLessThan(1)
  })

  it('stays neutral when the pages state no dates', () => {
    // An undated page must not be treated as old; that would rank by an
    // assumption nobody wrote on the page.
    expect(publishedAtRanking([chunkWith('https://a.example/x'), chunkWith('https://a.example/y')]).size).toBe(0)
    expect(publishedAtRanking([chunkWith('https://a.example/x', '2024-01-01T00:00:00+00:00')]).size).toBe(0)
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

  function instanceWithTeamPage(options: { metadataFilter?: boolean } = {}) {
    const teamKeyPromise = itemKeyFor(TEAM_URL)
    const supportsFilter = options.metadataFilter !== false
    const teamItem = async () => ({
      id: 'team-item',
      key: await teamKeyPromise,
      status: 'completed' as const,
      metadata: { url: TEAM_URL, title: 'Team | Webmen' },
    })
    return {
      search: async () => ({ search_query: 'team webmen', chunks }),
      items: {
        list: async ({ metadata_filter: metadataFilter, per_page: perPage, page }: { metadata_filter?: string; per_page?: number; page?: number }) => {
          // The real Items API rejects anything above 50.
          if ((perPage ?? 0) > 50) throw new Error('Too big: expected number to be <=50')
          if (metadataFilter !== undefined) {
            if (!supportsFilter) throw new Error('metadata filter pattern exceeds maximum length')
            const wanted = (JSON.parse(metadataFilter) as { url?: string }).url
            return {
              result: wanted === TEAM_URL ? [await teamItem()] : [],
              result_info: { count: 1, page: 1, per_page: perPage ?? 10, total_count: 1 },
            }
          }
          // Unfiltered scan fallback.
          return {
            result: page === 1 ? [await teamItem()] : [],
            result_info: { count: 1, page: page ?? 1, per_page: perPage ?? 50, total_count: 1 },
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

  it('falls back to a bounded key scan when metadata filtering is rejected', async () => {
    // Production hit exactly this: the Items API refused the filter and the
    // swallowed error was indistinguishable from "no collection page exists".
    const result = await retrieve(
      instanceWithTeamPage({ metadataFilter: false }),
      'Wer sind die Teammitglieder von Webmen?',
      8,
    )
    expect(result.sources[0].url).toBe(TEAM_URL)
    expect(result.context).toContain(names[33])
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

  it('marks a collection page that did not fit as partial', async () => {
    // Silently cutting the overview produced a confidently incomplete list,
    // because the prompt forbids hedging about completeness.
    const instance = {
      search: async () => ({ search_query: 'team webmen', chunks }),
      items: {
        list: async ({ per_page: perPage, page }: { per_page?: number; page?: number }) => ({
          result: page === 1 ? [{ id: 'team-item', key: await itemKeyFor(TEAM_URL), status: 'completed', metadata: { url: TEAM_URL, title: 'Team' } }] : [],
          result_info: { count: 1, page: page ?? 1, per_page: perPage ?? 50, total_count: 1 },
        }),
        get: () => ({
          chunks: async () => ({
            result: [
              { id: 'a', text: 'A'.repeat(30_000), start_byte: 0, end_byte: 30_000 },
              { id: 'b', text: 'B'.repeat(30_000), start_byte: 29_000, end_byte: 59_000 },
            ],
            result_info: { count: 2, total: 2, limit: 120, offset: 0 },
          }),
        }),
      },
    } as unknown as Parameters<typeof retrieve>[0]

    const result = await retrieve(instance, 'Wer sind die Teammitglieder von Webmen?', 8)
    expect(result.context).toContain('source_type: collection_page_partial')
    expect(result.blocks[0].truncated).toBe(true)
    // A partial page cannot define the full set, so nothing may be rejected
    // for being absent from it.
    expect(result.blocks[0].authoritative).toBe(false)
  })
})

describe('evidence-based enumeration', () => {
  const OVERVIEW = 'https://hochschule.example/leadership'
  const names = ['Anna Beispiel', 'Bruno Muster', 'Carla Probe', 'Dora Test', 'Emil Sanders']

  function instance(): Parameters<typeof retrieve>[0] {
    const chunks = [
      ...names.slice(0, 3).map((name, index) => ({
        id: `d${index}`,
        type: 'text',
        score: 0.9,
        text: `${name} arbeitet an der Hochschule.`,
        item: { key: `d${index}`, metadata: { url: `https://hochschule.example/person-${index}`, title: name } },
      })),
      {
        id: 'overview',
        type: 'text',
        score: 0.3,
        text: names.join('\n'),
        item: { key: 'overview', metadata: { url: OVERVIEW, title: 'Leadership' } },
      },
    ]
    return {
      search: async () => ({ search_query: 'leadership', chunks }),
      items: {
        list: async ({ per_page: perPage, page }: { per_page?: number; page?: number }) => ({
          result: page === 1 || perPage === 10
            ? [{ id: 'overview-item', key: await itemKeyFor(OVERVIEW), status: 'completed', metadata: { url: OVERVIEW, title: 'Leadership' } }]
            : [],
          result_info: { count: 1, page: page ?? 1, per_page: perPage ?? 50, total_count: 1 },
        }),
        get: () => ({
          chunks: async () => ({
            result: [{ id: 'o1', text: `# Leadership\n${names.join('\n')}`, start_byte: 0, end_byte: 200 }],
            result_info: { count: 1, total: 1, limit: 120, offset: 0 },
          }),
        }),
      },
    } as unknown as Parameters<typeof retrieve>[0]
  }

  it('reads the overview whole even when no word list recognised the question', async () => {
    // No word list covers every language. When a retrieved page is named after
    // what was asked, the results themselves say this is an enumeration.
    const question = 'Tell me about the leadership at this university'
    expect(classifyQuestion(question).list).toBe(false)

    const result = await retrieve(instance(), question, 8)
    expect(result.sources[0].url).toBe(OVERVIEW)
    for (const name of names) expect(result.context, name).toContain(name)
  })

  it('does not let that weaker signal reject entries from other pages', async () => {
    const result = await retrieve(instance(), 'Tell me about the leadership at this university', 8)
    expect(result.blocks[0].collection).toBe(true)
    expect(result.blocks[0].authoritative).toBe(false)
  })
})

describe('instance configuration drift', () => {
  const config = {
    chunk_size: 800,
    index_method: { vector: true, keyword: true },
    custom_metadata: [{ field_name: 'url', data_type: 'text' }],
  }

  it('accepts a live instance that already matches, whatever the key order', () => {
    expect(instanceConfigMatches({
      unrelated: 'ignored',
      index_method: { keyword: true, vector: true },
      chunk_size: 800,
      custom_metadata: [{ data_type: 'text', field_name: 'url' }],
    }, config)).toBe(true)
  })

  it('detects drift in every field the configuration sets', () => {
    expect(instanceConfigMatches({ ...config, chunk_size: 512 }, config)).toBe(false)
    expect(instanceConfigMatches({ ...config, index_method: { vector: true, keyword: false } }, config)).toBe(false)
    expect(instanceConfigMatches({ ...config, custom_metadata: [] }, config)).toBe(false)
    // A missing field is drift, not a match.
    expect(instanceConfigMatches({ chunk_size: 800 }, config)).toBe(false)
    expect(instanceConfigMatches(null, config)).toBe(false)
  })
})

describe('unchanged page upload', () => {
  const page = (overrides: Partial<IngestPage> = {}): IngestPage => ({
    url: 'https://example.com/team',
    title: 'Unser Team',
    markdown: '## Klaus Becker',
    checksum: 'abc',
    crawled_at: '2026-08-06T12:00:00Z',
    depth: 1,
    ...overrides,
  })
  const indexed = { checksum: 'abc', title: 'Unser Team', status: 'completed', chunks: 2 }

  it('skips a page that is already indexed unchanged', () => {
    expect(needsUpload(page(), indexed)).toBe(false)
  })

  it('uploads when the text or the title changed', () => {
    expect(needsUpload(page({ checksum: 'def' }), indexed)).toBe(true)
    // The title is part of the uploaded document, so it is not covered by the
    // page checksum and has to be compared separately.
    expect(needsUpload(page({ title: 'Team' }), indexed)).toBe(true)
  })

  it('always uploads what is missing or was never indexed properly', () => {
    expect(needsUpload(page(), undefined)).toBe(true)
    expect(needsUpload(page(), { ...indexed, chunks: 0 })).toBe(true)
    expect(needsUpload(page(), { ...indexed, status: 'error' })).toBe(true)
    expect(needsUpload(page(), { ...indexed, status: 'running' })).toBe(true)
  })

  it('uploads only the changed pages of a re-crawl', async () => {
    const uploaded: string[] = []
    const unchanged = page()
    const changed = page({ url: 'https://example.com/blog', title: 'Blog', checksum: 'xyz' })
    const instance = {
      items: {
        list: async () => ({
          result: [
            { id: '1', key: await itemKeyFor(unchanged.url), status: 'completed' as const, chunks_count: 2, metadata: { checksum: 'abc', title: 'Unser Team' } },
            { id: '2', key: await itemKeyFor(changed.url), status: 'completed' as const, chunks_count: 3, metadata: { checksum: 'old', title: 'Blog' } },
          ],
          result_info: { count: 2, page: 1, per_page: 50, total_count: 2 },
        }),
        upload: async (key: string) => { uploaded.push(key) },
      },
    } as unknown as Pick<AiSearchInstance, 'items'>

    const keys = await uploadPages(instance, [unchanged, changed])
    expect(keys).toEqual([await itemKeyFor(unchanged.url), await itemKeyFor(changed.url)])
    // Both stay active so the stale-item cleanup keeps them.
    expect(uploaded).toEqual([await itemKeyFor(changed.url)])
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
