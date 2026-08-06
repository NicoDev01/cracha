import { describe, expect, it } from 'vitest'

import { itemKeyFor, retrieve } from '../src/search'

/**
 * One knowledge base is not evidence of a general answering machine. Every
 * scenario here is a different shape of source material and a different kind of
 * question, so a change that helps a company website and breaks a
 * documentation site cannot pass.
 *
 * The search backend is a fixture: these tests assert what *our* code decides —
 * which page ends up first, what reaches the context, whether an overview is
 * read whole — not what Cloudflare's retrieval scores.
 */

interface FixtureChunk {
  id: string
  text: string
  url: string
  title: string
  publishedAt?: string
}

interface FixturePage {
  url: string
  title: string
  text: string
}

function instanceOf(chunks: FixtureChunk[], pages: FixturePage[] = []) {
  const searchChunks = chunks.map((chunk, index) => ({
    id: chunk.id,
    type: 'text',
    score: 0.9 - index / 100,
    text: chunk.text,
    item: {
      key: chunk.url,
      metadata: {
        url: chunk.url,
        title: chunk.title,
        ...(chunk.publishedAt ? { published_at: chunk.publishedAt } : {}),
      },
    },
  }))

  const itemsByKey = new Map<string, FixturePage>()
  for (const page of pages) itemsByKey.set(page.url, page)

  return {
    search: async () => ({ search_query: 'fixture', chunks: searchChunks }),
    items: {
      list: async ({ metadata_filter: metadataFilter, per_page: perPage, page }: {
        metadata_filter?: string
        per_page?: number
        page?: number
      }) => {
        const entries = await Promise.all(
          [...itemsByKey.values()].map(async (fixture) => ({
            id: fixture.url,
            key: await itemKeyFor(fixture.url),
            status: 'completed' as const,
            metadata: { url: fixture.url, title: fixture.title },
          })),
        )
        const wanted = metadataFilter
          ? (JSON.parse(metadataFilter) as { url?: string }).url
          : undefined
        const result = wanted
          ? entries.filter((entry) => entry.metadata.url === wanted)
          : page === 1 ? entries : []
        return {
          result,
          result_info: { count: result.length, page: page ?? 1, per_page: perPage ?? 50, total_count: entries.length },
        }
      },
      get: (itemId: string) => ({
        chunks: async () => {
          const fixture = itemsByKey.get(itemId)
          return {
            result: fixture ? [{ id: `${itemId}-1`, text: fixture.text, start_byte: 0, end_byte: fixture.text.length }] : [],
            result_info: { count: fixture ? 1 : 0, total: fixture ? 1 : 0, limit: 120, offset: 0 },
          }
        },
      }),
    },
  } as unknown as Parameters<typeof retrieve>[0]
}

describe('documentation site', () => {
  const chunks: FixtureChunk[] = [
    {
      id: 'queues',
      url: 'https://docs.example/guide/queues',
      title: 'Queues',
      text: 'A queue defers a time consuming task until later. Configure the connection in config/queue.php.',
    },
    {
      id: 'cache',
      url: 'https://docs.example/guide/cache',
      title: 'Cache',
      text: 'The cache stores expensive results. Drivers include redis and file.',
    },
    {
      id: 'index',
      url: 'https://docs.example/guide',
      title: 'Guide',
      text: 'Installation\nQueues\nCache\nRouting\nTesting',
    },
    {
      id: 'cli',
      url: 'https://docs.example/guide/commands',
      title: 'Commands',
      text: '```\nphp artisan queue:work\nphp artisan migrate\n```',
    },
  ]

  it('answers a definition question from the specific page, not the index', async () => {
    // Every docs page shares an ancestor. Treating that as an overview would
    // answer "what is a queue" with a table of contents.
    const result = await retrieve(
      instanceOf(chunks, [{ url: 'https://docs.example/guide', title: 'Guide', text: 'Installation\nQueues\nCache' }]),
      'What is a queue?',
      6,
    )

    expect(result.sources[0].url).toBe('https://docs.example/guide/queues')
    expect(result.blocks.some((block) => block.collection)).toBe(false)
  })

  it('keeps command samples byte for byte, including the fence', async () => {
    const result = await retrieve(instanceOf(chunks), 'Which commands does the CLI provide?', 6)

    expect(result.context).toContain('```\nphp artisan queue:work\nphp artisan migrate\n```')
  })

  it('reads the command overview whole when asked to enumerate', async () => {
    const commands = Array.from({ length: 40 }, (_, index) => `php artisan command:${index + 1}`).join('\n')
    const result = await retrieve(
      instanceOf(chunks, [{ url: 'https://docs.example/guide/commands', title: 'Commands', text: commands }]),
      'List all commands',
      6,
    )

    expect(result.sources[0].url).toBe('https://docs.example/guide/commands')
    // The retrieved chunk held four lines; the whole page holds forty.
    expect(result.context).toContain('php artisan command:40')
  })
})

describe('pricing and comparison tables', () => {
  const table = [
    '| Plan | Preis | Nutzer |',
    '| --- | --- | --- |',
    '| Basis | 19 EUR | 3 |',
    '| Pro | 49 EUR | 25 |',
    '| Enterprise | auf Anfrage | unbegrenzt |',
  ].join('\n')

  it('delivers the whole table when the question asks for the options', async () => {
    const result = await retrieve(
      instanceOf(
        [
          { id: 'pricing', url: 'https://saas.example/preise', title: 'Preise', text: '| Plan | Preis | Nutzer |\n| --- | --- | --- |\n| Basis | 19 EUR | 3 |' },
          { id: 'faq', url: 'https://saas.example/faq', title: 'FAQ', text: 'Kann ich monatlich kündigen? Ja.' },
        ],
        [{ url: 'https://saas.example/preise', title: 'Preise', text: table }],
      ),
      'Welche Preise gibt es?',
      6,
    )

    expect(result.sources[0].url).toBe('https://saas.example/preise')
    // A truncated price table is a wrong answer, not a shorter one.
    expect(result.context).toContain('| Enterprise | auf Anfrage | unbegrenzt |')
  })
})

describe('blog with publication dates', () => {
  const chunks: FixtureChunk[] = [
    {
      id: 'old',
      url: 'https://blog.example/2019/rueckblick',
      title: 'Rückblick 2019',
      text: 'Ein Rückblick auf das Jahr 2019 und unsere Projekte.',
      publishedAt: '2019-12-20T00:00:00+00:00',
    },
    {
      id: 'new',
      url: 'https://blog.example/2026/relaunch',
      title: 'Relaunch 2026',
      text: 'Wir haben unsere Plattform neu gebaut und veröffentlicht.',
      publishedAt: '2026-06-01T00:00:00+00:00',
    },
  ]

  it('puts the newest article first when the question asks for the newest', async () => {
    // The older article is the stronger retrieval hit in this fixture, exactly
    // as when an archive page matches the wording better.
    const result = await retrieve(instanceOf(chunks), 'Was ist der neueste Beitrag?', 6)

    expect(result.sources[0].url).toBe('https://blog.example/2026/relaunch')
  })

  it('leaves the ranking alone when the question is not about recency', async () => {
    const result = await retrieve(instanceOf(chunks), 'Was steht im Rückblick auf 2019?', 6)

    expect(result.sources[0].url).toBe('https://blog.example/2019/rueckblick')
  })
})

describe('sources that do not answer', () => {
  it('returns what was found without inventing a collection page', async () => {
    const result = await retrieve(
      instanceOf([
        { id: 'a', url: 'https://firma.example/impressum', title: 'Impressum', text: 'Angaben gemäß § 5 TMG.' },
      ]),
      'Wie hoch ist der Bitcoin-Kurs?',
      6,
    )

    // Refusing to answer is the generator's job; retrieval must not fabricate
    // an authoritative-looking block out of an unrelated page.
    expect(result.blocks.every((block) => !block.authoritative)).toBe(true)
    expect(result.sources).toHaveLength(1)
  })
})
