import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ stream: vi.fn(), list: vi.fn(), get: vi.fn(), rename: vi.fn(), remove: vi.fn(), importChat: vi.fn(), toast: { error: vi.fn(), warning: vi.fn() } }))
vi.mock('@/lib/api/chat-api', () => ({ streamChatQuery: mocks.stream }))
vi.mock('@/lib/api/chat-history-api', async (original) => ({
  ...await original<typeof import('@/lib/api/chat-history-api')>(),
  listChats: mocks.list, getChat: mocks.get, renameChat: mocks.rename, deleteChat: mocks.remove, importChat: mocks.importChat,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@/lib/api/database-api', () => ({ getUserDatabases: vi.fn(), getDatabaseInfo: vi.fn() }))
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) })
const { useChatStore, restoreConversations } = await import('./chat-store')
const { ChatHistoryRejected } = await import('@/lib/api/chat-history-api')
beforeEach(() => {
  vi.resetAllMocks(); memory.clear()
  useChatStore.getState().claimFor(null)
  useChatStore.getState().claimFor('alice')
  useChatStore.getState().selectDatabase('A')
  mocks.stream.mockImplementation(async (_request, handlers) => {
    handlers.onStart({ sources: [], model: 'test' }); handlers.onDelta('Antwort'); handlers.onDone({ query_time: 1, model_used: 'test' })
  })
})
it('revives JSON dates and marks interrupted answers incomplete', () => {
  const result = restoreConversations({ a: { databaseId: 'A', messages: [{ id: '1', type: 'assistant', content: 'partial', timestamp: '2026-09-20T00:00:00.000Z', isStreaming: true }] } })
  expect(result.a.messages[0].timestamp.toISOString()).toBe('2026-09-20T00:00:00.000Z')
  expect(result.a.messages[0]).toMatchObject({ isStreaming: false, isError: true })
})
it('hydrates the persisted selected conversation without date crashes', async () => {
  await useChatStore.getState().sendMessage('Frage')
  await useChatStore.persist.rehydrate()
  expect(useChatStore.getState().messages[1].timestamp.toISOString()).toBeTruthy()
})
it('removes history on account change and logout', async () => {
  await useChatStore.getState().sendMessage('Private Frage')
  useChatStore.getState().claimFor('bob')
  expect(useChatStore.getState().messages).toEqual([])
  expect(useChatStore.getState().conversations).toEqual({})
  expect(memory.get('cracha-chat-store')).not.toContain('Private Frage')
  useChatStore.getState().claimFor(null)
  expect(useChatStore.getState().ownerId).toBeNull()
})
it('never writes late stream events into another database', async () => {
  let conversation = ''
  mocks.stream.mockImplementation(async (request, handlers) => {
    conversation = request.conversation_id
    useChatStore.getState().selectDatabase('B')
    handlers.onStart({ sources: [], model: 'test' }); handlers.onDelta('belongs to A'); handlers.onDone({ query_time: 1, model_used: 'test' })
  })
  await useChatStore.getState().sendMessage('Frage A')
  expect(useChatStore.getState().messages).toEqual([])
  expect(useChatStore.getState().conversations[conversation].messages[1].content).toBe('belongs to A')
})
it('drops a selection made before the account was claimed', () => {
  // Why the chat takes its preselection from the URL: a base chosen on another
  // page before the store belonged to this account does not survive the claim.
  useChatStore.getState().claimFor(null)
  useChatStore.getState().selectDatabase('X')
  useChatStore.getState().claimFor('carol')
  expect(useChatStore.getState().selectedDatabase).toBeNull()
  useChatStore.getState().selectDatabase('X')
  expect(useChatStore.getState().selectedDatabase).toBe('X')
})
it('preserves old conversations when starting a new one', async () => {
  await useChatStore.getState().sendMessage('Erste Frage')
  const original = useChatStore.getState().selectedConversation!
  useChatStore.getState().newConversation()
  await useChatStore.getState().sendMessage('Zweite Frage')
  expect(Object.keys(useChatStore.getState().conversations)).toHaveLength(2)
  expect(useChatStore.getState().history.map(chat => chat.title)).toEqual(['Zweite Frage', 'Erste Frage'])
  mocks.get.mockResolvedValue({ conversation: { id: original, databaseId: 'A', title: 'Erste Frage', createdAt: 'x', updatedAt: 'x' }, messages: [{ id: 's1', role: 'user', content: 'Erste Frage', sources: [], isError: false, createdAt: '2026-09-29T10:00:00Z' }] })
  await useChatStore.getState().selectConversation(original)
  expect(useChatStore.getState().messages[0].content).toBe('Erste Frage')
})

describe('history on the server', () => {
  it('sends the conversation id and takes the generated title', async () => {
    mocks.stream.mockImplementation(async (_request, handlers) => {
      handlers.onStart({ sources: [], model: 'test' }); handlers.onDelta('Antwort'); handlers.onDone({ query_time: 1, model_used: 'test' })
      handlers.onSaved({ saved: true, title: 'Kurzer Titel' })
    })
    await useChatStore.getState().sendMessage('Eine lange Frage zu etwas')
    const id = useChatStore.getState().selectedConversation!
    expect(mocks.stream.mock.calls[0][0].conversation_id).toBe(id)
    expect(useChatStore.getState().history).toEqual([expect.objectContaining({ id, databaseId: 'A', title: 'Kurzer Titel' })])
  })
  it('warns when an answer did not reach the history', async () => {
    mocks.stream.mockImplementation(async (_request, handlers) => {
      handlers.onStart({ sources: [], model: 'test' }); handlers.onDelta('Antwort'); handlers.onDone({ query_time: 1, model_used: 'test' })
      handlers.onSaved({ saved: false })
    })
    await useChatStore.getState().sendMessage('Frage')
    expect(mocks.toast.warning).toHaveBeenCalledOnce()
  })
  it('keeps no conversation content in localStorage', async () => {
    await useChatStore.getState().sendMessage('Geheime Frage')
    expect(memory.get('cracha-chat-store')).not.toContain('Geheime Frage')
    expect(memory.get('cracha-chat-store')).toContain(useChatStore.getState().selectedConversation!)
  })
  it('starts a new conversation when another knowledge base is picked', async () => {
    await useChatStore.getState().sendMessage('Frage')
    useChatStore.getState().selectDatabase('B')
    expect(useChatStore.getState()).toMatchObject({ selectedConversation: null, selectedDatabase: 'B', messages: [] })
  })
  it('opens a stored conversation with its knowledge base, and not before it loaded', async () => {
    const id = '00000000-0000-4000-8000-0000000000cc'
    mocks.get.mockResolvedValue({
      conversation: { id, databaseId: 'Z', title: 'Alt', createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z' },
      messages: [
        { id: 'q', role: 'user', content: 'Frage', sources: [], isError: false, createdAt: '2026-09-01T10:00:00Z' },
        { id: 'a', role: 'assistant', content: 'Antwort [1]', sources: [{ id: '1', title: 'S', url: 'https://x.y', snippet: '', relevance_score: 1 }], metadata: { query_time: 1, model_used: 'm' }, isError: false, createdAt: '2026-09-01T10:00:01Z' },
      ],
    })
    const opening = useChatStore.getState().selectConversation(id)
    expect(useChatStore.getState().loadingConversation).toBe(id)
    expect(await useChatStore.getState().sendMessage('zu früh')).toBe(false)
    await opening
    const state = useChatStore.getState()
    expect(state).toMatchObject({ selectedConversation: id, selectedDatabase: 'Z', loadingConversation: null })
    expect(state.messages.map(message => message.type)).toEqual(['user', 'assistant'])
    expect(state.messages[1].timestamp).toBeInstanceOf(Date)
    expect(state.messages[1].sources?.[0].url).toBe('https://x.y')
  })
  it('drops a conversation that was deleted elsewhere', async () => {
    mocks.get.mockRejectedValue(new ChatHistoryRejected('Chat nicht gefunden.', 404))
    await useChatStore.getState().selectConversation('00000000-0000-4000-8000-0000000000dd')
    expect(useChatStore.getState()).toMatchObject({ selectedConversation: null, loadingConversation: null })
    expect(mocks.toast.error).toHaveBeenCalled()
  })
  it('renames optimistically and restores the title when the server refuses', async () => {
    await useChatStore.getState().sendMessage('Frage')
    const id = useChatStore.getState().selectedConversation!
    mocks.rename.mockRejectedValue(new Error('offline'))
    expect(await useChatStore.getState().renameConversation(id, 'Neu')).toBe(false)
    expect(useChatStore.getState().history[0].title).toBe('Frage')
    mocks.rename.mockImplementation(async (_id: string, title: string) => ({ id, databaseId: 'A', title, createdAt: 'x', updatedAt: 'x' }))
    expect(await useChatStore.getState().renameConversation(id, '  Neu  ')).toBe(true)
    expect(useChatStore.getState().history[0].title).toBe('Neu')
    expect(mocks.rename).toHaveBeenLastCalledWith(id, 'Neu')
  })
  it('deletes on the server first and then forgets the conversation', async () => {
    await useChatStore.getState().sendMessage('Frage')
    const id = useChatStore.getState().selectedConversation!
    mocks.remove.mockRejectedValueOnce(new Error('offline'))
    expect(await useChatStore.getState().deleteConversation(id)).toBe(false)
    expect(useChatStore.getState().history).toHaveLength(1)
    mocks.remove.mockResolvedValue(undefined)
    expect(await useChatStore.getState().deleteConversation(id)).toBe(true)
    expect(useChatStore.getState()).toMatchObject({ history: [], selectedConversation: null, messages: [] })
    expect(useChatStore.getState().conversations[id]).toBeUndefined()
  })
  it('forgets the chats of deleted knowledge bases', async () => {
    await useChatStore.getState().sendMessage('Frage')
    useChatStore.getState().forgetDatabases(['A'])
    expect(useChatStore.getState()).toMatchObject({ history: [], selectedDatabase: null, selectedConversation: null, messages: [] })
  })
  it('loads the list once for concurrent callers and drops it after an account switch', async () => {
    let answer: (value: unknown) => void = () => {}
    mocks.list.mockReturnValue(new Promise(resolve => { answer = resolve }))
    const first = useChatStore.getState().loadHistory()
    const second = useChatStore.getState().loadHistory()
    await vi.waitFor(() => expect(mocks.list).toHaveBeenCalledOnce())
    useChatStore.getState().claimFor('mallory')
    answer([{ id: 'x', databaseId: 'A', title: 'Alice', createdAt: 'x', updatedAt: 'x' }])
    await Promise.all([first, second])
    expect(useChatStore.getState().history).toEqual([])
  })
  it('imports the conversations this browser kept for the owner, then removes them', async () => {
    const legacy = { c1: { databaseId: 'A', title: 'Alt', messages: [{ id: 'm', type: 'user', content: 'Alte Frage', timestamp: '2026-09-01T10:00:00.000Z' }] } }
    memory.set('cracha-chat-store', JSON.stringify({ state: { ownerId: 'alice', conversations: legacy, selectedConversation: 'c1', selectedDatabase: 'A' }, version: 2 }))
    await useChatStore.persist.rehydrate()
    expect(useChatStore.getState().legacyConversations?.c1.messages[0].content).toBe('Alte Frage')
    expect(useChatStore.getState().selectedConversation).toBe('c1')
    mocks.importChat.mockResolvedValue(true)
    mocks.list.mockResolvedValue([{ id: 'c1', databaseId: 'A', title: 'Alt', createdAt: 'x', updatedAt: 'x' }])
    await useChatStore.getState().loadHistory()
    expect(mocks.importChat).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', databaseId: 'A' }))
    expect(useChatStore.getState().legacyConversations).toBeNull()
    expect(useChatStore.getState().history.map(chat => chat.id)).toEqual(['c1'])
    expect(memory.get('cracha-chat-store')).not.toContain('Alte Frage')
  })
  it('keeps kept conversations for a later import while the server is unreachable', async () => {
    memory.set('cracha-chat-store', JSON.stringify({ state: { ownerId: 'alice', conversations: { c1: { databaseId: 'A', messages: [{ id: 'm', type: 'user', content: 'Q', timestamp: '2026-09-01T10:00:00.000Z' }] } } }, version: 2 }))
    await useChatStore.persist.rehydrate()
    mocks.importChat.mockRejectedValue(new Error('offline'))
    mocks.list.mockResolvedValue([])
    await useChatStore.getState().loadHistory()
    expect(useChatStore.getState().legacyConversations?.c1).toBeDefined()
  })
})
it('returns failure for draft recovery and records the error', async () => {
  mocks.stream.mockRejectedValue(new Error('Guthaben fehlt'))
  expect(await useChatStore.getState().sendMessage('Frage')).toBe(false)
  expect(useChatStore.getState().messages[1]).toMatchObject({ isError: true, content: 'Guthaben fehlt' })
})
it('passes a request ID and an abortable signal to the transport', async () => {
  await useChatStore.getState().sendMessage('Frage')
  expect(mocks.stream.mock.calls[0][0].request_id).toMatch(/^[a-f\d-]{36}$/)
  expect(mocks.stream.mock.calls[0][2]).toBeInstanceOf(AbortSignal)
})
it('forwards BYOK api key and model when configured', async () => {
  useChatStore.getState().setByokApiKey('AIzaSyTestKey')
  useChatStore.getState().setByokModel('gemini-2.5-pro')
  await useChatStore.getState().sendMessage('BYOK Frage')
  expect(mocks.stream.mock.calls[0][0].api_key).toBe('AIzaSyTestKey')
  expect(mocks.stream.mock.calls[0][0].model).toBe('gemini-2.5-pro')
})

it('clears BYOK api key and model on logout and account switch', async () => {
  useChatStore.getState().claimFor('alice')
  useChatStore.getState().setByokApiKey('AIzaSyAliceKey')
  useChatStore.getState().setByokModel('gemini-2.5-pro')
  expect(useChatStore.getState().byokApiKey).toBe('AIzaSyAliceKey')

  // Logout
  useChatStore.getState().claimFor(null)
  expect(useChatStore.getState().byokApiKey).toBeNull()
  expect(useChatStore.getState().byokModel).toBeNull()

  // B logs in
  useChatStore.getState().claimFor('bob')
  useChatStore.getState().selectDatabase('B-kb')
  expect(useChatStore.getState().byokApiKey).toBeNull()
  expect(useChatStore.getState().byokModel).toBeNull()

  // B's request does not contain A's key
  await useChatStore.getState().sendMessage('Frage von Bob')
  expect(mocks.stream).toHaveBeenCalled()
  const lastCall = mocks.stream.mock.calls[mocks.stream.mock.calls.length - 1][0]
  expect(lastCall.api_key).toBeUndefined()
})

it('clears BYOK api key on direct switch from alice to bob', async () => {
  useChatStore.getState().claimFor('alice')
  useChatStore.getState().setByokApiKey('AIzaSyAliceDirect')
  useChatStore.getState().claimFor('bob')
  expect(useChatStore.getState().byokApiKey).toBeNull()
  expect(useChatStore.getState().byokModel).toBeNull()
})

it('retains BYOK key for repeated claimFor calls of the same logged-in user', async () => {
  useChatStore.getState().claimFor('alice')
  useChatStore.getState().setByokApiKey('AIzaSyAliceStay')
  useChatStore.getState().setByokModel('gemini-2.5-pro')

  // Repeated claim for alice doesn't wipe
  useChatStore.getState().claimFor('alice')
  expect(useChatStore.getState().byokApiKey).toBe('AIzaSyAliceStay')
  expect(useChatStore.getState().byokModel).toBe('gemini-2.5-pro')

  // But storage never contains the key
  expect(memory.get('cracha-chat-store')).not.toContain('AIzaSyAliceStay')
})

it('actively cleans legacy persisted storage containing byokApiKey and prevents hydration', async () => {
  memory.set('cracha-chat-store', JSON.stringify({
    state: {
      ownerId: 'legacy-user',
      conversations: {},
      byokApiKey: 'AIzaSyLeakedLegacyKey',
      byokModel: 'gemini-custom',
    },
    version: 2,
  }))

  await useChatStore.persist.rehydrate()

  expect(useChatStore.getState().byokApiKey).toBeNull()
  expect(useChatStore.getState().byokModel).toBeNull()
  expect(memory.get('cracha-chat-store')).not.toContain('AIzaSyLeakedLegacyKey')
})

it('storage.getItem returns sanitized data without byok keys for legacy stored data', async () => {
  memory.set('cracha-chat-store', JSON.stringify({
    state: {
      ownerId: 'legacy-user',
      conversations: {},
      byokApiKey: 'AIzaSyLeakedLegacyKey',
      byokModel: 'gemini-custom',
    },
    version: 2,
  }))

  const storage = useChatStore.persist.getOptions().storage
  const item = (await storage?.getItem('cracha-chat-store')) as { state?: Record<string, unknown> } | null
  expect(item?.state).toBeDefined()
  expect(item?.state?.byokApiKey).toBeUndefined()
  expect(item?.state?.byokModel).toBeUndefined()
  expect(memory.get('cracha-chat-store')).not.toContain('AIzaSyLeakedLegacyKey')
})

it('rejects questions longer than 4000 characters without sending', async () => {
  useChatStore.getState().claimFor('alice')
  useChatStore.getState().selectDatabase('A')
  const longQuestion = 'a'.repeat(4001)
  const result = await useChatStore.getState().sendMessage(longQuestion)
  expect(result).toBe(false)
  expect(useChatStore.getState().error).toContain('4.000 Zeichen')
  expect(mocks.stream).not.toHaveBeenCalled()
})

it('accepts question of exactly 4000 characters', async () => {
  useChatStore.getState().claimFor('alice')
  useChatStore.getState().selectDatabase('A')
  const exactQuestion = 'a'.repeat(4000)
  const result = await useChatStore.getState().sendMessage(exactQuestion)
  expect(result).toBe(true)
  expect(mocks.stream).toHaveBeenCalled()
})

it('records fallback flag in message metadata on start', async () => {
  mocks.stream.mockImplementation(async (_request, handlers) => {
    handlers.onStart({ sources: [], model: 'fallback-model', fallback: true })
    expect(useChatStore.getState().messages[1].metadata).toMatchObject({
      model_used: 'fallback-model',
      fallback: true,
    })
    handlers.onDone({ query_time: 1, model_used: 'fallback-model', fallback: true })
  })
  await useChatStore.getState().sendMessage('Frage nach Fallback')
})

it('switches to the Gemini model that answered when the chosen one has no quota', async () => {
  useChatStore.getState().setByokApiKey('AIzaSyTestKey')
  useChatStore.getState().setByokModel('gemini-3.8-flash')
  mocks.stream.mockImplementation(async (_request, handlers) => {
    handlers.onStart({ sources: [], model: 'gemini-3.5-flash-lite', requestedModel: 'gemini-3.8-flash' }); handlers.onDelta('Antwort')
    handlers.onDone({ query_time: 1, model_used: 'gemini-3.5-flash-lite', requested_model: 'gemini-3.8-flash', substitute_reason: 'byok_quota' })
  })
  await useChatStore.getState().sendMessage('Frage')
  expect(useChatStore.getState().byokModel).toBe('gemini-3.5-flash-lite')
})
