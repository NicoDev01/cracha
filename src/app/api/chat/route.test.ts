import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), owned: vi.fn(), spend: vi.fn(), refund: vi.fn(), state: vi.fn(),
  search: vi.fn(), generate: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/database-registry', () => ({ getOwnedDatabase: mocks.owned }))
vi.mock('@/lib/server/cloudflare', () => ({ getWorkerEnv: () => ({ RAG_API: { fetch: mocks.search }, AI: {}, RAG_QUERY_SECRET: 'test' }) }))
vi.mock('@/lib/server/credits', async (original) => ({
  ...await original<typeof import('@/lib/server/credits')>(),
  spendChatCredits: mocks.spend, refundChatCredits: mocks.refund, getCreditState: mocks.state,
}))
vi.mock('@/lib/server/generation', () => ({ DEFAULT_GENERATION_MODEL: 'test', streamGroundedAnswer: mocks.generate }))

import { POST } from './route'

function request(body: unknown = { question: 'Was steht dort?', tenant_id: 'kb' }) {
  return new NextRequest('https://cracha-app.com/api/chat', { method: 'POST', body: JSON.stringify(body) })
}
function retrieval() {
  return Response.json({ context: 'Beleg', sources: [{ id: '1', title: 'Quelle', url: 'https://example.com', score: 1 }] })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ id: 'user' })
  mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user' })
  mocks.spend.mockResolvedValue(true)
  mocks.refund.mockResolvedValue(undefined)
  mocks.state.mockResolvedValue({ balance: 0, reserved: 0, databases: 1, maxDatabases: 25, costs: { page: 1, chatMessage: 5 } })
  mocks.search.mockImplementation(async () => retrieval())
  mocks.generate.mockResolvedValue({ model: 'test', fallback: false, text: (async function* () { yield 'Antwort [1]' })() })
})

describe('chat billing at the HTTP boundary', () => {
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
    expect((await POST(request())).status).toBeGreaterThanOrEqual(500)
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
    const body = await (await POST(request())).json() as { refunded: boolean; reference: string }
    expect(body.refunded).toBe(false)
    expect(body.reference).toBe(mocks.spend.mock.calls[0][1])
  })
  it('still accepts long previous answers and bounds history before retrieval', async () => {
    await (await POST(request({ question: 'Q', tenant_id: 'kb', messages: [{ role: 'assistant', content: 'x'.repeat(5000) }] }))).text()
    const sent = JSON.parse(mocks.search.mock.calls[0][1].body)
    expect(sent.messages[0].content).toHaveLength(2000)
  })
})
