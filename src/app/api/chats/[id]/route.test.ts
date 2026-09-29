import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), rename: vi.fn(), remove: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/chat-history', () => ({ getConversation: mocks.get, renameConversation: mocks.rename, deleteConversation: mocks.remove }))

import { DELETE, GET, PATCH } from './route'

const ID = '00000000-0000-4000-8000-0000000000aa'
const context = (id = ID) => ({ params: Promise.resolve({ id }) })
const call = (method: string, body?: unknown) =>
  new NextRequest(`https://cracha-app.com/api/chats/${ID}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
const summary = { id: ID, databaseId: 'kb', title: 'T', createdAt: '2026-09-29T10:00:00Z', updatedAt: '2026-09-29T10:00:00Z' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ id: 'alice' })
})

describe('one chat of the signed-in account', () => {
  it('requires a session', async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await GET(call('GET'), context())).status).toBe(401)
    expect((await DELETE(call('DELETE'), context())).status).toBe(401)
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('answers a malformed id with not found, without a query', async () => {
    expect((await GET(call('GET'), context('../x'))).status).toBe(404)
    expect(mocks.get).not.toHaveBeenCalled()
  })
  it('looks up only with the session user, so another account reads as not found', async () => {
    mocks.get.mockResolvedValue(null)
    expect((await GET(call('GET'), context())).status).toBe(404)
    expect(mocks.get).toHaveBeenCalledWith('alice', ID)
  })
  it('returns the conversation with its messages', async () => {
    mocks.get.mockResolvedValue({ conversation: summary, messages: [] })
    const response = await GET(call('GET'), context())
    expect(await response.json()).toEqual({ success: true, conversation: summary, messages: [] })
  })
  it('renames with a cleaned title and refuses an empty one', async () => {
    mocks.rename.mockResolvedValue({ ...summary, title: 'Neuer Name' })
    expect((await PATCH(call('PATCH', { title: '  "Neuer Name"\nzweite Zeile ' }), context())).status).toBe(200)
    expect(mocks.rename).toHaveBeenCalledWith('alice', ID, 'Neuer Name')
    expect((await PATCH(call('PATCH', { title: '   ' }), context())).status).toBe(400)
    expect((await PATCH(call('PATCH', { title: 42 }), context())).status).toBe(400)
    expect(mocks.rename).toHaveBeenCalledOnce()
  })
  it('reports a rename of a chat that is gone', async () => {
    mocks.rename.mockResolvedValue(null)
    expect((await PATCH(call('PATCH', { title: 'X' }), context())).status).toBe(404)
  })
  it('deletes idempotently, and only the session user\'s chat', async () => {
    mocks.remove.mockResolvedValue(false)
    expect((await DELETE(call('DELETE'), context())).status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('alice', ID)
  })
  it('says the history is unreachable instead of failing silently', async () => {
    mocks.remove.mockRejectedValue(new Error('db down'))
    expect((await DELETE(call('DELETE'), context())).status).toBe(503)
  })
})
