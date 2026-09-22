import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn(), rpc: vi.fn(), remember: vi.fn() }))
vi.mock('./stripe', () => ({ stripeGet: mocks.get, customerId: (value: string) => value }))
vi.mock('./cloudflare', () => ({ getWorkerEnv: () => ({ STRIPE_PRICE_CREDITS_S: 'price_s' }) }))
vi.mock('./credits', async () => ({
  ...await import('../credit-tariff'), creditsAdmin: () => ({ rpc: mocks.rpc }), rememberCustomer: mocks.remember,
}))
import { reconcileCheckout, reconcilePaymentIntent } from './payment-reconciliation'
const session = { id: 'cs_1', mode: 'payment', payment_status: 'paid', currency: 'eur', amount_total: 1000, payment_intent: 'pi_1', customer: 'cus_1', metadata: { supabase_user_id: 'user', package: 'S', terms_version: '2026-09-20', immediate_start: 'true', accepted_at: '2026-09-20' } }
const line = { quantity: 1, price: { id: 'price_s', currency: 'eur', unit_amount: 1000 } }
const charge = { id: 'ch_1', paid: true, amount: 1000, amount_refunded: 0, currency: 'eur', dispute: null as null | { status: string } }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.rpc.mockResolvedValue({ error: null })
  mocks.get.mockImplementation(async (path: string) => path.includes('line_items') ? { data: [line] } : path.startsWith('/payment_intents/') ? { latest_charge: charge } : session)
})
describe('verified payment reconciliation', () => {
  it('fulfills legacy fully discounted sessions without a payment intent', async () => {
    mocks.get.mockResolvedValueOnce({ ...session, payment_status: 'no_payment_required', amount_total: 0, payment_intent: null }).mockResolvedValueOnce({ data: [line] })
    expect(await reconcileCheckout('cs_1')).toBe('paid')
    expect(mocks.rpc).toHaveBeenCalledWith('reconcile_payment', expect.objectContaining({ p_amount: 0, p_intent: 'free:cs_1' }))
  })
  it('uses server tariff, current charge and persisted consent', async () => {
    expect(await reconcileCheckout('cs_1', 'user')).toBe('paid')
    expect(mocks.rpc).toHaveBeenCalledWith('reconcile_payment', expect.objectContaining({ p_user: 'user', p_credits: 1250, p_refunded: 0, p_dispute_state: null, p_consent: expect.objectContaining({ immediate_start: true }) }))
  })
  it('does not expose or reconcile another user checkout', async () => {
    await expect(reconcileCheckout('cs_1', 'other')).rejects.toThrow()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('waits for delayed payment', async () => {
    mocks.get.mockResolvedValue({ ...session, payment_status: 'unpaid' })
    expect(await reconcileCheckout('cs_1')).toBe('pending')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each(['currency', 'price', 'quantity'])('rejects mismatched %s before granting', async (field) => {
    mocks.get.mockResolvedValueOnce(session).mockResolvedValueOnce({ data: [{ ...line, ...(field === 'quantity' ? { quantity: 2 } : { price: { ...line.price, ...(field === 'currency' ? { currency: 'usd' } : { id: 'wrong' }) } }) }] })
    await expect(reconcileCheckout('cs_1')).rejects.toThrow()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each([['needs_response', true], ['lost', true], ['won', false], ['warning_closed', false]])('maps dispute %s to hold=%s', async (status) => {
    mocks.get.mockResolvedValueOnce(session).mockResolvedValueOnce({ data: [line] }).mockResolvedValueOnce({ latest_charge: { ...charge, amount_refunded: 200, dispute: { status } } })
    await reconcileCheckout('cs_1')
    expect(mocks.rpc).toHaveBeenCalledWith('reconcile_payment', expect.objectContaining({ p_refunded: 200, p_dispute_state: status }))
  })
  it('propagates write failures so webhook delivery can retry', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'offline' } })
    await expect(reconcileCheckout('cs_1')).rejects.toThrow()
  })
  it('ignores payments belonging to a different product', async () => {
    mocks.get.mockResolvedValue({ data: [{ id: 'other', metadata: {} }] })
    await reconcilePaymentIntent('pi_other')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
