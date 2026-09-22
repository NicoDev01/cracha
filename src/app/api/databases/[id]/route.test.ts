import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  owned: vi.fn(),
  save: vi.fn(),
  command: vi.fn(),
  release: vi.fn(),
  deleteAccess: vi.fn(),
  deallocateSlot: vi.fn(),
  hasUnsettled: vi.fn(),
  claimDelete: vi.fn(),
  activeClaim: vi.fn(),
  ragFetch: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/database-registry', () => ({
  getOwnedDatabase: mocks.owned,
  saveDatabase: mocks.save,
  coordinatorCommand: mocks.command,
  releaseDatabase: mocks.release,
}))
vi.mock('@/lib/server/credits', () => ({
  deleteCrawlAccess: mocks.deleteAccess,
  deallocateDatabaseSlot: mocks.deallocateSlot,
  hasUnsettledCrawl: mocks.hasUnsettled,
  claimDatabaseDeletion: mocks.claimDelete,
  getActiveDeletionClaim: mocks.activeClaim,
}))
vi.mock('@/lib/server/cloudflare', () => ({
  getWorkerEnv: () => ({
    RAG_API: { fetch: mocks.ragFetch },
    RAG_QUERY_SECRET: 'test-secret',
  }),
}))

import { GET, PUT, DELETE } from './route'

describe('/api/databases/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ id: 'user-1' })
    mocks.owned.mockResolvedValue({
      id: 'db-1',
      user_id: 'user-1',
      name: 'Docs',
      description: 'Test docs',
      status: 'completed',
      created_at: '2026-09-20T00:00:00.000Z',
      updated_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.command.mockImplementation(async (_id, _action, body) => ({ database: { id: 'db-1', ...body } }))
    mocks.hasUnsettled.mockResolvedValue(false)
    mocks.claimDelete.mockResolvedValue({ allowed: true, reason: 'ok' })
    mocks.activeClaim.mockResolvedValue(null)
    mocks.deleteAccess.mockResolvedValue(undefined)
    mocks.deallocateSlot.mockResolvedValue(undefined)
    mocks.release.mockResolvedValue(undefined)
    mocks.ragFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects GET when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)
    const res = await GET(new NextRequest('https://example.com/api/databases/db-1'), {
      params: Promise.resolve({ id: 'db-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when database is not owned', async () => {
    mocks.owned.mockResolvedValue(null)
    const res = await GET(new NextRequest('https://example.com/api/databases/db-1'), {
      params: Promise.resolve({ id: 'db-1' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns database details when owned', async () => {
    const res = await GET(new NextRequest('https://example.com/api/databases/db-1'), {
      params: Promise.resolve({ id: 'db-1' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; database: { id: string } }
    expect(body.success).toBe(true)
    expect(body.database.id).toBe('db-1')
  })

  it('updates database name and description on PUT', async () => {
    const req = new NextRequest('https://example.com/api/databases/db-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', description: 'New Desc' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(200)
    // Only the edited fields travel to the coordinator, never a full record that
    // could roll back the lifecycle.
    expect(mocks.command).toHaveBeenCalledWith('db-1', 'update-metadata', {
      user_id: 'user-1',
      name: 'New Name',
      description: 'New Desc',
    })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 409 Conflict when database status is crawling', async () => {
    mocks.owned.mockResolvedValue({
      id: 'db-1',
      user_id: 'user-1',
      status: 'crawling',
    })
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(409)
    expect(mocks.ragFetch).not.toHaveBeenCalled()
    expect(mocks.deleteAccess).not.toHaveBeenCalled()
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 409 Conflict when hasUnsettledCrawl returns true', async () => {
    mocks.hasUnsettled.mockResolvedValue(true)
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(409)
    expect(mocks.ragFetch).not.toHaveBeenCalled()
    expect(mocks.deleteAccess).not.toHaveBeenCalled()
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 409 Conflict when claimDatabaseDeletion detects active crawl', async () => {
    mocks.claimDelete.mockResolvedValue({ allowed: false, reason: 'active_crawl' })
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(409)
    expect(mocks.claimDelete).toHaveBeenCalledWith('user-1', 'db-1')
    expect(mocks.ragFetch).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 503 Service Unavailable when claimDatabaseDeletion RPC fails', async () => {
    mocks.claimDelete.mockRejectedValue(new Error('RPC connection failed'))
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('nicht koordiniert werden')
    expect(mocks.ragFetch).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 404 Not Found when claimDatabaseDeletion returns not_found', async () => {
    mocks.claimDelete.mockResolvedValue({ allowed: false, reason: 'not_found' })
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(404)
    expect(mocks.ragFetch).not.toHaveBeenCalled()
  })

  it('deletes database, cleaning up crawl_access, registry, and deallocating slot', async () => {
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(200)
    expect(mocks.ragFetch).toHaveBeenCalledWith(
      expect.stringContaining('/databases/db-1?user_id=user-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(mocks.deleteAccess).toHaveBeenCalledWith('db-1', 'user-1')
    expect(mocks.release).toHaveBeenCalledWith('user-1', 'db-1')
    expect(mocks.deallocateSlot).toHaveBeenCalledWith('user-1', 'db-1')
  })

  it('cleans up crawl_access and registry even when RAG API returns 404', async () => {
    mocks.ragFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(200)
    expect(mocks.deleteAccess).toHaveBeenCalledWith('db-1', 'user-1')
    expect(mocks.release).toHaveBeenCalledWith('user-1', 'db-1')
    expect(mocks.deallocateSlot).toHaveBeenCalledWith('user-1', 'db-1')
  })

  it('aborts delete and returns error when RAG API fails with 500', async () => {
    mocks.ragFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Worker error' }), { status: 500 }))
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    expect(mocks.deleteAccess).not.toHaveBeenCalled()
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('marks database status as deleting before purging resources', async () => {
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(200)
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'db-1', status: 'deleting' }),
    )
  })

  it('returns 500 when cleanup fails instead of falsely reporting success', async () => {
    mocks.release.mockRejectedValue(new Error('KV store unavailable'))
    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Bereinigung ist fehlgeschlagen')
  })

  it('rejects PUT with 409 Conflict when database is deleting', async () => {
    mocks.owned.mockResolvedValue({
      id: 'db-1',
      user_id: 'user-1',
      status: 'deleting',
    })
    const req = new NextRequest('https://example.com/api/databases/db-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(409)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('successfully finishes deletion on retry after a prior cleanup failure', async () => {
    // Retry: claim succeeds idempotently, RAG delete succeeds (or 404), cleanup completes
    mocks.claimDelete.mockResolvedValue({ allowed: true, reason: 'ok' })
    mocks.release.mockResolvedValue(undefined)
    mocks.deallocateSlot.mockResolvedValue(undefined)

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(200)
    expect(mocks.deallocateSlot).toHaveBeenCalledWith('user-1', 'db-1')
  })

  it('rejects DELETE with 404 Not Found when database does not exist in KV and no active deletion claim exists', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockResolvedValue(null)

    const req = new NextRequest('https://example.com/api/databases/non-existent-db', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'non-existent-db' }) })
    expect(res.status).toBe(404)
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('resumes and finalizes deallocation on retry when KV record was already deleted but active claim exists', async () => {
    // Database already missing in KV
    mocks.owned.mockResolvedValue(null)
    // In-progress deletion claim exists in SQL
    mocks.activeClaim.mockResolvedValue({
      database_id: 'db-1',
      user_id: 'user-1',
      claimed_at: '2026-09-20T00:00:00.000Z',
    })

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(200)
    expect(mocks.deallocateSlot).toHaveBeenCalledWith('user-1', 'db-1')
  })

  it('returns 500 when deallocation fails during retry of an already-deleted KV database', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockResolvedValue({
      database_id: 'db-1',
      user_id: 'user-1',
      claimed_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.deallocateSlot.mockRejectedValue(new Error('Postgres connection failed'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Bereinigung ist fehlgeschlagen')
  })

  it('rejects DELETE with 503 Service Unavailable when getActiveDeletionClaim query fails on retry', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockRejectedValue(new Error('Postgres query failed'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('nicht koordiniert werden')
    expect(mocks.ragFetch).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 503 Service Unavailable when RAG fetch network fails on retry, keeping claim open', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockResolvedValue({
      database_id: 'db-1',
      user_id: 'user-1',
      claimed_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.ragFetch.mockRejectedValue(new Error('Network unreachable'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('RAG-Dienst nicht erreichbar')
    expect(mocks.deleteAccess).not.toHaveBeenCalled()
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 500 when RAG API returns 500 on retry, keeping claim open', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockResolvedValue({
      database_id: 'db-1',
      user_id: 'user-1',
      claimed_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.ragFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Worker error' }), { status: 500 }))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    expect(mocks.deleteAccess).not.toHaveBeenCalled()
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('returns 500 when deleteCrawlAccess fails on retry, keeping slot allocated', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockResolvedValue({
      database_id: 'db-1',
      user_id: 'user-1',
      claimed_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.deleteAccess.mockRejectedValue(new Error('Access cleanup failed'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Bereinigung ist fehlgeschlagen')
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('returns 500 when releaseDatabase fails on retry, keeping slot allocated', async () => {
    mocks.owned.mockResolvedValue(null)
    mocks.activeClaim.mockResolvedValue({
      database_id: 'db-1',
      user_id: 'user-1',
      claimed_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.release.mockRejectedValue(new Error('KV release failed'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Bereinigung ist fehlgeschlagen')
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('rejects DELETE with 503 when RAG API network fails during normal deletion', async () => {
    mocks.ragFetch.mockRejectedValue(new Error('Worker unreachable'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(503)
    expect(mocks.deleteAccess).not.toHaveBeenCalled()
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.deallocateSlot).not.toHaveBeenCalled()
  })

  it('returns 500 when deallocateDatabaseSlot throws during regular deletion cleanup', async () => {
    mocks.deallocateSlot.mockRejectedValue(new Error('Postgres deallocate error'))

    const req = new NextRequest('https://example.com/api/databases/db-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'db-1' }) })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Bereinigung ist fehlgeschlagen')
  })
})
