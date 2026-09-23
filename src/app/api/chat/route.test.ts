import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), owned: vi.fn(), spend: vi.fn(), refund: vi.fn(), state: vi.fn(),
  search: vi.fn(), generate: vi.fn(), admit: vi.fn(), unsettled: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/database-registry', () => ({ getOwnedDatabase: mocks.owned }))
vi.mock('@/lib/server/cloudflare', () => ({ getWorkerEnv: () => ({ RAG_API: { fetch: mocks.search }, AI: {}, RAG_QUERY_SECRET: 'test' }) }))
vi.mock('@/lib/server/credits', async (original) => ({
  ...await original<typeof import('@/lib/server/credits')>(),
  admitRequest: mocks.admit, hasUnsettledCrawl: mocks.unsettled,
  spendChatCredits: mocks.spend, refundChatCredits: mocks.refund, getCreditState: mocks.state,
}))
vi.mock('@/lib/server/generation', () => ({ DEFAULT_GENERATION_MODEL: 'test', DEFAULT_BYOK_MODEL: 'gemini-3.8-flash', streamGroundedAnswer: mocks.generate }))

import { POST } from './route'
import { DuplicateRequestError } from '@/lib/server/credits'

function request(body: unknown = { question: 'Was steht dort?', tenant_id: 'kb' }) {
  return new NextRequest('https://cracha-app.com/api/chat', { method: 'POST', body: JSON.stringify(body) })
}
function retrieval() {
  return Response.json({ context: 'Beleg', sources: [{ id: '1', title: 'Quelle', url: 'https://example.com', score: 1 }] })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.admit.mockResolvedValue(true)
  mocks.unsettled.mockResolvedValue(false)
  mocks.auth.mockResolvedValue({ id: 'user' })
  mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user', status: 'active' })
  mocks.spend.mockResolvedValue(true)
  mocks.refund.mockResolvedValue(undefined)
  mocks.state.mockResolvedValue({ balance: 0, reserved: 0, databases: 1, maxDatabases: 25, costs: { page: 1, chatMessage: 5 } })
  mocks.search.mockImplementation(async () => retrieval())
  mocks.generate.mockResolvedValue({ model: 'test', fallback: false, text: (async function* () { yield 'Antwort [1]' })() })
})

describe('chat billing at the HTTP boundary', () => {
  it('rejects duplicate request identities before a second model run', async () => {
    mocks.spend.mockRejectedValue(new DuplicateRequestError())
    expect((await POST(request({ question: 'Q', tenant_id: 'kb', request_id: '00000000-0000-4000-8000-000000000001' }))).status).toBe(409)
    expect(mocks.search).not.toHaveBeenCalled()
  })
  it('blocks an active-looking database whose crawl was not settled', async () => {
    mocks.unsettled.mockResolvedValue(true)
    expect((await POST(request())).status).toBe(409)
    expect(mocks.spend).not.toHaveBeenCalled()
  })
  it('rejects a database with 0 indexed pages before billing', async () => {
    mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user', status: 'active', pages_count: 0, document_count: 0 })
    expect((await POST(request())).status).toBe(400)
    expect(mocks.spend).not.toHaveBeenCalled()
  })
  it('enforces request limits before charging', async () => {
    mocks.admit.mockResolvedValue(false)
    expect((await POST(request())).status).toBe(429)
    expect(mocks.spend).not.toHaveBeenCalled()
  })
  it('does not make generated text free by cancelling just before completion', async () => {
    const abort = new AbortController()
    const incoming = new NextRequest('https://cracha-app.com/api/chat', { method: 'POST', signal: abort.signal, body: JSON.stringify({ question: 'Q', tenant_id: 'kb' }) })
    mocks.generate.mockResolvedValue({ model: 'test', text: (async function* () { yield 'delivered text'; abort.abort(); throw new Error('aborted') })() })
    const result = await (await POST(incoming)).text()
    expect(result).toContain('gestoppt und berechnet')
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it.each([
    { question: 42, tenant_id: 'kb' },
    { question: 'Q', tenant_id: 'kb', messages: [null] },
    { question: 'Q', tenant_id: 'kb', top_k: 99 },
  ])('rejects malformed input before charging', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(mocks.spend).not.toHaveBeenCalled()
  })
  it('rejects foreign databases before charging', async () => {
    mocks.owned.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(404)
    expect(mocks.spend).not.toHaveBeenCalled()
  })
  it('rejects non-active databases before charging', async () => {
    mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user', status: 'failed' })
    expect((await POST(request())).status).toBe(403)
    expect(mocks.spend).not.toHaveBeenCalled()
  })
  it('does not search or refund when the balance is insufficient', async () => {
    mocks.spend.mockResolvedValue(false)
    expect((await POST(request())).status).toBe(402)
    expect(mocks.search).not.toHaveBeenCalled()
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it.each(['network', 'http', 'json', 'sources'])('refunds a %s retrieval failure against the exact debit', async (failure) => {
    if (failure === 'network') mocks.search.mockRejectedValue(new Error('offline'))
    if (failure === 'http') mocks.search.mockResolvedValue(Response.json({ error: 'down' }, { status: 503 }))
    if (failure === 'json') mocks.search.mockResolvedValue(new Response('not json'))
    if (failure === 'sources') mocks.search.mockResolvedValue(Response.json({ context: 'text', sources: [null] }))
    // Retrieval runs inside the stream now, so a failure is an error event.
    const text = await (await POST(request())).text()
    expect(text).toContain('event: error')
    expect(text).toContain('"refunded":true')
    expect(mocks.refund).toHaveBeenCalledExactlyOnceWith('user', mocks.spend.mock.calls[0][1])
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('refunds absent evidence without running a model', async () => {
    mocks.search.mockResolvedValue(Response.json({ sources: [] }))
    const text = await (await POST(request())).text()
    expect(text).toContain('"refunded":true')
    expect(mocks.refund).toHaveBeenCalledOnce()
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it.each(['start', 'stream', 'empty'])('refunds generation failure: %s', async (failure) => {
    if (failure === 'start') mocks.generate.mockRejectedValue(new Error('down'))
    else mocks.generate.mockResolvedValue({ model: 'test', text: (async function* () {
      if (failure === 'stream') { yield 'partial'; throw new Error('stream failed') }
    })() })
    const text = await (await POST(request())).text()
    expect(text).toContain('event: error')
    expect(text).not.toContain('event: done')
    expect(mocks.refund).toHaveBeenCalledOnce()
  })
  it('keeps a successful answer charged', async () => {
    const text = await (await POST(request())).text()
    expect(text).toContain('Antwort [1]')
    expect(text).toContain('event: done')
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it('reports an unsuccessful refund honestly', async () => {
    mocks.search.mockRejectedValue(new Error('offline'))
    mocks.refund.mockRejectedValue(new Error('db unavailable'))
    const text = await (await POST(request())).text()
    expect(text).toContain('"refunded":false')
    expect(text).toContain(`"reference":"${mocks.spend.mock.calls[0][1]}"`)
    expect(text).not.toContain('Credits wurden erstattet')
  })
  it('still accepts long previous answers and bounds history before retrieval', async () => {
    await (await POST(request({ question: 'Q', tenant_id: 'kb', messages: [{ role: 'assistant', content: 'x'.repeat(5000) }] }))).text()
    const sent = JSON.parse(mocks.search.mock.calls[0][1].body)
    expect(sent.messages[0].content).toHaveLength(2000)
  })
  it('names the model in the stream, not in headers sent before it ran', async () => {
    mocks.generate.mockResolvedValue({ model: 'gemini-3.8-flash', usedModel: 'gemini-3.8-flash', fallback: false, text: (async function* () { yield 'OK' })() })
    const text = await (await POST(request({ question: 'Q', tenant_id: 'kb' }))).text()
    expect(text).toContain('"usedModel":"gemini-3.8-flash"')
    expect(text).toContain('"fallback":false')
  })
  it('forwards search progress before the answer', async () => {
    const lines = [
      { type: 'progress', stage: 'found', pages: 4, passages: 9, search_query: 'seo kosten', internal: 'x' },
      { type: 'progress', stage: 'selected', sources: 3, pages: 7 },
      { type: 'result', context: 'Beleg', sources: [{ id: '1', title: 'Quelle', url: 'https://example.com', score: 1 }] },
    ].map((line) => JSON.stringify(line)).join('\n')
    mocks.search.mockResolvedValue(new Response(lines, { headers: { 'Content-Type': 'application/x-ndjson' } }))
    const text = await (await POST(request())).text()
    expect(mocks.search.mock.calls[0][1].headers.Accept).toBe('application/x-ndjson')
    expect(text.indexOf('event: progress')).toBeLessThan(text.indexOf('event: meta'))
    expect(text).toContain('"pages":4')
    expect(text).not.toContain('internal')
    expect(text).toContain('Antwort [1]')
  })
  it('refunds when the search service reports an error line', async () => {
    mocks.search.mockResolvedValue(new Response(JSON.stringify({ type: 'error', status: 409, error: 'Die Wissensbasis wird noch indexiert.' }), { headers: { 'Content-Type': 'application/x-ndjson' } }))
    const text = await (await POST(request())).text()
    expect(text).toContain('noch indexiert')
    expect(mocks.refund).toHaveBeenCalledOnce()
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('passes verification mode to generation stream', async () => {
    await (await POST(request({ question: 'Entwurf prüfen', tenant_id: 'kb', mode: 'verification' }))).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ mode: 'verification' }))
  })
  it('rejects question longer than 4000 characters before billing or retrieval', async () => {
    const longQuestion = 'a'.repeat(4001)
    const res = await POST(request({ question: longQuestion, tenant_id: 'kb' }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toContain('4.000 Zeichen')
    expect(mocks.spend).not.toHaveBeenCalled()
    expect(mocks.search).not.toHaveBeenCalled()
  })
  it('accepts question of exactly 4000 characters', async () => {
    const exactQuestion = 'a'.repeat(4000)
    const res = await POST(request({ question: exactQuestion, tenant_id: 'kb' }))
    expect(res.status).toBe(200)
    expect(mocks.spend).toHaveBeenCalled()
  })
  it('trims question before measuring 4000 limit', async () => {
    const padded = '  ' + 'a'.repeat(4000) + '  '
    const res = await POST(request({ question: padded, tenant_id: 'kb' }))
    expect(res.status).toBe(200)

    const tooLongPadded = '  ' + 'a'.repeat(4001) + '  '
    const resFail = await POST(request({ question: tooLongPadded, tenant_id: 'kb' }))
    expect(resFail.status).toBe(400)
  })
  it('ignores client model parameter when no BYOK key is provided', async () => {
    await (await POST(request({ question: 'Q', tenant_id: 'kb', model: 'expensive-unauthorized-model' }))).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'test' }))
  })
  it('ignores client x-byok-model header when no BYOK key is provided', async () => {
    const req = new NextRequest('https://cracha-app.com/api/chat', {
      method: 'POST',
      headers: { 'x-byok-model': 'attacker-chosen-model' },
      body: JSON.stringify({ question: 'Q', tenant_id: 'kb' }),
    })
    await (await POST(req)).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'test' }))
  })
  it('uses client model when a valid BYOK key is provided', async () => {
    await (await POST(request({ question: 'Q', tenant_id: 'kb', api_key: 'AIzaSyTestUserKey', model: 'gemini-2.5-pro' }))).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-pro',
      apiKey: 'AIzaSyTestUserKey',
    }))
  })
})

describe('BYOK transport', () => {
  it('ignores a key sent as a header, which logs would keep', async () => {
    const req = new NextRequest('https://cracha-app.com/api/chat', {
      method: 'POST',
      headers: { 'x-byok-gemini-key': 'AIzaSyHeaderKey' },
      body: JSON.stringify({ question: 'Q', tenant_id: 'kb' }),
    })
    await (await POST(req)).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ apiKey: undefined, model: 'test' }))
  })
  it('uses the default Gemini model when a key comes without one', async () => {
    await (await POST(request({ question: 'Q', tenant_id: 'kb', api_key: 'AIzaSyTestUserKey' }))).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.8-flash' }))
  })
  it('does not check a content check against collection pages', async () => {
    mocks.search.mockImplementation(async () => Response.json({ context: 'Beleg', blocks: [{ n: 1, title: 'T', url: 'https://ex.com', text: 'x', collection: true }], sources: [{ id: '1', title: 'Quelle', url: 'https://example.com', score: 1 }] }))
    await (await POST(request({ question: 'Entwurf', tenant_id: 'kb', mode: 'verification' }))).text()
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ blocks: [], mode: 'verification' }))
  })
})
