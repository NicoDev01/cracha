import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), owned: vi.fn(), admit: vi.fn(), importChat: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/database-registry', () => ({ getOwnedDatabase: mocks.owned }))
vi.mock('@/lib/server/credits', () => ({ admitRequest: mocks.admit }))
vi.mock('@/lib/server/chat-history', () => ({ importConversation: mocks.importChat }))

import { POST } from './route'

const ID = '00000000-0000-4000-8000-0000000000bb'
const legacy = {
  id: ID,
  databaseId: 'kb',
  title: 'Alte Frage',
  messages: [
    { id: 'm1', type: 'user', content: 'Alte Frage', timestamp: '2026-09-01T10:00:00.000Z' },
    { id: 'm2', type: 'assistant', content: 'Antwort', timestamp: '2026-09-01T10:00:05.000Z', sources: [{ id: 's', title: 'S', url: 'https://example.com', snippet: '', relevance_score: 1 }], isStreaming: false },
    { id: 'm3', type: 'system', content: 'intern', timestamp: '2026-09-01T10:00:06.000Z' },
  ],
}
const post = (body: unknown) => new NextRequest('https://cracha-app.com/api/chats/import', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ id: 'alice' })
  mocks.admit.mockResolvedValue(true)
  mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'alice', status: 'active' })
  mocks.importChat.mockResolvedValue({ ok: true, imported: true })
})

describe('import of a chat kept by the browser', () => {
  it('files it under the session user, without system lines', async () => {
    const response = await POST(post(legacy))
    expect(await response.json()).toEqual({ success: true, imported: true })
    expect(mocks.owned).toHaveBeenCalledWith('kb', 'alice')
    expect(mocks.importChat).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'alice', conversationId: ID, databaseId: 'kb', title: 'Alte Frage',
      messages: [
        expect.objectContaining({ role: 'user', content: 'Alte Frage', created_at: '2026-09-01T10:00:00.000Z' }),
        expect.objectContaining({ role: 'assistant', content: 'Antwort', sources: [expect.objectContaining({ url: 'https://example.com' })] }),
      ],
    }))
  })
  it('skips a chat whose knowledge base the user no longer owns', async () => {
    mocks.owned.mockResolvedValue(null)
    expect(await (await POST(post(legacy))).json()).toEqual({ success: true, imported: false })
    expect(mocks.importChat).not.toHaveBeenCalled()
  })
  it('refuses an id that belongs to another account', async () => {
    mocks.importChat.mockResolvedValue({ ok: false, imported: false })
    expect((await POST(post(legacy))).status).toBe(404)
  })
  it('rejects malformed chats', async () => {
    expect((await POST(post({ ...legacy, id: 'x' }))).status).toBe(400)
    expect((await POST(post({ ...legacy, messages: [] }))).status).toBe(400)
    expect(mocks.importChat).not.toHaveBeenCalled()
  })
  it('requires a session', async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await POST(post(legacy))).status).toBe(401)
  })
})
