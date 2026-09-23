import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Row = Record<string, unknown>

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  admit: vi.fn(),
  cancelJob: vi.fn(),
  deleteDatabase: vi.fn(),
  listIds: vi.fn(),
  owned: vi.fn(),
  kvDelete: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
  tables: {} as Record<string, Row[]>,
}))

/** Just enough of the supabase-js query builder: eq/is filters, awaited as { data, error }. */
function query(table: string) {
  const filters: Array<(row: Row) => boolean> = []
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return builder },
    is: (column: string, value: unknown) => { filters.push((row) => (row[column] ?? null) === value); return builder },
    limit: () => builder,
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (mocks.tables[table] ?? []).filter((row) => filters.every((filter) => filter(row))), error: null }),
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/credits', () => ({
  admitRequest: mocks.admit,
  creditsAdmin: () => ({
    from: query,
    auth: { admin: { deleteUser: mocks.deleteUser, getUserById: mocks.getUserById } },
  }),
}))
vi.mock('@/lib/server/crawler-api', () => ({ cancelCrawlJob: mocks.cancelJob }))
vi.mock('@/lib/server/database-deletion', () => ({ deleteOwnedDatabase: mocks.deleteDatabase }))
vi.mock('@/lib/server/database-registry', () => ({
  listOwnedDatabaseIds: mocks.listIds,
  getOwnedDatabase: mocks.owned,
  databaseRegistry: () => ({ delete: mocks.kvDelete }),
  ownerKey: (userId: string, id: string) => `owner:${userId}:${id}`,
}))

import { POST } from './route'

const USER = 'user-1'

function request(body: unknown = { confirm: 'LÖSCHEN' }, contentType = 'application/json') {
  return new NextRequest('https://example.com/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: JSON.stringify(body),
  })
}

/** Deleting a knowledge base removes it from every place the route enumerates. */
function deleteSucceeds() {
  mocks.deleteDatabase.mockImplementation(async (_user: string, id: string) => {
    kvIds = kvIds.filter((kv) => kv !== id)
    mocks.tables.user_databases = mocks.tables.user_databases.filter((row) => row.database_id !== id)
    return { ok: true }
  })
}

let kvIds: string[]

describe('POST /api/account/delete', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    kvIds = ['kb-a', 'kb-b']
    mocks.tables = {
      credit_holds: [{ reference: 'job-1', database_id: 'kb-a', user_id: USER }],
      user_databases: [
        { database_id: 'kb-a', user_id: USER },
        { database_id: 'kb-sql-only', user_id: USER },
        { database_id: 'kb-foreign', user_id: 'user-2' },
      ],
      user_database_deletions: [],
      billing_payments: [{ session_id: 'cs_1', user_id: USER, disputed: false }],
    }
    mocks.auth.mockResolvedValue({ id: USER })
    mocks.admit.mockResolvedValue(true)
    mocks.listIds.mockImplementation(async () => [...kvIds])
    mocks.owned.mockImplementation(async (id: string) => ({ id, user_id: USER, status: id === 'kb-b' ? 'crawling' : 'active', current_job_id: id === 'kb-b' ? 'job-2' : undefined }))
    mocks.cancelJob.mockImplementation(async ({ jobId }: { jobId: string }) => {
      mocks.tables.credit_holds = mocks.tables.credit_holds.filter((hold) => hold.reference !== jobId)
      return { ok: true }
    })
    deleteSucceeds()
    mocks.deleteUser.mockResolvedValue({ data: { user: {} }, error: null })
  })

  it('requires a signed-in user', async () => {
    mocks.auth.mockResolvedValue(null)
    const res = await POST(request())
    expect(res.status).toBe(401)
    expect(mocks.deleteDatabase).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it.each([
    [{ confirm: 'löschen' }],
    [{ confirm: 'LOESCHEN' }],
    [{}],
    [null],
  ])('refuses without the exact confirmation phrase: %j', async (body) => {
    const res = await POST(request(body))
    expect(res.status).toBe(400)
    expect(mocks.admit).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('refuses a body that is not sent as JSON', async () => {
    const res = await POST(request({ confirm: 'LÖSCHEN' }, 'text/plain'))
    expect(res.status).toBe(400)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('accepts the phrase typed with a decomposed umlaut', async () => {
    const res = await POST(request({ confirm: ' LO\u0308SCHEN ' }))
    expect(res.status).toBe(200)
  })

  it('stops crawls, deletes every knowledge base and deletes the auth user last', async () => {
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    expect(mocks.admit).toHaveBeenCalledWith(USER, 'account_delete', 5, 3600)
    // The hold and the crawling record, each cancelled once.
    expect(mocks.cancelJob.mock.calls.map(([job]) => job)).toEqual([
      { jobId: 'job-1', databaseId: 'kb-a', holdReference: 'job-1' },
      { jobId: 'job-2', databaseId: 'kb-b', holdReference: 'job-2' },
    ])
    // KV ∪ user_databases, never another user's slot.
    expect(mocks.deleteDatabase.mock.calls).toEqual([
      [USER, 'kb-a', { knownOwned: true }],
      [USER, 'kb-b', { knownOwned: false }],
      [USER, 'kb-sql-only', { knownOwned: true }],
    ])
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(USER)

    const lastCancel = Math.max(...mocks.cancelJob.mock.invocationCallOrder)
    const firstDelete = Math.min(...mocks.deleteDatabase.mock.invocationCallOrder)
    const lastDelete = Math.max(...mocks.deleteDatabase.mock.invocationCallOrder)
    expect(lastCancel).toBeLessThan(firstDelete)
    expect(lastDelete).toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0])
  })

  it('aborts when a crawl cannot be cancelled, before deleting anything', async () => {
    mocks.cancelJob.mockResolvedValue({ ok: false, stage: 'crawler' })
    const res = await POST(request())
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: string }).error).toMatch(/Crawl konnte nicht sicher abgebrochen werden/)
    expect(mocks.deleteDatabase).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('leaves the auth user in place when a knowledge base fails to delete', async () => {
    mocks.deleteDatabase.mockImplementation(async (_user: string, id: string) =>
      id === 'kb-b' ? { ok: false, status: 502, error: 'AI Search nicht erreichbar.' } : { ok: true })
    const res = await POST(request())
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: string }).error).toMatch(/Dein Konto wurde nicht gelöscht/)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
    // Stops at the failure instead of carrying on with the next one.
    expect(mocks.deleteDatabase).toHaveBeenCalledTimes(2)
  })

  it('completes on retry after a failed first attempt', async () => {
    mocks.deleteDatabase.mockResolvedValueOnce({ ok: false, status: 500, error: 'Bereinigung fehlgeschlagen.' })
    expect((await POST(request())).status).toBe(503)
    expect(mocks.deleteUser).not.toHaveBeenCalled()

    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(mocks.deleteUser).toHaveBeenCalledOnce()
  })

  it('answers success again once the account is already gone', async () => {
    mocks.admit.mockRejectedValue(new Error('admit_request fehlgeschlagen: violates foreign key constraint'))
    mocks.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404, code: 'user_not_found' } })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(mocks.deleteDatabase).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('treats an auth user that disappeared meanwhile as deleted', async () => {
    mocks.deleteUser.mockResolvedValue({ data: { user: null }, error: { status: 404, code: 'user_not_found' } })
    expect((await POST(request())).status).toBe(200)
  })

  it('reports a failing auth deletion instead of claiming success', async () => {
    mocks.deleteUser.mockResolvedValue({ data: { user: null }, error: { status: 500, code: 'unexpected_failure' } })
    const res = await POST(request())
    expect(res.status).toBe(503)
    expect(((await res.json()) as { success: boolean }).success).toBe(false)
  })

  it('refuses while a payment dispute is open', async () => {
    mocks.tables.billing_payments = [{ session_id: 'cs_1', user_id: USER, disputed: true }]
    const res = await POST(request())
    expect(res.status).toBe(409)
    expect(mocks.cancelJob).not.toHaveBeenCalled()
    expect(mocks.deleteDatabase).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('refuses when rate limited', async () => {
    mocks.admit.mockResolvedValue(false)
    const res = await POST(request())
    expect(res.status).toBe(429)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('does not delete the account when a knowledge base appeared meanwhile', async () => {
    deleteSucceeds()
    const inner = mocks.deleteDatabase.getMockImplementation()!
    mocks.deleteDatabase.mockImplementation(async (user: string, id: string) => {
      const result = await inner(user, id)
      if (id === 'kb-sql-only') kvIds.push('kb-new')
      return result
    })
    const res = await POST(request())
    expect(res.status).toBe(409)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })

  it('drops a dangling membership key but never a record it does not own', async () => {
    mocks.deleteDatabase.mockImplementation(async (_user: string, id: string) => {
      if (id === 'kb-b') { kvIds = kvIds.filter((kv) => kv !== id); return { ok: false, status: 404, error: 'Wissensbasis nicht gefunden.' } }
      mocks.tables.user_databases = mocks.tables.user_databases.filter((row) => row.database_id !== id)
      kvIds = kvIds.filter((kv) => kv !== id)
      return { ok: true }
    })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(mocks.kvDelete).toHaveBeenCalledExactlyOnceWith('owner:user-1:kb-b')
  })
})
