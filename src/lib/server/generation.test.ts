import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GenerationError,
  anchorFor,
  attributeCitations,
  citationAnchors,
  finalUserText,
  formatGeminiContents,
  knowledgeBaseKind,
  streamGroundedAnswer,
  groundListEntries,
  groundListEntry,
  isOpenRouterModel,
  paddedBlockText,
  reciteNumbers,
  trimHistory,
  type ContextBlock,
  type GroundingBlock,
} from './generation'

describe('conversation history budget', () => {
  const turn = (content: string) => ({ role: 'user' as const, content })

  it('keeps a short conversation whole', () => {
    const history = [turn('Wer ist im Team?'), turn('Und die Adresse?')]
    expect(trimHistory(history, 6_000)).toEqual(history)
  })

  it('drops the oldest turns first', () => {
    // The sources are already sized to the model's window before history is
    // added, so the overflow has to come off somewhere — and the newest turn is
    // what a follow-up question refers back to.
    const history = [turn('A'.repeat(4_000)), turn('B'.repeat(4_000)), turn('C'.repeat(1_000))]
    const kept = trimHistory(history, 6_000)

    expect(kept).toHaveLength(2)
    expect(kept[0].content[0]).toBe('B')
    expect(kept[1].content[0]).toBe('C')
  })

  it('never cuts a turn in half', () => {
    const history = [turn('A'.repeat(4_000)), turn('B'.repeat(4_000))]
    for (const message of trimHistory(history, 6_000)) {
      expect(message.content).toHaveLength(4_000)
    }
  })

  it('keeps the preceding turn even when it alone exceeds the budget', () => {
    // Without it, "und die Adresse?" refers to nothing at all.
    const history = [turn('X'.repeat(9_000))]
    expect(trimHistory(history, 6_000)).toHaveLength(1)
  })

  it('handles an empty conversation', () => {
    expect(trimHistory([], 6_000)).toEqual([])
  })
})

const teamPage: GroundingBlock = {
  n: 1,
  paddedText: paddedBlockText(
    '# Unser Team\n\nStephan Müller\nDirk Borchers\nKlaus Becker\nMark Hapke-Reichardt\nBen Mahrenholz\nChristiane Niebuhr-Redder',
  ),
}
const detailPage: GroundingBlock = {
  n: 4,
  paddedText: paddedBlockText('Klaus Becker ist seit 2011 bei Webmen und leitet die Entwicklung.'),
}
const blocks = [teamPage, detailPage]

describe('collection page restriction', () => {
  const overview: ContextBlock = {
    n: 1,
    title: 'Unser Team',
    url: 'https://www.webmen.de/agentur-bremen/team',
    text: 'Stephan Müller\nKlaus Becker\nFabian Holler',
    collection: true,
    authoritative: true,
  }
  const blogPost: ContextBlock = {
    n: 2,
    title: 'Über Webmen',
    url: 'https://www.webmen.de/blog/ueber-webmen',
    text: 'Lena Fellner hat den Beitrag verfasst. Auch Klaus Becker kommt vor.',
  }

  // Exercises the production selection rather than a copy of it, so a change
  // in which blocks may reject an entry cannot pass unnoticed.
  async function ground(line: string, context: ContextBlock[]): Promise<string> {
    async function* source() {
      yield line
    }
    let output = ''
    for await (const delta of groundListEntries(source(), context)) output += delta
    return output
  }

  it('matches collection first, then falls back to allBlocks for entries outside collection', async () => {
    // Match hierarchy: collection first, falls back to allBlocks so valid entries aren't dropped
    const answer = await ground(
      '- Stephan Müller [1]\n- Lena Fellner [2]\n- Fabian Holler [1]',
      [overview, blogPost],
    )
    expect(answer).toBe('- Stephan Müller [1]\n- Lena Fellner [2]\n- Fabian Holler [1]')
  })

  it('keeps collection entries and points their citation at the overview', async () => {
    expect(await ground('- Fabian Holler [8]', [overview, blogPost])).toBe('- Fabian Holler [1]')
    expect(await ground('- Klaus Becker [2]', [overview, blogPost])).toBe('- Klaus Becker [1]')
  })

  it('uses every block when no collection page was identified', async () => {
    expect(await ground('- Lena Fellner [2]', [blogPost])).toBe('- Lena Fellner [2]')
  })

  it('does not reject an ungrounded list and keeps entries without invented citation markers (zero-abort)', async () => {
    const wrongScope: ContextBlock = {
      n: 1,
      title: 'webmen, Autor auf',
      url: 'https://www.webmen.de/blog/author/webmen',
      text: 'Beiträge von webmen: Relaunch, Barrierefreiheit, Konferenzsysteme.',
      collection: true,
      authoritative: true,
    }
    const result = await ground(
      'Die Mitarbeiter sind:\n- Stephan Müller [1]\n- Klaus Becker [1]',
      [wrongScope],
    )
    expect(result).toBe('Die Mitarbeiter sind:\n- Stephan Müller\n- Klaus Becker')
  })

  it('preserves items across sources and keeps blank lines inside a loose list', async () => {
    const answer = await ground(
      '- Stephan Müller [1]\n\n- Lena Fellner [2]\n\n- Fabian Holler [1]',
      [overview, blogPost],
    )
    expect(answer).toBe('- Stephan Müller [1]\n\n- Lena Fellner [2]\n\n- Fabian Holler [1]')
  })

  it('harmonizes and renumbers ordered list items without jumps', async () => {
    const answer = await ground(
      '1. Stephan Müller [1]\n2. Lena Fellner [2]\n4. Fabian Holler [1]',
      [overview, blogPost],
    )
    expect(answer).toBe('1. Stephan Müller [1]\n2. Lena Fellner [2]\n3. Fabian Holler [1]')
  })

  it('preserves counter across bullet sub-items inside an ordered list', async () => {
    const answer = await ground(
      '1. Stephan Müller [1]\n   - Detail zum Entwickler\n2. Lena Fellner [2]',
      [overview, blogPost],
    )
    expect(answer).toBe('1. Stephan Müller [1]\n   - Detail zum Entwickler\n2. Lena Fellner [2]')
  })

  it('correctly renumbers nested ordered lists independently', async () => {
    const answer = await ground(
      '1. Stephan Müller [1]\n   1. Detail A\n   4. Detail B\n2. Lena Fellner [2]',
      [overview, blogPost],
    )
    expect(answer).toBe('1. Stephan Müller [1]\n   1. Detail A\n   2. Detail B\n2. Lena Fellner [2]')
  })

  it('keeps entries from other pages when the overview was cut short', async () => {
    // The missing entries are missing from the context, not from the site.
    // Deleting them would turn a truncated source into a wrong answer.
    const partial: ContextBlock = { ...overview, truncated: true, authoritative: false }
    expect(await ground('- Lena Fellner [2]', [partial, blogPost])).toBe('- Lena Fellner [2]')
  })

  it('keeps entries when the overview was only guessed from retrieval evidence', async () => {
    const guessed: ContextBlock = { ...overview, authoritative: false }
    expect(await ground('- Lena Fellner [2]', [guessed, blogPost])).toBe('- Lena Fellner [2]')
  })
})

describe('verification mode formatting', () => {
  it('formats prompt for verification mode with draft prefix', () => {
    const formatted = formatGeminiContents([], 'Unser Produkt kostet 29 Euro.', 'Preis: 19 Euro.', 'verification')
    expect(formatted[0].parts[0].text).toContain('Zu prüfender Textentwurf:\nUnser Produkt kostet 29 Euro.')
  })
})

describe('list entry grounding', () => {
  it('keeps an entry whose citation already points at a supporting source', () => {
    expect(groundListEntry('- Stephan Müller [1]', blocks)).toBe('- Stephan Müller [1]')
  })

  it('repairs a citation that points at the wrong source', () => {
    // Production showed "Juliane [6]" resolving to Klaus Becker's page.
    expect(groundListEntry('- Christiane Niebuhr-Redder [4]', blocks))
      .toBe('- Christiane Niebuhr-Redder [1]')
  })

  it('drops an entry that no source mentions', () => {
    expect(groundListEntry('- Jessica Breier [3]', blocks)).toBeNull()
    expect(groundListEntry('- Juliane [6]', blocks)).toBeNull()
  })

  it('tolerates honorifics and spelling variants on either side', () => {
    expect(groundListEntry('- Dr. Klaus Becker [1]', blocks)).toBe('- Dr. Klaus Becker [1]')
    // Hyphen and umlaut normalisation must not cause a false deletion.
    expect(groundListEntry('- Mark Hapke Reichardt [1]', blocks)).toBe('- Mark Hapke Reichardt [1]')
    expect(groundListEntry('- Stephan Mueller [1]', blocks)).toBe('- Stephan Mueller [1]')
  })

  it('matches whole words only', () => {
    // "Ben" must not be considered supported by "bei Webmen" or "leitet".
    expect(groundListEntry('- Ben Mahrenholz [1]', [detailPage])).toBeNull()
    expect(groundListEntry('- Ben Mahrenholz [1]', blocks)).toBe('- Ben Mahrenholz [1]')
  })

  it('keeps roles and descriptions attached to a supported entry', () => {
    expect(groundListEntry('- Klaus Becker — Leiter Entwicklung [9]', blocks))
      .toBe('- Klaus Becker — Leiter Entwicklung [1]')
  })

  it('leaves prose, headings and unlisted lines untouched', () => {
    expect(groundListEntry('Das Team besteht aus folgenden Mitgliedern:', blocks))
      .toBe('Das Team besteht aus folgenden Mitgliedern:')
    expect(groundListEntry('## Team', blocks)).toBe('## Team')
    expect(groundListEntry('', blocks)).toBe('')
  })

  it('never deletes anything when no context blocks were supplied', () => {
    expect(groundListEntry('- Irgendwer [1]', [])).toBe('- Irgendwer [1]')
  })

  it('handles numbered lists', () => {
    expect(groundListEntry('1. Dirk Borchers [7]', blocks)).toBe('1. Dirk Borchers [1]')
  })
})


describe('generation stream integrity', () => {
  afterEach(() => vi.useRealTimers())
  const input = (run: ReturnType<typeof vi.fn>, signal?: AbortSignal) => ({
    ai: { run } as unknown as CloudflareEnv['AI'],
    model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    question: 'Was ist belegt?', history: [], context: 'Eine belegte Tatsache.', signal,
  })
  const stream = (...frames: unknown[]) => new ReadableStream<string>({
    start(controller) {
      for (const frame of frames) controller.enqueue(`data: ${typeof frame === 'string' ? frame : JSON.stringify(frame)}\n\n`)
      controller.close()
    },
  })
  const read = async (run: ReturnType<typeof vi.fn>, signal?: AbortSignal) => {
    const result = await streamGroundedAnswer(input(run, signal))
    let text = ''
    for await (const delta of result.text) text += delta
    return text
  }

  it('accepts normal Workers AI completion with gateway and disables content logging', async () => {
    const run = vi.fn().mockResolvedValue(stream({ response: 'Belegt [1].' }, '[DONE]'))
    const result = await streamGroundedAnswer({ ...input(run), gatewayId: 'default' })
    let text = ''
    for await (const delta of result.text) text += delta
    expect(text).toBe('Belegt [1].')
    expect(run.mock.calls[0][2]).toEqual({ gateway: { id: 'default', collectLog: false } })
  })

  it('omits gateway option when no gatewayId is configured', async () => {
    const run = vi.fn().mockResolvedValue(stream({ response: 'Belegt [1].' }, '[DONE]'))
    expect(await read(run)).toBe('Belegt [1].')
    expect(run.mock.calls[0][2]).toBeUndefined()
  })

  it('reports usedModel and fallback accurately', async () => {
    const run = vi.fn().mockResolvedValue(stream({ response: 'Belegt [1].' }, '[DONE]'))
    const result = await streamGroundedAnswer(input(run))
    expect(result.model).toBe('@cf/meta/llama-4-scout-17b-16e-instruct')
    expect(result.usedModel).toBe('@cf/meta/llama-4-scout-17b-16e-instruct')
    expect(result.fallback).toBe(false)
  })

  it('accepts Gemini STOP with text in the final frame', async () => {
    const run = vi.fn().mockResolvedValue(stream({ candidates: [{ content: { parts: [{ text: 'Belegt [1].' }] }, finishReason: 'STOP' }] }))
    expect(await read(run)).toBe('Belegt [1].')
  })

  it.each(['MAX_TOKENS', 'length'])('rejects truncated %s responses after partial text', async (reason) => {
    const ending = reason === 'length' ? { choices: [{ finish_reason: reason }] } : { candidates: [{ finishReason: reason }] }
    const run = vi.fn().mockResolvedValue(stream({ response: 'Ein Anfang.\n' }, ending, '[DONE]'))
    await expect(read(run)).rejects.toMatchObject({ code: 'incomplete' })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it.each(['SAFETY', 'RECITATION', 'MALFORMED_FUNCTION_CALL'])('does not present a %s stop as success', async (finishReason) => {
    const run = vi.fn().mockResolvedValue(stream({ candidates: [{ finishReason }] }))
    await expect(read(run)).rejects.toBeInstanceOf(GenerationError)
  })

  it('rejects EOF without a completion marker', async () => {
    const run = vi.fn().mockResolvedValue(stream({ response: 'Unfertig' }))
    await expect(read(run)).rejects.toMatchObject({ code: 'incomplete' })
  })

  it('never exposes malformed provider JSON as answer text', async () => {
    const run = vi.fn().mockResolvedValue(stream('{secret malformed'))
    await expect(read(run)).rejects.toMatchObject({ code: 'invalid_stream' })
  })

  it('parses SSE frames split across byte chunks', async () => {
    const encoded = new TextEncoder().encode('data: {"response":"Müller [1]."}\r\n\r\ndata: [DONE]\n\n')
    const run = vi.fn().mockResolvedValue(new ReadableStream<Uint8Array>({ start(c) {
      for (const byte of encoded) c.enqueue(new Uint8Array([byte]))
      c.close()
    } }))
    expect(await read(run)).toBe('Müller [1].')
  })

  it('cancels an inactive stream on deadline', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const run = vi.fn().mockResolvedValue(new ReadableStream<string>({ cancel }))
    const result = read(run)
    const assertion = expect(result).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(20_001)
    await assertion
    expect(cancel).toHaveBeenCalled()
  })

  it('bounds startup and cancels a stream arriving too late', async () => {
    vi.useFakeTimers()
    let resolve!: (value: ReadableStream<string>) => void
    const run = vi.fn().mockReturnValue(new Promise<ReadableStream<string>>((r) => { resolve = r }))
    const result = read(run)
    const assertion = expect(result).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(30_001)
    await assertion
    const cancel = vi.fn()
    resolve(new ReadableStream<string>({ cancel }))
    await vi.advanceTimersByTimeAsync(0)
    expect(cancel).toHaveBeenCalled()
  })

  it('aborts without starting a fallback', async () => {
    const abort = new AbortController()
    const cancel = vi.fn()
    const run = vi.fn().mockResolvedValue(new ReadableStream<string>({ cancel }))
    const result = read(run, abort.signal)
    const assertion = expect(result).rejects.toMatchObject({ code: 'aborted' })
    await Promise.resolve()
    abort.abort()
    await assertion
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('cancels a prepared stream even before the caller reads its first delta', async () => {
    const cancel = vi.fn()
    const run = vi.fn().mockResolvedValue(new ReadableStream<string>({
      start(c) { c.enqueue('data: {"response":"Anfang"}\n\n') }, cancel,
    }))
    const result = await streamGroundedAnswer(input(run))
    await result.text.return(undefined)
    expect(cancel).toHaveBeenCalled()
  })

  it('never exposes a provider exception containing request text', async () => {
    const run = vi.fn().mockRejectedValue(new Error('provider failed: private question'))
    await expect(read(run)).rejects.toMatchObject({ code: 'invalid_stream' })
  })

  it('limits the total stream even if keepalives arrive', async () => {
    vi.useFakeTimers()
    let controller!: ReadableStreamDefaultController<string>
    const run = vi.fn().mockResolvedValue(new ReadableStream<string>({ start(c) { controller = c } }))
    const result = read(run)
    const assertion = expect(result).rejects.toMatchObject({ code: 'timeout' })
    for (let index = 0; index < 12; index++) {
      controller.enqueue(': keepalive\n\n')
      await vi.advanceTimersByTimeAsync(10_000)
    }
    await assertion
  })
})

describe('formatGeminiContents', () => {
  it('drops leading model turns so conversation starts with user', () => {
    const history = [
      { role: 'assistant' as const, content: 'Hallo!' },
      { role: 'user' as const, content: 'Wer bist du?' },
      { role: 'assistant' as const, content: 'Ich bin CraCha.' },
    ]
    const contents = formatGeminiContents(history, 'Was kannst du?', 'Kontext')
    expect(contents[0].role).toBe('user')
    expect(contents[0].parts[0].text).toBe('Wer bist du?')
    expect(contents[1].role).toBe('model')
    expect(contents[1].parts[0].text).toBe('Ich bin CraCha.')
    expect(contents[2].role).toBe('user')
    expect(contents[2].parts[0].text).toContain('Was kannst du?')
  })

  it('merges consecutive same-role turns into single alternating turns', () => {
    const history = [
      { role: 'user' as const, content: 'Teil 1' },
      { role: 'user' as const, content: 'Teil 2' },
      { role: 'assistant' as const, content: 'Antwort A' },
      { role: 'assistant' as const, content: 'Antwort B' },
    ]
    const contents = formatGeminiContents(history, 'Neue Frage', 'Kontext')
    expect(contents).toHaveLength(3)
    expect(contents[0].role).toBe('user')
    expect(contents[0].parts[0].text).toBe('Teil 1\n\nTeil 2')
    expect(contents[1].role).toBe('model')
    expect(contents[1].parts[0].text).toBe('Antwort A\n\nAntwort B')
    expect(contents[2].role).toBe('user')
    expect(contents[2].parts[0].text).toContain('Neue Frage')
  })

  it('merges a trailing user turn in history with the current question', () => {
    const history = [
      { role: 'user' as const, content: 'Frage 1' },
      { role: 'assistant' as const, content: 'Antwort 1' },
      { role: 'user' as const, content: 'Zusatz 1' },
    ]
    const contents = formatGeminiContents(history, 'Frage 2', 'Kontext')
    expect(contents).toHaveLength(3)
    expect(contents[0].role).toBe('user')
    expect(contents[1].role).toBe('model')
    expect(contents[2].role).toBe('user')
    expect(contents[2].parts[0].text).toContain('Zusatz 1')
    expect(contents[2].parts[0].text).toContain('Frage:\nFrage 2')
  })
})

describe('BYOK custom API key', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('calls Google AI Studio directly when apiKey is provided', async () => {
    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"BYOK Antwort [1]."}]},"finishReason":"STOP"}]}\n\n'))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(sseBody, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await streamGroundedAnswer({
      ai: {} as unknown as CloudflareEnv['AI'],
      model: 'gemini-2.5-flash',
      question: 'Hallo?',
      history: [],
      context: 'Kontext',
      apiKey: 'test-api-key',
    })

    expect(result.fallback).toBe(false)
    let text = ''
    for await (const delta of result.text) text += delta
    expect(text).toBe('BYOK Antwort [1].')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse')
    expect(init.headers['x-goog-api-key']).toBe('test-api-key')
  })

  it('falls back to standby model if BYOK call fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    const fallbackStream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('data: {"response":"Fallback Antwort [1]."}\n\n')
        controller.enqueue('data: [DONE]\n\n')
        controller.close()
      },
    })
    const run = vi.fn().mockResolvedValue(fallbackStream)

    const result = await streamGroundedAnswer({
      ai: { run } as unknown as CloudflareEnv['AI'],
      model: 'gemini-2.5-flash',
      question: 'Hallo?',
      history: [],
      context: 'Kontext',
      apiKey: 'invalid-api-key',
    })

    expect(result.fallback).toBe(true)
    let text = ''
    for await (const delta of result.text) text += delta
    expect(text).toBe('Fallback Antwort [1].')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('normalizes model names and routes to gemini-3.8-flash', async () => {
    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Gemini 3.8 Antwort [1]."}]},"finishReason":"STOP"}]}\n\n'))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(sseBody, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await streamGroundedAnswer({
      ai: {} as unknown as CloudflareEnv['AI'],
      model: 'gemini 3.8 flash',
      question: 'Neuestes Modell?',
      history: [],
      context: 'Kontext',
      apiKey: 'test-key-38',
    })

    expect(result.fallback).toBe(false)
    let text = ''
    for await (const delta of result.text) text += delta
    expect(text).toBe('Gemini 3.8 Antwort [1].')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse')
    expect(init.headers['x-goog-api-key']).toBe('test-key-38')
  })
})

describe('streaming without holding text back', () => {
  async function collect(deltas: string[], blocks: ContextBlock[]): Promise<string[]> {
    async function* source() { yield* deltas }
    const out: string[] = []
    for await (const piece of groundListEntries(source(), blocks)) out.push(piece)
    return out
  }
  const overview: ContextBlock = { n: 1, title: 'Team', url: 'https://ex.com/team', text: 'Stephan Müller\nKlaus Becker', collection: true, authoritative: true }
  const englishDocs: ContextBlock = { n: 2, title: 'SEO Starter Guide', url: 'https://ex.com/seo', text: 'Use descriptive titles and meta descriptions for every page.' }

  it('passes an answer without a collection page through piece by piece', async () => {
    const pieces = ['Die ', 'Antwort ', 'kommt [2]', '.\n- **Titel', ' beschreibend** [2]\n']
    expect(await collect(pieces, [englishDocs])).toEqual(pieces)
  })

  it('never strips the citation from a bullet written in another language than its source', async () => {
    const text = (await collect(['- Aussagekräftige Seitentitel verwenden [2]\n'], [englishDocs])).join('')
    expect(text).toBe('- Aussagekräftige Seitentitel verwenden [2]\n')
  })

  it('streams prose before its line ends even when a collection page is checked', async () => {
    const out = await collect(['Das Team ', 'besteht aus:', '\n- Klaus ', 'Becker [9]\n'], [overview])
    expect(out.slice(0, 2)).toEqual(['Das Team ', 'besteht aus:'])
    expect(out.join('')).toBe('Das Team besteht aus:\n- Klaus Becker [1]\n')
  })

  it('releases a list entry as soon as its own line is complete', async () => {
    const out = await collect(['1. Stephan Müller [1]\n', '2. Klaus Becker [1]\n'], [overview])
    expect(out).toEqual(['1. Stephan Müller [1]\n', '2. Klaus Becker [1]\n'])
  })

  it('leaves code blocks alone', async () => {
    const code = '```js\n- arr[1]\n```\n'
    expect((await collect([code], [overview])).join('')).toBe(code)
  })
})

describe('prompt layout', () => {
  it('puts the question after the sources', () => {
    const [turn] = formatGeminiContents([], 'Was kostet der Tarif?', '[1] Preise\n19 €')
    const text = turn.parts[0].text
    expect(text.indexOf('Quellenkontext:')).toBeLessThan(text.indexOf('Frage:\nWas kostet der Tarif?'))
  })
})

describe('BYOK request and fallback reasons', () => {
  afterEach(() => vi.unstubAllGlobals())
  const okBody = () => new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Ok [1]."}]},"finishReason":"STOP"}]}\n\n'))
      controller.close()
    },
  })
  const fallbackRun = () => vi.fn().mockResolvedValue(new ReadableStream<string>({
    start(controller) { controller.enqueue('data: {"response":"Ersatz [1]."}\n\ndata: [DONE]\n\n'); controller.close() },
  }))

  it('asks Gemini 3 for low thinking effort and keeps its default temperature', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(okBody(), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await streamGroundedAnswer({ model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' })
    expect(body.generationConfig.temperature).toBeUndefined()
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8_000)
  })

  const googleError = (status: number, providerStatus: string, message: string, reason?: string) =>
    () => new Response(JSON.stringify({ error: { code: status, status: providerStatus, message, details: reason ? [{ reason }] : [] } }), { status })

  it.each([
    [googleError(400, 'INVALID_ARGUMENT', 'API key not valid. Please pass a valid API key.', 'API_KEY_INVALID'), 'byok_rejected'],
    [googleError(403, 'PERMISSION_DENIED', 'Permission denied'), 'byok_rejected'],
    [googleError(404, 'NOT_FOUND', 'models/gemini-x is not found'), 'byok_model'],
    [googleError(400, 'FAILED_PRECONDITION', 'User location is not supported for the API use.'), 'byok_region'],
    [googleError(429, 'RESOURCE_EXHAUSTED', 'Quota exceeded'), 'byok_quota'],
    [googleError(503, 'UNAVAILABLE', 'The model is overloaded. Please try again later.'), 'byok_unavailable'],
  ])('names why the key failed (%#)', async (response, reason) => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => response()))
    const run = fallbackRun()
    const pending = streamGroundedAnswer({ ai: { run } as unknown as CloudflareEnv['AI'], model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    await vi.runAllTimersAsync()
    const result = await pending
    vi.useRealTimers()
    expect(result).toMatchObject({ fallback: true, fallbackReason: reason, usedModel: '@cf/meta/llama-4-scout-17b-16e-instruct' })
  })

  it('tells the reader what Google said', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => googleError(400, 'FAILED_PRECONDITION', 'User location is not supported for the API use.')()))
    const result = await streamGroundedAnswer({ ai: { run: fallbackRun() } as unknown as CloudflareEnv['AI'], model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    expect(result.fallbackDetail).toBe('400 FAILED_PRECONDITION: User location is not supported for the API use.')
  })

  it('does not try other models for a key Google does not know', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => googleError(400, 'INVALID_ARGUMENT', 'API key not valid.', 'API_KEY_INVALID')())
    vi.stubGlobal('fetch', fetchMock)
    await streamGroundedAnswer({ ai: { run: fallbackRun() } as unknown as CloudflareEnv['AI'], model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks the same model again when it was overloaded once', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => googleError(503, 'UNAVAILABLE', 'The model is overloaded.')())
      .mockImplementation(async () => new Response(okBody(), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const run = fallbackRun()
    const result = await streamGroundedAnswer({ ai: { run } as unknown as CloudflareEnv['AI'], model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    expect(result).toMatchObject({ fallback: false, model: 'gemini-3.8-flash', usedModel: 'gemini-3.8-flash' })
    expect(run).not.toHaveBeenCalled()
  })

  it('answers with another Gemini model of the same key before falling back to ours', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => url.includes('gemini-3.8-flash')
      ? googleError(503, 'UNAVAILABLE', 'The model is overloaded.')()
      : new Response(okBody(), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const run = fallbackRun()
    const result = await streamGroundedAnswer({ ai: { run } as unknown as CloudflareEnv['AI'], model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    expect(result).toMatchObject({ fallback: false, model: 'gemini-3.8-flash', usedModel: 'gemini-3.7-flash' })
    expect(fetchMock.mock.calls[2][1].headers['x-goog-api-key']).toBe('k')
    expect(run).not.toHaveBeenCalled()
  })

  it('moves on at once when the chosen model has no quota, and says so', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => url.includes('gemini-3.8-flash')
      ? googleError(429, 'RESOURCE_EXHAUSTED', 'Quota exceeded for metric generate_content_free_tier_requests, limit: 0')()
      : new Response(okBody(), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await streamGroundedAnswer({ ai: { run: fallbackRun() } as unknown as CloudflareEnv['AI'], model: 'gemini-3.8-flash', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    expect(fetchMock.mock.calls.map(([url]) => String(url).match(/models\/([^:]+)/)?.[1])).toEqual(['gemini-3.8-flash', 'gemini-3.7-flash'])
    expect(result).toMatchObject({
      usedModel: 'gemini-3.7-flash',
      substituteReason: 'byok_quota',
      substituteDetail: expect.stringContaining('limit: 0'),
    })
  })

  it('drops the thinking setting for a model that rejects it', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => googleError(400, 'INVALID_ARGUMENT', 'Thinking level is not supported for this model.')())
      .mockImplementation(async () => new Response(okBody(), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await streamGroundedAnswer({ ai: { run: fallbackRun() } as unknown as CloudflareEnv['AI'], model: 'gemini-3.5-flash-lite', question: 'Q', history: [], context: 'K', apiKey: 'k' })
    expect(result.fallback).toBe(false)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).generationConfig.thinkingConfig).toBeUndefined()
  })

  it('does not try a second model when the platform model itself fails', async () => {
    const run = vi.fn().mockRejectedValue(new Error('down'))
    await expect(streamGroundedAnswer({ ai: { run } as unknown as CloudflareEnv['AI'], model: '@cf/meta/llama-4-scout-17b-16e-instruct', question: 'Q', history: [], context: 'K' })).rejects.toBeInstanceOf(GenerationError)
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('citation attribution', () => {
  const blocks: ContextBlock[] = [
    {
      n: 1,
      title: 'PropertyBinding',
      url: 'https://threejs.org/docs/pages/PropertyBinding.html',
      text: 'PropertyBinding\nThis holds a reference to a real property in the scene graph.\n.node : Object3D\n.parsedPath : Object\n.bind() : undefined Create getter / setter pair.\n.unbind() : undefined Unbind getter / setter pair.',
    },
    {
      n: 2,
      title: 'AnimationMixer',
      url: 'https://threejs.org/docs/pages/AnimationMixer.html',
      text: 'AnimationMixer\nThe AnimationMixer is a player for animations on a particular object.\n.time : number The global mixer time.\n.clipAction() Returns an AnimationAction.\n.update() Advances the global mixer time and updates the animation.',
    },
  ]

  async function* from(chunks: string[]) {
    for (const chunk of chunks) yield chunk
  }
  async function collect(chunks: string[], context = blocks): Promise<string> {
    let text = ''
    for await (const piece of attributeCitations(from(chunks), context)) text += piece
    return text
  }

  it('adds the page an uncited bullet names in its code', async () => {
    // The production answer this was written against cited one bullet out of
    // twenty; every other line gave no hint which page it came from.
    const answer = await collect([
      '## PropertyBinding\n### Eigenschaften\n* `.node`: Das Objekt, das die animierte ',
      'Eigenschaft besitzt.\n## AnimationMixer\n* `.update()`: Aktualisiert die Mixer-Zeit.\n',
    ])
    expect(answer).toContain('* `.node`: Das Objekt, das die animierte Eigenschaft besitzt. [1]\n')
    expect(answer).toContain('* `.update()`: Aktualisiert die Mixer-Zeit. [2]\n')
  })

  it('never touches a line that already cites, a heading or a code block', async () => {
    const text = '## PropertyBinding\n* `.bind()`: Erstellt ein Getter-/Setter-Paar. [2]\n```js\nmixer.update()\n```\n'
    expect(await collect([text])).toBe(text)
  })

  it('leaves a line alone when no single source supports it', async () => {
    const line = 'Die Bibliothek eignet sich gut für interaktive Grafiken im Browser.'
    expect(await collect([line])).toBe(line)
  })

  it('attributes a final line without a trailing newline', async () => {
    expect(await collect(['* `.clipAction()` liefert eine AnimationAction'])).toBe('* `.clipAction()` liefert eine AnimationAction [2]')
  })

  it('never cites the page outline for a detail', async () => {
    const outline: ContextBlock = { n: 3, title: 'Seitenübersicht', url: 'https://threejs.org/', text: '- /docs/pages (2 pages): AnimationMixer; PropertyBinding', outline: true }
    expect(await collect(['Der `AnimationMixer` spielt Animationen ab.'], [outline])).toBe('Der `AnimationMixer` spielt Animationen ab.')
  })
})

describe('knowledge base kind', () => {
  it('reads documentation from paths and code', () => {
    expect(knowledgeBaseKind([{ url: 'https://threejs.org/docs/pages/AnimationMixer.html', text: 'x' }])).toBe('documentation')
    expect(knowledgeBaseKind([{ url: 'https://example.com/leistungen', text: 'Wir bieten Webdesign.' }])).toBe('website')
  })

  it('reads wikis, blogs and news as articles, not as developer docs', () => {
    expect(knowledgeBaseKind([
      { url: 'https://de.wikipedia.org/wiki/Bremen', text: 'Bremen ist eine Hansestadt.' },
      { url: 'https://example.com/blog/2025/08/ki-suche', text: 'KI verändert die Suche.' },
    ])).toBe('articles')
    expect(knowledgeBaseKind([{ url: 'https://wiki.example.org/wiki/Setup', text: 'Run `npm i`, then `npm run dev`, set `PORT` and `HOST`.' }])).toBe('documentation')
  })

  it('names the kind next to the question, not in a content check', () => {
    expect(finalUserText('Frage?', 'ctx', 'default', 'website')).toContain('Knowledge base kind: website\nFrage:\nFrage?')
    expect(finalUserText('Entwurf', 'ctx', 'verification', 'website')).not.toContain('Knowledge base kind')
  })
})

describe('checking citations against the cited page', () => {
  // Taken from webmen.de: the team page lists the names, the start page states
  // the figures. The production answer credited the figures to the team page.
  const blocks: ContextBlock[] = [
    {
      n: 1,
      title: 'Full-Service-Digitalagentur in Bremen',
      url: 'https://www.webmen.de/',
      text: 'Webmen ist seit 1996 Ihre Digitalagentur im Herzen Bremens. Wir sind Ihr Partner für Websites und Shops, Softwareentwicklung und Online Marketing.\nUmsatzstarke Online-Shops mit Magento, WooCommerce oder Shopware.\n1996 Gründungsjahr\n33 Persönlichkeiten\n73 ältester Kollege\n18 jüngster Kollege\n2 Mitarbeitende mit Doktortitel',
    },
    {
      n: 2,
      title: 'Unser Team',
      url: 'https://www.webmen.de/agentur-bremen/team',
      text: 'In unserer Digitalagentur haben wir ein dynamisches und kreatives Team.\nChristiane Niebuhr-Redder\nMark Hapke Reichardt\nAnnie',
    },
  ]

  it('moves a marker to the page that states the line\'s numbers', () => {
    expect(reciteNumbers('Das Team von Webmen besteht aus 33 Persönlichkeiten. [2]', blocks))
      .toBe('Das Team von Webmen besteht aus 33 Persönlichkeiten. [1]')
    expect(reciteNumbers('Der älteste Kollege ist 73 Jahre alt und der jüngste 18 Jahre alt.[2]', blocks))
      .toBe('Der älteste Kollege ist 73 Jahre alt und der jüngste 18 Jahre alt.[1]')
  })

  it('keeps a marker whose page holds the numbers, and a list ordinal is no claim', () => {
    const text = 'Seit 1996 in Bremen. [1]\n1. Christiane Niebuhr-Redder [2]'
    expect(reciteNumbers(text, blocks)).toBe(text)
  })

  // webmen.de writes its counters as `<span>4</span>studierte Biologen`, so the
  // index holds "4studierte". The first check missed the 4 there and moved the
  // marker to a page that had a stray 4 somewhere.
  const glued: ContextBlock[] = [
    { n: 1, title: 'Seitenübersicht (20 Seiten)', url: 'https://www.webmen.de/', text: '- /website (4 pages): Webdesign Bremen', outline: true },
    { n: 2, title: 'Unser Team', url: 'https://www.webmen.de/agentur-bremen/team', text: 'Ein dynamisches Team.\nChristiane Niebuhr-Redder\nAnnie' },
    { n: 3, title: 'Full-Service-Digitalagentur', url: 'https://www.webmen.de/', text: '33Persönlichkeiten\n73ältester Kollege\n4studierte Biologen und Biologinnen\nÜber 25 Jahre Erfahrung unterstreichen unsere Expertise im Webdesign.' },
    { n: 4, title: 'Webentwicklung', url: 'https://www.webmen.de/software/webentwicklung-agentur', text: 'In 4 Schritten zur Webanwendung: Konzept, UI und UX, Backend.' },
  ]

  it('reads a number glued to its word as a number', () => {
    expect(reciteNumbers('* 4 studierte Biologen und Biologinnen sind im Team [2]', glued))
      .toBe('* 4 studierte Biologen und Biologinnen sind im Team [3]')
    expect(reciteNumbers('Das Team besteht aus 33 Persönlichkeiten. [2]', glued))
      .toBe('Das Team besteht aus 33 Persönlichkeiten. [3]')
  })

  it('never moves a marker to a page that only shares the number', () => {
    const line = '* 4 Standorte in Norddeutschland [2]'
    expect(reciteNumbers(line, glued)).toBe(line)
  })

  it('moves a fact off the page list onto the page that states it', () => {
    expect(reciteNumbers('* Webdesign-Agentur in Bremen mit über 25 Jahren Erfahrung [1]', glued))
      .toBe('* Webdesign-Agentur in Bremen mit über 25 Jahren Erfahrung [3]')
    const scope = 'Die Website umfasst Bereiche zu Webdesign und Software. [1]'
    expect(reciteNumbers(scope, glued)).toBe(scope)
  })

  it('attributes a short counter line by its number and word', async () => {
    async function* from(chunks: string[]) { for (const chunk of chunks) yield chunk }
    let text = ''
    for await (const piece of attributeCitations(from(['## Team\n* 33 Persönlichkeiten\n* 73 ist das Alter des ältesten Kollegen\n']), glued)) text += piece
    expect(text).toBe('## Team\n* 33 Persönlichkeiten [3]\n* 73 ist das Alter des ältesten Kollegen [3]\n')
  })

  it('keeps a marker when no page holds the number', () => {
    expect(reciteNumbers('Rund 400 Kunden vertrauen Webmen. [2]', blocks)).toBe('Rund 400 Kunden vertrauen Webmen. [2]')
  })

  it('finds the sentence that supports the line, not the start of the page', () => {
    expect(anchorFor('* Umsatzstarke Online-Shops mit Magento, WooCommerce oder Shopware [1]', blocks[0].text))
      .toEqual({ phrase: 'Umsatzstarke Online-Shops mit Magento, WooCommerce oder Shopware.', quote: 'Umsatzstarke Online-Shops mit Magento, WooCommerce oder Shopware.' })
    expect(anchorFor('2. Mark Hapke Reichardt [2]', blocks[1].text)?.phrase).toBe('Mark Hapke Reichardt')
  })

  // The link of 20:13 pointed "33 Persönlichkeiten" at a testimonial quote,
  // prefixed with the markdown ">", and "4 Biologen" at "4studierte" — neither
  // of which Chrome could find on the page (checked in headless Chrome).
  const home = [
    '# Full-Service-Digitalagentur in Bremen',
    '> »Was mich persönlich sehr überzeugt hat, war die Arbeit mit dem Team von Webmen, das immer erreichbar war.«',
    '## Team-Fakten',
    '33Persönlichkeiten',
    '4studierte Biologen und Biologinnen',
    'Wir betreuen rund 400 Unternehmen, Selbstständige, Verbände oder Verwaltungen aus der ganzen Region und darüber hinaus.',
  ].join('\n')

  it('prefers the counter to a quote that merely shares words', () => {
    const anchor = anchorFor('Das Team von Webmen besteht aus 33 Persönlichkeiten. [1]', home, 'Full-Service-Digitalagentur in Bremen')
    expect(anchor).toMatchObject({ phrase: 'Persönlichkeiten', quote: '33Persönlichkeiten', section: 'Team-Fakten' })
  })

  it('starts the phrase after a counter glued to its word', () => {
    expect(anchorFor('4 studierte Biologen und Biologinnen [1]', home)?.phrase).toBe('studierte Biologen und Biologinnen')
  })

  it('never puts markdown into the phrase', () => {
    expect(anchorFor('Die Arbeit mit dem Team hat persönlich überzeugt. [1]', home)?.phrase).toMatch(/^»Was mich persönlich/)
  })

  it('gives a long sentence as a range to highlight whole', () => {
    expect(anchorFor('Webmen betreut rund 400 Unternehmen und Verbände. [1]', home)).toMatchObject({
      start: 'Wir betreuen rund 400',
      end: 'Region und darüber hinaus.',
    })
  })

  it('anchors every marker by line', () => {
    const anchors = citationAnchors('Intro\n1. Christiane Niebuhr-Redder [2]\nGegründet 1996 in Bremen. [1]', blocks)
    expect(anchors['1:2'].phrase).toBe('Christiane Niebuhr-Redder')
    expect(anchors['2:1'].phrase).toBe('Webmen ist seit 1996 Ihre Digitalagentur im Herzen')
  })
})

describe('platform model through OpenRouter', () => {
  afterEach(() => vi.unstubAllGlobals())

  // OpenRouter streams OpenAI chat chunks and keeps the line alive with
  // comments while the model reasons; both have to pass through the reader.
  const sse = (...frames: string[]) => new Response(new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(new TextEncoder().encode(frame))
      controller.close()
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  const answer = (text: string) => sse(
    ': OPENROUTER PROCESSING\n\n',
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: '' }, finish_reason: 'stop' }] })}\n\n`,
    'data: [DONE]\n\n',
  )
  const input = (run = vi.fn()) => ({
    ai: { run } as unknown as CloudflareEnv['AI'],
    model: 'deepseek/deepseek-v4.1-flash',
    question: 'Wer ist im Team?',
    history: [{ role: 'user' as const, content: 'Hallo' }],
    context: '[1] Team\nAnna',
    openRouterKey: 'or-test',
  })
  const collect = async (result: Awaited<ReturnType<typeof streamGroundedAnswer>>) => {
    let text = ''
    for await (const delta of result.text) text += delta
    return text
  }

  it('recognises OpenRouter ids and leaves Workers AI ids alone', () => {
    expect(isOpenRouterModel('deepseek/deepseek-v4.1-flash')).toBe(true)
    expect(isOpenRouterModel('openai/gpt-6-luna')).toBe(true)
    expect(isOpenRouterModel('@cf/meta/llama-4-scout-17b-16e-instruct')).toBe(false)
  })

  it('asks DeepSeek on the allowed hosts only, with low reasoning hidden from the stream', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer('Anna [1]'))
    vi.stubGlobal('fetch', fetchMock)
    const result = await streamGroundedAnswer(input())
    expect(await collect(result)).toBe('Anna [1]')
    expect(result).toMatchObject({ usedModel: 'deepseek/deepseek-v4.1-flash', fallback: false })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer or-test')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      model: 'deepseek/deepseek-v4.1-flash',
      stream: true,
      reasoning: { effort: 'low', exclude: true },
      provider: { data_collection: 'deny', order: ['deepinfra', 'fireworks', 'together'], allow_fallbacks: false },
    })
    expect(body.messages[0].role).toBe('system')
    expect(body.messages.at(-1).content).toContain('Frage:\nWer ist im Team?')
  })

  it('turns reasoning off when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer('Anna [1]'))
    vi.stubGlobal('fetch', fetchMock)
    await collect(await streamGroundedAnswer({ ...input(), reasoning: 'none' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).reasoning).toEqual({ enabled: false })
  })

  it('answers with GPT-6 Luna when DeepSeek fails, and says so', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 503, message: 'No endpoints available' } }), { status: 503 }))
      .mockResolvedValueOnce(answer('Anna [1]'))
    vi.stubGlobal('fetch', fetchMock)
    const result = await streamGroundedAnswer(input())
    expect(await collect(result)).toBe('Anna [1]')
    expect(result).toMatchObject({ model: 'deepseek/deepseek-v4.1-flash', usedModel: 'openai/gpt-6-luna', fallback: true, fallbackReason: 'primary_unavailable' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).provider.order).toEqual(['azure', 'openai'])
  })

  it('falls back to Workers AI when OpenRouter cannot answer at all', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"message":"Invalid key"}}', { status: 401 })))
    const run = vi.fn().mockResolvedValue(new ReadableStream<string>({
      start(controller) {
        controller.enqueue('data: {"response":"Anna [1]"}\n\n')
        controller.enqueue('data: [DONE]\n\n')
        controller.close()
      },
    }))
    const result = await streamGroundedAnswer(input(run))
    expect(await collect(result)).toBe('Anna [1]')
    expect(result.usedModel).toBe('@cf/meta/llama-4-scout-17b-16e-instruct')
    expect(run.mock.calls[0][0]).toBe('@cf/meta/llama-4-scout-17b-16e-instruct')
  })

  it('never calls OpenRouter without a key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('credits required'))
      .mockResolvedValueOnce(new ReadableStream<string>({
        start(controller) {
          controller.enqueue('data: {"response":"Anna [1]"}\n\n')
          controller.enqueue('data: [DONE]\n\n')
          controller.close()
        },
      }))
    const result = await streamGroundedAnswer({ ...input(run), openRouterKey: undefined })
    expect(await collect(result)).toBe('Anna [1]')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.usedModel).toBe('@cf/meta/llama-4-scout-17b-16e-instruct')
  })

  it('answers a failing reader key with the OpenRouter platform model', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes('openrouter')
      ? answer('Anna [1]')
      : new Response('{"error":{"status":"PERMISSION_DENIED","message":"API key not valid"}}', { status: 403 })))
    vi.stubGlobal('fetch', fetchMock)
    const result = await streamGroundedAnswer({ ...input(), model: 'gemini-3.8-flash', apiKey: 'bad', platformModel: 'deepseek/deepseek-v4.1-flash' })
    expect(await collect(result)).toBe('Anna [1]')
    expect(result).toMatchObject({ usedModel: 'deepseek/deepseek-v4.1-flash', fallback: true, fallbackReason: 'byok_rejected' })
  })
})
