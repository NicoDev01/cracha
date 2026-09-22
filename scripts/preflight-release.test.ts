import { describe, expect, it, vi, beforeEach } from 'vitest'
import { verifyPreflight, FATAL_RPC_ERROR_CODES } from './preflight-release'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('verifyPreflight', () => {
  const validEnv: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    CRACHA_SERVICE_TOKEN: 'test-token',
    MODAL_CRAWLER_URL: 'https://crawler.modal.run',
    CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED: 'true',
  }

  let mockRpc: ReturnType<typeof vi.fn>
  let mockFrom: ReturnType<typeof vi.fn>
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    vi.resetAllMocks()

    mockRpc = vi.fn().mockImplementation(async (name: string) => {
      // Default: simulate expected validation errors for calls with dummy arguments
      if (name === 'credit_spend') {
        return { data: null, error: { code: 'P0001', message: 'Invalid debit' } }
      }
      if (name === 'credit_hold') {
        return { data: null, error: { code: 'P0001', message: 'Invalid amount' } }
      }
      if (name === 'credit_settle') {
        return { data: null, error: { code: 'P0001', message: 'Unknown hold' } }
      }
      if (name === 'bind_crawl_hold') {
        return { data: null, error: { code: 'P0001', message: 'Missing crawl reservation' } }
      }
      if (name === 'database_preflight_check') {
        return {
          data: [
            { function_name: 'database_allocate', signature_valid: true, service_role_executable: true },
            { function_name: 'database_deallocate', signature_valid: true, service_role_executable: true },
            { function_name: 'database_sync_batch', signature_valid: true, service_role_executable: true },
            { function_name: 'database_count', signature_valid: true, service_role_executable: true },
            { function_name: 'database_claim_delete', signature_valid: true, service_role_executable: true },
            { function_name: 'bind_crawl_hold', signature_valid: true, service_role_executable: true },
          ],
          error: null,
        }
      }
      return { data: null, error: null }
    })

    mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    mockSupabase = {
      rpc: mockRpc,
      from: mockFrom,
    } as unknown as SupabaseClient

    // Mock global fetch for Crawler health endpoint
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ billing_protocol: 1, settlement_configured: true }),
    }))
  })

  it('passes when all environment, tables, RPCs, crawler, and manual gates are verified', async () => {
    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(true)
    const failures = results.filter((r) => r.critical && !r.passed)
    expect(failures).toHaveLength(0)
  })

  it('fails when an RPC is missing (PGRST202)', async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'database_preflight_check') {
        return { data: null, error: { code: 'PGRST202', message: 'Could not find function' } }
      }
      return { data: null, error: null }
    })

    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(false)
    const failedRpc = results.find((r) => r.name === 'RPC: database_preflight_check')
    expect(failedRpc?.passed).toBe(false)
    expect(failedRpc?.critical).toBe(true)
    expect(failedRpc?.message).toContain('Migration unvollständig')
  })

  it('fails when database_preflight_check reports invalid signature or permission error', async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'database_preflight_check') {
        return {
          data: [
            { function_name: 'database_allocate', signature_valid: true, service_role_executable: false },
          ],
          error: null,
        }
      }
      if (name === 'credit_spend') return { data: null, error: { code: 'P0001', message: 'Invalid debit' } }
      if (name === 'credit_hold') return { data: null, error: { code: 'P0001', message: 'Invalid amount' } }
      if (name === 'credit_settle') return { data: null, error: { code: 'P0001', message: 'Unknown hold' } }
      if (name === 'bind_crawl_hold') return { data: null, error: { code: 'P0001', message: 'Missing crawl reservation' } }
      return { data: null, error: null }
    })

    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(false)
    const failedCheck = results.find((r) => r.name === 'RPC Diagnostic: database_allocate')
    expect(failedCheck?.passed).toBe(false)
    expect(failedCheck?.message).toContain('service_role ausführbar=false')
  })

  it('fails when database_preflight_check omits an expected function', async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'database_preflight_check') {
        return {
          data: [
            { function_name: 'database_allocate', signature_valid: true, service_role_executable: true },
            { function_name: 'database_deallocate', signature_valid: true, service_role_executable: true },
            { function_name: 'database_sync_batch', signature_valid: true, service_role_executable: true },
            { function_name: 'database_count', signature_valid: true, service_role_executable: true },
            { function_name: 'database_claim_delete', signature_valid: true, service_role_executable: true },
            // bind_crawl_hold is omitted!
          ],
          error: null,
        }
      }
      return { data: null, error: null }
    })

    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(false)
    const omittedCheck = results.find((r) => r.name === 'RPC Diagnostic: bind_crawl_hold')
    expect(omittedCheck?.passed).toBe(false)
    expect(omittedCheck?.message).toContain('nicht im Diagnose-Ergebnis vorhanden')
  })

  it('fails when an RPC returns an unexpected fatal error', async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'credit_spend') {
        return { data: null, error: { code: '42P01', message: 'relation credit_entries does not exist' } }
      }
      return { data: null, error: null }
    })

    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(false)
    const failedRpc = results.find((r) => r.name === 'RPC: credit_spend')
    expect(failedRpc?.passed).toBe(false)
  })

  it('fails when a required table does not exist', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: table === 'user_database_deletions' ? { message: 'relation does not exist' } : null,
      }),
    }))

    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(false)
    const failedTable = results.find((r) => r.name === 'Table: user_database_deletions')
    expect(failedTable?.passed).toBe(false)
    expect(failedTable?.critical).toBe(true)
  })

  it('fails when crawler health check returns incompatible billing protocol', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ billing_protocol: 0, settlement_configured: false }),
    }))

    const { passed, results } = await verifyPreflight(mockSupabase, validEnv)
    expect(passed).toBe(false)
    const crawlerCheck = results.find((r) => r.name === 'Crawler: Health & Billing Protocol')
    expect(crawlerCheck?.passed).toBe(false)
    expect(crawlerCheck?.critical).toBe(true)
  })

  it('blocks release when Supabase Auth Hook Before User Created is unverified', async () => {
    const envWithoutHook = { ...validEnv }
    delete envWithoutHook.CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED

    const { passed, results } = await verifyPreflight(mockSupabase, envWithoutHook)
    expect(passed).toBe(false)
    const hookCheck = results.find((r) => r.name === 'Gate: Supabase Auth Hook (Before User Created)')
    expect(hookCheck?.passed).toBe(false)
    expect(hookCheck?.critical).toBe(true)
    expect(hookCheck?.message).toContain('BLOCKER')
  })
})
