import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GenerationError,
  formatGeminiContents,
  streamGroundedAnswer,
  groundListEntries,
  groundListEntry,
  paddedBlockText,
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
