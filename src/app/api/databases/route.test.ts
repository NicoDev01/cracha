import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createDatabase: vi.fn(),
  listOwnedIds: vi.fn(),
  getOwned: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/database-registry', () => ({
  createDatabase: mocks.createDatabase,
  listOwnedDatabaseIds: mocks.listOwnedIds,
  getOwnedDatabase: mocks.getOwned,
}))

import { CreditError } from '@/lib/server/credits'
import { GET, POST } from './route'

describe('/api/databases', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ id: 'user-1' })
    mocks.listOwnedIds.mockResolvedValue(['db-1'])
    mocks.getOwned.mockResolvedValue({
      id: 'db-1',
      user_id: 'user-1',
      name: 'Docs',
      created_at: '2026-09-20T00:00:00.000Z',
    })
    mocks.createDatabase.mockImplementation(async (userId: string, name: string, url: string) => ({
      id: `kb-${Date.now()}`,
      user_id: userId,
      name,
      url,
      source_url: url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending',
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects GET when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns owned databases on GET', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; databases: Array<{ id: string }> }
    expect(body.success).toBe(true)
    expect(body.databases).toHaveLength(1)
  })

  it('rejects POST when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)
    const req = new NextRequest('https://example.com/api/databases', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', url: 'https://example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects POST when name or url is invalid', async () => {
    const req = new NextRequest('https://example.com/api/databases', {
      method: 'POST',
      body: JSON.stringify({ name: '', url: 'not-a-url' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates database on valid POST', async () => {
    const req = new NextRequest('https://example.com/api/databases', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valid DB', url: 'https://example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean; database: { name: string } }
    expect(body.success).toBe(true)
    expect(body.database.name).toBe('Valid DB')
  })

  it('rejects POST with 402 Payment Required when database quota (25) is reached', async () => {
    const quotaState = {
      balance: 100,
      reserved: 0,
      databases: 25,
      maxDatabases: 25,
      costs: { page: 1, chatMessage: 5 },
    }
    mocks.createDatabase.mockRejectedValueOnce(new CreditError('databases', quotaState))

    const req = new NextRequest('https://example.com/api/databases', {
      method: 'POST',
      body: JSON.stringify({ name: '26th DB', url: 'https://example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(402)
    const body = (await res.json()) as { success: boolean; error: string; reason: string }
    expect(body.success).toBe(false)
    expect(body.reason).toBe('databases')
  })

  it('handles race condition: parallel requests at 24/25 limit admit only 1', async () => {
    // Simulate atomic DB admission: first parallel call gets slot 25, second throws CreditError
    let callCount = 0
    mocks.createDatabase.mockImplementation(async (userId: string, name: string, url: string) => {
      callCount++
      if (callCount === 1) {
        return {
          id: 'kb-25',
          user_id: userId,
          name,
          url,
          source_url: url,
          created_at: new Date().toISOString(),
          status: 'pending',
        }
      }
      throw new CreditError('databases', {
        balance: 100,
        reserved: 0,
        databases: 25,
        maxDatabases: 25,
        costs: { page: 1, chatMessage: 5 },
      })
    })

    const req1 = new NextRequest('https://example.com/api/databases', {
      method: 'POST',
      body: JSON.stringify({ name: 'Parallel A', url: 'https://example.com' }),
    })
    const req2 = new NextRequest('https://example.com/api/databases', {
      method: 'POST',
      body: JSON.stringify({ name: 'Parallel B', url: 'https://example.com' }),
    })

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)])
    const statuses = [res1.status, res2.status].sort()
    expect(statuses).toEqual([201, 402])
  })
})
