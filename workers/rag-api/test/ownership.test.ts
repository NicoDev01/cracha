import { createTestCoordinatorNamespace } from './coordinator-fixture'
import { describe, expect, it } from 'vitest'

import { databaseForUser, ownerKey, removeOwnership } from '../src/database'
import { HttpError } from '../src/http'
import type { DatabaseRecord, Env } from '../src/types'

const ANNA = 'anna-0000-1111'
const BEN = 'ben-2222-3333'

function record(id: string, userId: string): DatabaseRecord {
  return {
    id,
    name: id,
    source_url: 'https://example.com',
    user_id: userId,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    last_crawl: null,
    document_count: 0,
    pages_count: 0,
    chunks_count: 0,
    status: 'active',
  }
}

function memoryEnv(): Env & { store: Map<string, string> } {
  const store = new Map<string, string>()
  const env = {
    store,
    AI_SEARCH: {} as Env['AI_SEARCH'],
    INGEST_SECRET: 'i',
    QUERY_SECRET: 'q',
    DATABASE_REGISTRY: {
      // The type argument matters here: membership keys hold a bare marker, not
      // JSON, and reading them as JSON would mask a missing claim.
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
    } as unknown as KVNamespace,
  }
  createTestCoordinatorNamespace(env)
  return env
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise
    return 200
  } catch (error) {
    return error instanceof HttpError ? error.status : 500
  }
}

describe('the second check, in the worker the frontend calls', () => {
  it('serves the owner', async () => {
    const env = memoryEnv()
    env.store.set('kb-anna', JSON.stringify(record('kb-anna', ANNA)))
    expect((await databaseForUser(env, 'kb-anna', ANNA)).id).toBe('kb-anna')
  })

  it('refuses another user asking for a knowledge base by its exact id', async () => {
    // The frontend already checks this. It is checked again here because a
    // question carries the knowledge base id from the browser, and the browser
    // is not what decides who owns it.
    const env = memoryEnv()
    env.store.set('kb-anna', JSON.stringify(record('kb-anna', ANNA)))
    expect(await statusOf(databaseForUser(env, 'kb-anna', BEN))).toBe(403)
  })

  it('reports an unknown knowledge base as missing, not as forbidden', async () => {
    expect(await statusOf(databaseForUser(memoryEnv(), 'kb-nothing', ANNA))).toBe(404)
  })

  it('refuses a legacy record that nobody claims', async () => {
    const env = memoryEnv()
    const { user_id: _none, ...ownerless } = record('kb-orphan', ANNA)
    env.store.set('kb-orphan', JSON.stringify(ownerless))
    expect(await statusOf(databaseForUser(env, 'kb-orphan', BEN))).toBe(403)
  })

  it('adopts a legacy record for the user whose membership key names it', async () => {
    const env = memoryEnv()
    const { user_id: _none, ...ownerless } = record('kb-old', ANNA)
    env.store.set('kb-old', JSON.stringify(ownerless))
    env.store.set(ownerKey(ANNA, 'kb-old'), '1')

    expect(await statusOf(databaseForUser(env, 'kb-old', BEN))).toBe(403)
    expect((await databaseForUser(env, 'kb-old', ANNA)).user_id).toBe(ANNA)
    expect(JSON.parse(env.store.get('kb-old')!).user_id).toBe(ANNA)
  })

  it('adopts a legacy record still listed in the old array', async () => {
    const env = memoryEnv()
    const { user_id: _none, ...ownerless } = record('kb-veryold', ANNA)
    env.store.set('kb-veryold', JSON.stringify(ownerless))
    env.store.set(`user_index:${ANNA}`, JSON.stringify({ databases: ['kb-veryold'] }))

    expect((await databaseForUser(env, 'kb-veryold', ANNA)).user_id).toBe(ANNA)
    expect(env.store.has(ownerKey(ANNA, 'kb-veryold'))).toBe(true)
  })
})

describe('releasing a knowledge base', () => {
  it('clears both the membership key and the old array entry', async () => {
    // An account that has not been listed since the migration still carries its
    // knowledge bases in the array, and a deleted base reappearing in the
    // selector is worse than one that never left.
    const env = memoryEnv()
    env.store.set(ownerKey(ANNA, 'kb-gone'), '1')
    env.store.set(`user_index:${ANNA}`, JSON.stringify({ databases: ['kb-gone', 'kb-stays'] }))

    await removeOwnership(env, ANNA, 'kb-gone')

    expect(env.store.has(ownerKey(ANNA, 'kb-gone'))).toBe(false)
    expect(JSON.parse(env.store.get(`user_index:${ANNA}`)!).databases).toEqual(['kb-stays'])
  })

  it('does nothing surprising when there is no old array', async () => {
    const env = memoryEnv()
    env.store.set(ownerKey(ANNA, 'kb-gone'), '1')
    await removeOwnership(env, ANNA, 'kb-gone')
    expect(env.store.has(ownerKey(ANNA, 'kb-gone'))).toBe(false)
    expect(env.store.has(`user_index:${ANNA}`)).toBe(false)
  })
})
