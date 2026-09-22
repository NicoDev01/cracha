import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  listOwnedIds: vi.fn(),
}))

vi.mock('./cloudflare', () => ({
  getWorkerEnv: () => ({ SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' }),
}))

vi.mock('./database-registry', () => ({
  listOwnedDatabaseIds: mocks.listOwnedIds,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
  }),
}))

import {
  allocateDatabaseSlot,
  claimDatabaseDeletion,
  deallocateDatabaseSlot,
  deleteCrawlAccess,
  getActiveDeletionClaim,
  syncDatabaseSlots,
  hasUnsettledCrawl,
} from './credits'

describe('database quota allocation & coordination', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    mocks.listOwnedIds.mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('allocateDatabaseSlot', () => {
    it('returns allowed: true when RPC permits allocation', async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ allowed: true, current_count: 5 }],
        error: null,
      })

      const res = await allocateDatabaseSlot('user-1', 'kb-test', 25)
      expect(res).toEqual({ allowed: true, currentCount: 5 })
      expect(mocks.rpc).toHaveBeenCalledWith('database_allocate', {
        p_user: 'user-1',
        p_database: 'kb-test',
        p_max: 25,
        p_existing_ids: null,
      })
    })

    it('passes existingIds for initial atomic sync', async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ allowed: true, current_count: 3 }],
        error: null,
      })

      const res = await allocateDatabaseSlot('user-1', 'kb-new', 25, ['db-1', 'db-2'])
      expect(res).toEqual({ allowed: true, currentCount: 3 })
      expect(mocks.rpc).toHaveBeenCalledWith('database_allocate', {
        p_user: 'user-1',
        p_database: 'kb-new',
        p_max: 25,
        p_existing_ids: ['db-1', 'db-2'],
      })
    })

    it('returns allowed: false when RPC quota limit (25) is reached', async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ allowed: false, current_count: 25 }],
        error: null,
      })

      const res = await allocateDatabaseSlot('user-1', 'kb-excess', 25)
      expect(res).toEqual({ allowed: false, currentCount: 25 })
    })

    it('fails closed when RPC throws an error or fails', async () => {
      mocks.rpc.mockRejectedValue(new Error('RPC unavailable'))
      await expect(allocateDatabaseSlot('user-1', 'kb-fallback', 25)).rejects.toThrow(
        'Datenbankkontingent konnte nicht geprüft werden.',
      )
    })
  })

  describe('claimDatabaseDeletion', () => {
    it('returns allowed: true when RPC permits deletion', async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ allowed: true, reason: 'ok' }],
        error: null,
      })
      const res = await claimDatabaseDeletion('user-1', 'kb-del')
      expect(res).toEqual({ allowed: true, reason: 'ok' })
      expect(mocks.rpc).toHaveBeenCalledWith('database_claim_delete', {
        p_user: 'user-1',
        p_database: 'kb-del',
      })
    })

    it('returns allowed: false with active_crawl reason when crawl is running', async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ allowed: false, reason: 'active_crawl' }],
        error: null,
      })
      const res = await claimDatabaseDeletion('user-1', 'kb-del')
      expect(res).toEqual({ allowed: false, reason: 'active_crawl' })
    })

    it('throws when RPC fails', async () => {
      mocks.rpc.mockRejectedValue(new Error('RPC error'))
      await expect(claimDatabaseDeletion('user-1', 'kb-del')).rejects.toThrow(
        'Datenbank-Löschung konnte nicht koordiniert werden.',
      )
    })
  })

  describe('deallocateDatabaseSlot', () => {
    it('calls database_deallocate RPC', async () => {
      mocks.rpc.mockResolvedValue({ data: 4, error: null })
      await deallocateDatabaseSlot('user-1', 'kb-delete')
      expect(mocks.rpc).toHaveBeenCalledWith('database_deallocate', {
        p_user: 'user-1',
        p_database: 'kb-delete',
      })
    })

    it('throws when RPC fails', async () => {
      mocks.rpc.mockRejectedValue(new Error('RPC failed'))
      await expect(deallocateDatabaseSlot('user-1', 'kb-delete')).rejects.toThrow(
        'Datenbank-Freigabe konnte nicht durchgeführt werden.',
      )
    })
  })

  describe('syncDatabaseSlots', () => {
    it('calls database_sync_batch and returns count', async () => {
      mocks.rpc.mockResolvedValue({ data: 3, error: null })
      const count = await syncDatabaseSlots('user-1', ['id1', 'id2', 'id3'])
      expect(count).toBe(3)
      expect(mocks.rpc).toHaveBeenCalledWith('database_sync_batch', {
        p_user: 'user-1',
        p_database_ids: ['id1', 'id2', 'id3'],
      })
    })

    it('falls back to input length on error', async () => {
      mocks.rpc.mockRejectedValue(new Error('sync failed'))
      const count = await syncDatabaseSlots('user-1', ['id1', 'id2'])
      expect(count).toBe(2)
    })
  })

  describe('hasUnsettledCrawl', () => {
    it('returns true when an active hold exists directly for the database in credit_holds', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'crawl_access') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { ready: true, reference: 'ref-old' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: [{ reference: 'active-crawl-hold' }], error: null }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const unsettled = await hasUnsettledCrawl('user-1', 'kb-1')
      expect(unsettled).toBe(true)
    })

    it('returns true when crawl_access is not ready (ready: false) and hold exists', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'crawl_access') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { ready: false, reference: 'ref-crawl' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: [], error: null }),
                  maybeSingle: async () => ({ data: { reference: 'ref-crawl' }, error: null }),
                }),
                maybeSingle: async () => ({ data: { reference: 'ref-crawl' }, error: null }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const unsettled = await hasUnsettledCrawl('user-1', 'kb-1')
      expect(unsettled).toBe(true)
    })

    it('returns false when crawl is fully settled and ready: true with no open holds', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'crawl_access') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { ready: true, reference: 'ref-crawl' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const unsettled = await hasUnsettledCrawl('user-1', 'kb-1')
      expect(unsettled).toBe(false)
    })

    it('throws error when database query fails', async () => {
      mocks.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: { message: 'DB down' } }),
              limit: async () => ({ data: null, error: { message: 'DB down' } }),
            }),
          }),
        }),
      }))

      await expect(hasUnsettledCrawl('user-1', 'kb-1')).rejects.toThrow('Crawl-Abrechnung konnte nicht geprüft werden.')
    })
  })

  describe('deleteCrawlAccess', () => {
    it('releases all open credit holds and deletes crawl access record', async () => {
      mocks.rpc.mockResolvedValue({ error: null })
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      mocks.from.mockImplementation((table: string) => {
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ reference: 'hold-1' }, { reference: 'hold-2' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'crawl_access') {
          return { delete: deleteMock }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      await deleteCrawlAccess('db-1', 'user-1')
      expect(mocks.rpc).toHaveBeenCalledWith('credit_release', { p_reference: 'hold-1' })
      expect(mocks.rpc).toHaveBeenCalledWith('credit_release', { p_reference: 'hold-2' })
      expect(deleteMock).toHaveBeenCalled()
    })

    it('throws when querying credit_holds fails', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: null, error: { message: 'Hold query error' } }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      await expect(deleteCrawlAccess('db-1', 'user-1')).rejects.toThrow('Ausstehende Holds konnten nicht geprüft werden')
    })

    it('throws when releaseCrawlCredits fails', async () => {
      mocks.rpc.mockRejectedValue(new Error('RPC credit_release failed'))
      mocks.from.mockImplementation((table: string) => {
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [{ reference: 'hold-1' }], error: null }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      await expect(deleteCrawlAccess('db-1', 'user-1')).rejects.toThrow('RPC credit_release failed')
    })

    it('throws when crawl_access delete fails', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'credit_holds') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [], error: null }),
              }),
            }),
          }
        }
        if (table === 'crawl_access') {
          return {
            delete: () => ({
              eq: () => ({
                eq: async () => ({ error: { message: 'Access delete error' } }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      await expect(deleteCrawlAccess('db-1', 'user-1')).rejects.toThrow('Crawl-Zugriff konnte nicht gelöscht werden')
    })
  })

  describe('getActiveDeletionClaim', () => {
    it('returns active claim when row exists without completed_at', async () => {
      const row = { database_id: 'db-1', user_id: 'user-1', claimed_at: '2026-09-21T00:00:00Z', completed_at: null }
      mocks.from.mockImplementation((table: string) => {
        if (table === 'user_database_deletions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: row, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const claim = await getActiveDeletionClaim('user-1', 'db-1')
      expect(claim).toEqual(row)
    })

    it('returns null when no active claim exists', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'user_database_deletions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const claim = await getActiveDeletionClaim('user-1', 'db-1')
      expect(claim).toBeNull()
    })

    it('throws when querying user_database_deletions fails', async () => {
      mocks.from.mockImplementation((table: string) => {
        if (table === 'user_database_deletions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: null, error: { message: 'DB down' } }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })

      await expect(getActiveDeletionClaim('user-1', 'db-1')).rejects.toThrow('Aktiver Lösch-Claim konnte nicht geprüft werden')
    })
  })
})
