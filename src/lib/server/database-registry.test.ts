import { beforeEach, describe, expect, it, vi } from 'vitest'

// Two knowledge bases per page, so the cursor loop is exercised by any user
// with three of them rather than by a thousand.
const { store, PAGE_SIZE } = vi.hoisted(() => ({ store: new Map<string, string>(), PAGE_SIZE: 2 }))

vi.mock('./cloudflare', () => ({
  getWorkerEnv: () => ({
    DATABASE_REGISTRY: {
      get: async (key: string, type?: string) => {
        const raw = store.get(key)
        if (raw === undefined) return null
        return type === 'json' ? JSON.parse(raw) : raw
      },
      put: async (key: string, value: string) => {
        store.set(key, value)
      },
      delete: async (key: string) => {
        store.delete(key)
      },
      list: async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
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
      },
    },
  }),
}))

const {
  claimDatabase,
  createDatabase,
  getOwnedDatabase,
  listOwnedDatabaseIds,
  ownerKey,
  releaseDatabase,
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
})
