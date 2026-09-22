import { beforeEach, expect, it, vi } from 'vitest'
const fetch = vi.hoisted(() => vi.fn())
vi.mock('./request', () => ({ apiFetch: fetch }))
import { streamChatQuery } from './chat-api'
const handlers = () => ({ onStart: vi.fn(), onDelta: vi.fn(), onDone: vi.fn() })
const request = { tenant_id: 'db', question: 'Frage', request_id: 'request-id' }
beforeEach(() => vi.resetAllMocks())
it('passes cancellation and request identity through', async () => {
  fetch.mockResolvedValue(new Response('event: meta\ndata: {"sources":[],"model":"test"}\n\nevent: delta\ndata: {"text":"answer"}\n\nevent: done\ndata: {"refunded":true,"reference":"ref"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } }))
  const h = handlers(); const controller = new AbortController()
  await streamChatQuery(request, h, controller.signal)
  expect(JSON.parse(fetch.mock.calls[0][1].body).request_id).toBe('request-id')
  expect(fetch.mock.calls[0][1].signal).toBe(controller.signal)
  expect(h.onDone).toHaveBeenCalledWith(expect.objectContaining({ refunded: true, reference: 'ref' }))
})
it('rejects transport truncation instead of marking success', async () => {
  fetch.mockResolvedValue(new Response('event: delta\ndata: {"text":"partial"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } }))
  const h = handlers()
  await expect(streamChatQuery(request, h)).rejects.toThrow('vorzeitig')
  expect(h.onDone).not.toHaveBeenCalled()
})
it('retains refund status and support reference on HTTP errors', async () => {
  fetch.mockResolvedValue(Response.json({ error: 'Suche fehlgeschlagen', refunded: true, reference: 'abc' }, { status: 502 }))
  await expect(streamChatQuery(request, handlers())).rejects.toThrow('Credits wurden erstattet. Referenz: abc')
})
it('forwards fallback flag to onStart from stream meta', async () => {
  fetch.mockResolvedValue(new Response('event: meta\ndata: {"sources":[],"model":"standby-model","fallback":true}\n\nevent: done\ndata: {"refunded":false}\n\n', { headers: { 'Content-Type': 'text/event-stream' } }))
  const h = handlers()
  await streamChatQuery(request, h)
  expect(h.onStart).toHaveBeenCalledWith(expect.objectContaining({ model: 'standby-model', fallback: true }))
})
