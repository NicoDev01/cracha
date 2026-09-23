import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  owned: vi.fn(),
  save: vi.fn(),
  release: vi.fn(),
  deleteAccess: vi.fn(),
  deallocateSlot: vi.fn(),
  hasUnsettled: vi.fn(),
  claimDelete: vi.fn(),
  activeClaim: vi.fn(),
  ragFetch: vi.fn(),
}))

vi.mock('./database-registry', () => ({
  getOwnedDatabase: mocks.owned,
  saveDatabase: mocks.save,
  releaseDatabase: mocks.release,
}))
vi.mock('./credits', () => ({
  deleteCrawlAccess: mocks.deleteAccess,
  deallocateDatabaseSlot: mocks.deallocateSlot,
  hasUnsettledCrawl: mocks.hasUnsettled,
  claimDatabaseDeletion: mocks.claimDelete,
  getActiveDeletionClaim: mocks.activeClaim,
}))
vi.mock('./cloudflare', () => ({
  getWorkerEnv: () => ({ RAG_API: { fetch: mocks.ragFetch }, RAG_QUERY_SECRET: 'test-secret' }),
}))

import { deleteOwnedDatabase } from './database-deletion'

describe('deleteOwnedDatabase', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.owned.mockResolvedValue({ id: 'db-1', user_id: 'user-1', status: 'active' })
    mocks.hasUnsettled.mockResolvedValue(false)
    mocks.claimDelete.mockResolvedValue({ allowed: true, reason: 'ok' })
    mocks.activeClaim.mockResolvedValue(null)
    mocks.ragFetch.mockResolvedValue(new Response('{}', { status: 200 }))
  })

  it('runs claim, remote delete and cleanup in that order', async () => {
    const order: string[] = []
    mocks.claimDelete.mockImplementation(async () => { order.push('claim'); return { allowed: true, reason: 'ok' } })
    mocks.save.mockImplementation(async () => { order.push('mark-deleting') })
    mocks.ragFetch.mockImplementation(async () => { order.push('remote'); return new Response('{}', { status: 200 }) })
    mocks.deleteAccess.mockImplementation(async () => { order.push('access') })
    mocks.release.mockImplementation(async () => { order.push('registry') })
    mocks.deallocateSlot.mockImplementation(async () => { order.push('slot') })

    await expect(deleteOwnedDatabase('user-1', 'db-1')).resolves.toEqual({ ok: true })
    expect(order).toEqual(['claim', 'mark-deleting', 'remote', 'access', 'registry', 'slot'])
  })

  it('reports 404 for an id missing from KV without a claim unless ownership is known', async () => {
    mocks.owned.mockResolvedValue(null)
    await expect(deleteOwnedDatabase('user-1', 'db-1')).resolves.toMatchObject({ ok: false, status: 404 })
    expect(mocks.claimDelete).not.toHaveBeenCalled()
    expect(mocks.ragFetch).not.toHaveBeenCalled()
  })

  it('claims and deletes an id known from user_databases that KV no longer lists', async () => {
    mocks.owned.mockResolvedValue(null)
    await expect(deleteOwnedDatabase('user-1', 'db-1', { knownOwned: true })).resolves.toEqual({ ok: true })
    expect(mocks.claimDelete).toHaveBeenCalledWith('user-1', 'db-1')
    expect(mocks.ragFetch).toHaveBeenCalledOnce()
    expect(mocks.deallocateSlot).toHaveBeenCalledWith('user-1', 'db-1')
  })

  it('treats a known id whose deletion already completed as done', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.claimDelete.mockResolvedValue({ allowed: false, reason: 'not_found' })
    await expect(deleteOwnedDatabase('user-1', 'db-1', { knownOwned: true })).resolves.toEqual({ ok: true })
    expect(mocks.ragFetch).not.toHaveBeenCalled()
  })

  it('refuses a known id with an open crawl hold', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.claimDelete.mockResolvedValue({ allowed: false, reason: 'active_crawl' })
    await expect(deleteOwnedDatabase('user-1', 'db-1', { knownOwned: true })).resolves.toMatchObject({ ok: false, status: 409 })
    expect(mocks.ragFetch).not.toHaveBeenCalled()
  })

  it('keeps the slot when the remote delete fails, so a retry can finish', async () => {
    mocks.ragFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'AI Search down' }), { status: 502 }))
    await expect(deleteOwnedDatabase('user-1', 'db-1')).resolves.toEqual({ ok: false, status: 502, error: 'AI Search down' })
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })
})
