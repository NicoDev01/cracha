import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), post: vi.fn(), admit: vi.fn(), customer: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/cloudflare', () => ({ getWorkerEnv: () => ({ STRIPE_PRICE_CREDITS_S: 'price_s' }) }))
vi.mock('@/lib/server/credits', async original => ({ ...await original<typeof import('@/lib/server/credits')>(), admitRequest: mocks.admit, existingCustomer: mocks.customer }))
vi.mock('@/lib/server/stripe', () => ({ stripeGet: mocks.get, stripePost: mocks.post }))
vi.mock('@/lib/server/payment-reconciliation', () => ({ reconcileCheckout: vi.fn() }))
import { POST } from './route'
const request = (acceptTerms?: unknown) => new NextRequest('https://cracha-app.com/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ package: 'S', acceptTerms }) })
beforeEach(() => {
  vi.resetAllMocks(); mocks.auth.mockResolvedValue({ id: 'user', email: 'user@example.com' }); mocks.admit.mockResolvedValue(true)
  mocks.get.mockResolvedValue({ active: true, currency: 'eur', unit_amount: 1000, tax_behavior: 'inclusive' })
  mocks.post.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
})
it.each([undefined, false, 'true'])('requires explicit server-side agreement: %s', async value => {
  expect((await POST(request(value))).status).toBe(400); expect(mocks.post).not.toHaveBeenCalled()
})
it('records the consent and updates returning customers tax addresses', async () => {
  mocks.customer.mockResolvedValue('cus_existing')
  expect((await POST(request(true))).status).toBe(200)
  expect(mocks.post).toHaveBeenCalledWith('/checkout/sessions', expect.objectContaining({
    customer: 'cus_existing', customer_update: { address: 'auto' }, billing_address_collection: 'required',
    metadata: expect.objectContaining({ immediate_start: 'true', terms_version: '2026-09-20', consent_text: expect.any(String) }),
    success_url: expect.stringContaining('session_id={CHECKOUT_SESSION_ID}'),
  }))
})
it('refuses exclusive tax prices instead of exceeding the advertised gross price', async () => {
  mocks.get.mockResolvedValue({ active: true, currency: 'eur', unit_amount: 1000, tax_behavior: 'exclusive' })
  expect((await POST(request(true))).status).toBe(502); expect(mocks.post).not.toHaveBeenCalled()
})
