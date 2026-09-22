import { beforeEach, describe, expect, it, vi } from 'vitest'

// Two knowledge bases per page, so the cursor loop is exercised by any user
// with three of them rather than by a thousand.
const { store, mockCredits, mockKv, ragFault } = vi.hoisted(() => {
  const store = new Map<string, string>()
  const PAGE_SIZE = 2
  const mockKv = {
    get: vi.fn(async (key: string, type?: string) => {
      const raw = store.get(key)
      if (raw === undefined) return null
      return type === 'json' ? JSON.parse(raw) : raw
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    list: vi.fn(async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
      const matching = [...store.keys()].filter((key) => key.startsWith(prefix)).sort()
      const start = cursor ? Number(cursor) : 0
      const page = matching.slice(start, start + PAGE_SIZE)
      const next = start + PAGE_SIZE
      const complete = next >= matching.length
      return {
        keys: page.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete ? undefined : String(next),
      }
    }),
  }
  return {
    store,
    /** HTTP status the coordinator answers with instead of processing, when set. */
    ragFault: { status: 0 },
    PAGE_SIZE,
    mockCredits: {
      allocateSlot: vi.fn(),
      deallocateSlot: vi.fn(),
      getState: vi.fn(),
    },
    mockKv,
  }
})

vi.mock('./credits', () => ({
  allocateDatabaseSlot: mockCredits.allocateSlot,
  deallocateDatabaseSlot: mockCredits.deallocateSlot,
  getCreditState: mockCredits.getState,
  CreditError: class extends Error {
    reason: string
    state: unknown
    constructor(reason: string, state: unknown) {
      super(`Credit limit: ${reason}`)
      this.reason = reason
      this.state = state
    }
  },
}))

vi.mock('./cloudflare', () => ({
  getWorkerEnv: () => ({
    DATABASE_REGISTRY: mockKv,
    RAG_QUERY_SECRET: 'test',
    RAG_API: { fetch: async (url: string, init: RequestInit) => {
      if (ragFault.status) return new Response('storage failure', { status: ragFault.status })
      if (init.method === 'DELETE') {
        await mockKv.delete(decodeURIComponent(new URL(url).pathname.split('/').pop()!))
        return Response.json({ success: true })
      }
      const { database } = JSON.parse(String(init.body))
      const old = await mockKv.get(database.id, 'json')
      if (old?.status === 'deleting' && database.status !== 'deleting') throw new Error('wird derzeit gelöscht und kann nicht aktualisiert werden')
      await mockKv.put(database.id, JSON.stringify(database))
      return Response.json({ success: true })
    } },
  }),
}))

const {
  claimDatabase,
  createDatabase,
  getOwnedDatabase,
  listOwnedDatabaseIds,
  ownerKey,
  releaseDatabase,
  saveDatabase,
} = await import('./database-registry')

const ANNA = 'anna-0000-1111'
const BEN = 'ben-2222-3333'

function record(id: string, userId: string) {
  const now = '2026-08-01T10:00:00Z'
  return {
    id,
    name: id,
    description: '',
    user_id: userId,
    source_url: 'https://example.com',
    url: 'https://example.com',
    created_at: now,
    updated_at: now,
    last_crawl: null,
    document_count: 0,
    chunks_count: 0,
    pages_count: 0,
    status: 'active' as const,
  }
}

/** A record from before ownership was stored on the record itself. */
function legacyRecord(id: string) {
  const { user_id: _dropped, ...rest } = record(id, 'irrelevant')
  store.set(id, JSON.stringify(rest))
}

beforeEach(() => {
  store.clear()
  ragFault.status = 0
  vi.resetAllMocks()
  mockCredits.allocateSlot.mockResolvedValue({ allowed: true, currentCount: 1 })
  mockCredits.deallocateSlot.mockResolvedValue(undefined)
  mockCredits.getState.mockResolvedValue({ balance: 100, reserved: 0, databases: 1, maxDatabases: 25, costs: { page: 1, chatMessage: 5 } })
  mockKv.get.mockImplementation(async (key: string, type?: string) => {
    const raw = store.get(key)
    if (raw === undefined) return null
    return type === 'json' ? JSON.parse(raw) : raw
  })
  mockKv.put.mockImplementation(async (key: string, val: string) => {
    store.set(key, val)
  })
  mockKv.delete.mockImplementation(async (key: string) => {
    store.delete(key)
  })
})

describe('who may read a knowledge base', () => {
  it('gives an owner their own knowledge base', async () => {
    await claimDatabase(record('kb-anna', ANNA))
    expect((await getOwnedDatabase('kb-anna', ANNA))?.id).toBe('kb-anna')
  })

  it('refuses somebody else, even knowing the exact id', async () => {
    await claimDatabase(record('kb-anna', ANNA))
    expect(await getOwnedDatabase('kb-anna', BEN)).toBeNull()
  })

  it('refuses a legacy record nobody has a claim on', async () => {
    // No owner on the record and no membership anywhere: the only safe answer
    // is no, because adopting it would hand the base to whoever asked first.
    legacyRecord('kb-orphan')
    expect(await getOwnedDatabase('kb-orphan', BEN)).toBeNull()
  })

  it('adopts a legacy record only for the user whose index names it', async () => {
    legacyRecord('kb-old')
    store.set(ownerKey(ANNA, 'kb-old'), '1')

    expect(await getOwnedDatabase('kb-old', BEN)).toBeNull()
    const adopted = await getOwnedDatabase('kb-old', ANNA)
    expect(adopted?.user_id).toBe(ANNA)
    // Adoption writes the owner onto the record, so the next read no longer
    // depends on the index at all.
    expect(JSON.parse(store.get('kb-old')!).user_id).toBe(ANNA)
  })

  it('adopts a legacy record listed only in the old array', async () => {
    legacyRecord('kb-veryold')
    store.set(`user_index:${ANNA}`, JSON.stringify({ databases: ['kb-veryold'] }))
    expect((await getOwnedDatabase('kb-veryold', ANNA))?.user_id).toBe(ANNA)
  })
})

describe('which knowledge bases a user is offered', () => {
  it('lists their own and nobody else', async () => {
    await claimDatabase(record('kb-anna-1', ANNA))
    await claimDatabase(record('kb-anna-2', ANNA))
    await claimDatabase(record('kb-ben-1', BEN))

    expect((await listOwnedDatabaseIds(ANNA)).sort()).toEqual(['kb-anna-1', 'kb-anna-2'])
    expect(await listOwnedDatabaseIds(BEN)).toEqual(['kb-ben-1'])
  })

  it('does not let one user id run into another that starts the same way', async () => {
    // `anna` and `anna2` share a prefix. Without the separator, the shorter id
    // would list the longer one's knowledge bases.
    await claimDatabase(record('kb-short', 'anna'))
    await claimDatabase(record('kb-long', 'anna2'))

    expect(await listOwnedDatabaseIds('anna')).toEqual(['kb-short'])
    expect(await listOwnedDatabaseIds('anna2')).toEqual(['kb-long'])
  })

  it('returns every knowledge base, not just the first page', async () => {
    for (const id of ['kb-1', 'kb-2', 'kb-3', 'kb-4', 'kb-5']) {
      await claimDatabase(record(id, ANNA))
    }
    expect((await listOwnedDatabaseIds(ANNA)).sort()).toEqual(['kb-1', 'kb-2', 'kb-3', 'kb-4', 'kb-5'])
  })

  it('migrates the old array and then stops reading it', async () => {
    store.set(`user_index:${ANNA}`, JSON.stringify({ databases: ['kb-a', 'kb-b'] }))

    expect((await listOwnedDatabaseIds(ANNA)).sort()).toEqual(['kb-a', 'kb-b'])
    expect(store.has(`user_index:${ANNA}`)).toBe(false)
    expect(store.has(ownerKey(ANNA, 'kb-a'))).toBe(true)
    // Second call reads the migrated keys and finds the same thing.
    expect((await listOwnedDatabaseIds(ANNA)).sort()).toEqual(['kb-a', 'kb-b'])
  })

  it('keeps both knowledge bases created at the same moment', async () => {
    // The bug this replaces: one shared array, read and written back by both
    // calls, so the slower write dropped the faster one's entry.
    await Promise.all([
      claimDatabase(record('kb-first', ANNA)),
      claimDatabase(record('kb-second', ANNA)),
    ])
    expect((await listOwnedDatabaseIds(ANNA)).sort()).toEqual(['kb-first', 'kb-second'])
  })

  it('drops a released knowledge base from the list', async () => {
    await claimDatabase(record('kb-gone', ANNA))
    await releaseDatabase(ANNA, 'kb-gone')

    expect(await listOwnedDatabaseIds(ANNA)).toEqual([])
    expect(await getOwnedDatabase('kb-gone', ANNA)).toBeNull()
  })
})

describe('who assigns the id', () => {
  it('gives two knowledge bases of the same name different ids', async () => {
    const first = await createDatabase(ANNA, 'Webmen', 'https://example.com')
    const second = await createDatabase(BEN, 'Webmen', 'https://example.com')

    expect(first.id).not.toBe(second.id)
    expect(first.id.startsWith('webmen-')).toBe(true)
    // Ben naming his base the same as Anna's must not reach, block or reveal
    // hers. Before, the id was the name plus part of the user id, so the second
    // user to pick a name was told the base already existed.
    expect(await getOwnedDatabase(first.id, BEN)).toBeNull()
    expect(await listOwnedDatabaseIds(BEN)).toEqual([second.id])
  })

  it('makes the new knowledge base immediately its creator’s', async () => {
    const created = await createDatabase(ANNA, 'Docs', 'https://example.com/docs')
    expect((await getOwnedDatabase(created.id, ANNA))?.user_id).toBe(ANNA)
    expect(await listOwnedDatabaseIds(ANNA)).toEqual([created.id])
  })

  it('passes existing KV database IDs to allocateDatabaseSlot for atomic sync', async () => {
    await claimDatabase(record('kb-exist-1', ANNA))
    await claimDatabase(record('kb-exist-2', ANNA))
    await createDatabase(ANNA, 'New DB', 'https://example.com/new')

    expect(mockCredits.allocateSlot).toHaveBeenCalledWith(
      ANNA,
      expect.stringMatching(/^new-db-/),
      undefined,
      expect.arrayContaining(['kb-exist-1', 'kb-exist-2']),
    )
  })

  it('rolls back and deallocates slot when claimDatabase fails and KV cleanup succeeds', async () => {
    let putCalls = 0
    mockKv.put.mockImplementation(async (key: string, val: string) => {
      putCalls++
      if (putCalls === 2) {
        throw new Error('KV put failed')
      }
      store.set(key, val)
    })

    await expect(createDatabase(ANNA, 'Failing DB', 'https://example.com')).rejects.toThrow('KV put failed')
    expect(mockCredits.deallocateSlot).toHaveBeenCalledWith(ANNA, expect.any(String))
  })

  it('retains slot reservation when partial KV write cleanup cannot verify keys are gone', async () => {
    let putCalls = 0
    mockKv.put.mockImplementation(async (key: string, val: string) => {
      putCalls++
      if (putCalls === 2) {
        throw new Error('KV put failed')
      }
      store.set(key, val)
    })
    mockKv.delete.mockImplementation(async () => {
      throw new Error('KV delete failed during cleanup')
    })

    await expect(createDatabase(ANNA, 'Failing DB 2', 'https://example.com')).rejects.toThrow('KV put failed')
    expect(mockCredits.deallocateSlot).not.toHaveBeenCalled()
  })

  it('waits for delayed record put to settle before compensation and deallocates only after cleanup', async () => {
    let resolveBarrier!: () => void
    const barrier = new Promise<void>((resolve) => {
      resolveBarrier = resolve
    })

    let recordPutStarted = false
    let recordPutFinished = false

    mockKv.put.mockImplementation(async (key: string, val: string) => {
      if (!key.startsWith('owner:')) {
        recordPutStarted = true
        await barrier
        recordPutFinished = true
        store.set(key, val)
        return
      }
      throw new Error('Owner put immediate failure')
    })

    const createPromise = createDatabase(ANNA, 'Delayed Put DB', 'https://example.com')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(recordPutStarted).toBe(true)
    expect(recordPutFinished).toBe(false)
    expect(mockCredits.deallocateSlot).not.toHaveBeenCalled()

    resolveBarrier()

    await expect(createPromise).rejects.toThrow('Owner put immediate failure')
    expect(recordPutFinished).toBe(true)
    expect(mockCredits.deallocateSlot).toHaveBeenCalledWith(ANNA, expect.any(String))
    expect(store.size).toBe(0)
  })

  it('waits for delayed owner put to settle before compensation (reverse order)', async () => {
    let resolveBarrier!: () => void
    const barrier = new Promise<void>((resolve) => {
      resolveBarrier = resolve
    })

    let ownerPutStarted = false
    let ownerPutFinished = false

    mockKv.put.mockImplementation(async (key: string, val: string) => {
      if (key.startsWith('owner:')) {
        ownerPutStarted = true
        await barrier
        ownerPutFinished = true
        store.set(key, val)
        return
      }
      throw new Error('Record put immediate failure')
    })

    const createPromise = createDatabase(ANNA, 'Delayed Owner Put DB', 'https://example.com')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(ownerPutStarted).toBe(true)
    expect(ownerPutFinished).toBe(false)
    expect(mockCredits.deallocateSlot).not.toHaveBeenCalled()

    resolveBarrier()

    await expect(createPromise).rejects.toThrow('Record put immediate failure')
    expect(ownerPutFinished).toBe(true)
    expect(mockCredits.deallocateSlot).toHaveBeenCalledWith(ANNA, expect.any(String))
    expect(store.size).toBe(0)
  })

  it('retains slot reservation when cleanup fails after delayed write', async () => {
    let resolveBarrier!: () => void
    const barrier = new Promise<void>((resolve) => {
      resolveBarrier = resolve
    })

    mockKv.put.mockImplementation(async (key: string, val: string) => {
      if (!key.startsWith('owner:')) {
        await barrier
        store.set(key, val)
        return
      }
      throw new Error('Owner put failed')
    })
    mockKv.delete.mockImplementation(async () => {
      throw new Error('Cleanup delete failed')
    })

    const createPromise = createDatabase(ANNA, 'Failing Cleanup DB', 'https://example.com')
    await new Promise((resolve) => setTimeout(resolve, 10))
    resolveBarrier()

    await expect(createPromise).rejects.toThrow('Owner put failed')
    expect(mockCredits.deallocateSlot).not.toHaveBeenCalled()
  })

  describe('saveDatabase deletion & existence protection', () => {
    it('saves successfully when database exists and is not deleting', async () => {
      store.set('db-valid', JSON.stringify(record('db-valid', ANNA)))
      await expect(
        saveDatabase({
          ...record('db-valid', ANNA),
          name: 'Updated Name',
        }),
      ).resolves.toBeUndefined()
      const stored = JSON.parse(store.get('db-valid')!)
      expect(stored.name).toBe('Updated Name')
    })

    it('allows saving newly created database when status is crawling', async () => {
      await expect(
        saveDatabase({
          ...record('db-new', ANNA),
          status: 'crawling',
        }),
      ).resolves.toBeUndefined()
      expect(store.has('db-new')).toBe(true)
    })

    it('rejects saving when existing database has status deleting and new status is not deleting', async () => {
      store.set('db-del', JSON.stringify({ ...record('db-del', ANNA), status: 'deleting' }))
      await expect(
        saveDatabase({
          ...record('db-del', ANNA),
          status: 'active',
        }),
      ).rejects.toThrow('wird derzeit gelöscht und kann nicht aktualisiert werden')
    })

    it('allows setting status to deleting on an existing database', async () => {
      store.set('db-del-allowed', JSON.stringify(record('db-del-allowed', ANNA)))
      await expect(
        saveDatabase({
          ...record('db-del-allowed', ANNA),
          status: 'deleting',
        }),
      ).resolves.toBeUndefined()
      const stored = JSON.parse(store.get('db-del-allowed')!)
      expect(stored.status).toBe('deleting')
    })


    it('rejects when the coordinator answers with an error status instead of reporting success', async () => {
      for (const status of [500, 503, 409]) {
        ragFault.status = status
        await expect(saveDatabase(record('db-fault', ANNA))).rejects.toThrow(`Koordination fehlgeschlagen (${status})`)
      }
      expect(store.has('db-fault')).toBe(false)
    })

    it('propagates kv.get errors and aborts without writing to KV', async () => {
      mockKv.get.mockRejectedValueOnce(new Error('KV connection broken'))
      await expect(
        saveDatabase({
          ...record('db-broken', ANNA),
          status: 'active',
        }),
      ).rejects.toThrow('KV connection broken')
    })
  })
})
