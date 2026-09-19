import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn(), eq: vi.fn() }))
vi.mock('./cloudflare', () => ({ getWorkerEnv: () => ({ SUPABASE_SERVICE_ROLE_KEY: 'test' }) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: mocks.eq }) }),
}) }))
import { refundChatCredits } from './credits'
afterEach(() => vi.unstubAllEnvs())
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.single })
  mocks.rpc.mockResolvedValue({ data: { granted: true }, error: null })
})
it('uses the original debit amount and a stable refund key', async () => {
  mocks.single.mockResolvedValue({ data: { amount: -5 }, error: null })
  await refundChatCredits('user', 'request')
  await refundChatCredits('user', 'request')
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user')
  expect(mocks.eq).toHaveBeenCalledWith('kind', 'chat')
  expect(mocks.rpc).toHaveBeenCalledWith('credit_grant', expect.objectContaining({ p_user: 'user', p_amount: 5, p_kind: 'refund', p_reference: 'chat:request' }))
  expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1])
})
it.each([null, { amount: 5 }, { amount: 0 }])('cannot grant money without a debit: %j', async (data) => {
  mocks.single.mockResolvedValue({ data, error: null })
  await refundChatCredits('user', 'request')
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('does not hide failed ledger access', async () => {
  mocks.single.mockResolvedValue({ data: null, error: { message: 'offline' } })
  await expect(refundChatCredits('user', 'request')).rejects.toThrow()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
