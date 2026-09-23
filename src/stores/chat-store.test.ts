import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ stream: vi.fn() }))
vi.mock('@/lib/api/chat-api', () => ({ streamChatQuery: mocks.stream }))
vi.mock('@/lib/api/database-api', () => ({ getUserDatabases: vi.fn(), getDatabaseInfo: vi.fn() }))
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) })
const { useChatStore, restoreConversations } = await import('./chat-store')
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
  mocks.stream.mockImplementation(async (_request, handlers) => {
    useChatStore.getState().selectDatabase('B')
    handlers.onStart({ sources: [], model: 'test' }); handlers.onDelta('belongs to A'); handlers.onDone({ query_time: 1, model_used: 'test' })
  })
  await useChatStore.getState().sendMessage('Frage A')
  expect(useChatStore.getState().messages).toEqual([])
  useChatStore.getState().selectDatabase('A')
  expect(useChatStore.getState().messages[1].content).toBe('belongs to A')
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
  useChatStore.getState().selectConversation(original)
  expect(useChatStore.getState().messages[0].content).toBe('Erste Frage')
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
