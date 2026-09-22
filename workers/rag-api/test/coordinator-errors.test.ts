import { describe, expect, it } from 'vitest'
import { databaseForUser, saveDatabase } from '../src/database'
import { HttpError } from '../src/http'
import type { DatabaseRecord, Env } from '../src/types'

/** Review 5, second P1: a failing DO answer must never look like a successful write. */
function envWithCoordinatorStatus(status: number): Env {
  const stub = { fetch: async () => new Response('storage failure', { status }) }
  return {
    QUERY_SECRET: 'q',
    COORDINATOR: { idFromName: (name: string) => name, get: () => stub } as unknown as DurableObjectNamespace,
  } as unknown as Env
}

const record = { id: 'x', user_id: 'user', status: 'active' } as DatabaseRecord

describe('coordinator client error propagation', () => {
  for (const status of [500, 503, 409]) {
    it(`saveDatabase rejects on HTTP ${status}`, async () => {
      await expect(saveDatabase(envWithCoordinatorStatus(status), record)).rejects.toMatchObject({ status })
    })
    it(`databaseForUser rejects on HTTP ${status}`, async () => {
      await expect(databaseForUser(envWithCoordinatorStatus(status), 'x', 'user')).rejects.toBeInstanceOf(HttpError)
    })
  }

  it('fails clearly without a COORDINATOR binding instead of using a local fake', async () => {
    await expect(saveDatabase({ QUERY_SECRET: 'q' } as Env, record)).rejects.toMatchObject({ status: 503 })
  })
})
