import { describe, expect, it, vi } from 'vitest'

// Nothing under test reads a binding, but the module graph reaches the
// Cloudflare context, which does not exist outside a Worker.
vi.mock('./cloudflare', () => ({ getWorkerEnv: () => ({}) }))

const { periodEnd, stripeForm, verifyStripeSignature } = await import('./stripe')

const SECRET = 'whsec_ThisIsNotARealSigningSecret'
const NOW = 1_786_470_000_000

async function sign(payload: string, secret: string, seconds: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${seconds}.${payload}`))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const BODY = '{"id":"evt_1","type":"customer.subscription.updated"}'

describe('who is allowed to tell us somebody paid', () => {
  it('accepts a delivery signed with the right secret', async () => {
    const seconds = Math.floor(NOW / 1_000)
    const header = `t=${seconds},v1=${await sign(BODY, SECRET, seconds)}`
    expect(await verifyStripeSignature(BODY, header, SECRET, NOW)).toBe(true)
  })

  it('refuses a body that changed after it was signed', async () => {
    // The whole point: without this, the endpoint is a form for handing out the
    // paid plan to anyone who can guess the JSON.
    const seconds = Math.floor(NOW / 1_000)
    const header = `t=${seconds},v1=${await sign(BODY, SECRET, seconds)}`
    const tampered = BODY.replace('evt_1', 'evt_2')
    expect(await verifyStripeSignature(tampered, header, SECRET, NOW)).toBe(false)
  })

  it('refuses a signature made with a different secret', async () => {
    const seconds = Math.floor(NOW / 1_000)
    const header = `t=${seconds},v1=${await sign(BODY, 'whsec_SomebodyElse', seconds)}`
    expect(await verifyStripeSignature(BODY, header, SECRET, NOW)).toBe(false)
  })

  it('refuses a correctly signed delivery that is an hour old', async () => {
    // A replayed delivery is still mathematically valid. Its age is what
    // rejects it.
    const seconds = Math.floor(NOW / 1_000) - 3_600
    const header = `t=${seconds},v1=${await sign(BODY, SECRET, seconds)}`
    expect(await verifyStripeSignature(BODY, header, SECRET, NOW)).toBe(false)
  })

  it('accepts the second signature during a secret rotation', async () => {
    // Stripe sends one v1 per active secret while a rotation is in progress.
    // Reading only the first would reject every delivery until it finishes.
    const seconds = Math.floor(NOW / 1_000)
    const header = [
      `t=${seconds}`,
      `v1=${await sign(BODY, 'whsec_TheOldOne', seconds)}`,
      `v1=${await sign(BODY, SECRET, seconds)}`,
    ].join(',')
    expect(await verifyStripeSignature(BODY, header, SECRET, NOW)).toBe(true)
  })

  it('refuses when there is no header, no signature or no secret', async () => {
    const seconds = Math.floor(NOW / 1_000)
    const signature = await sign(BODY, SECRET, seconds)
    expect(await verifyStripeSignature(BODY, null, SECRET, NOW)).toBe(false)
    expect(await verifyStripeSignature(BODY, `t=${seconds}`, SECRET, NOW)).toBe(false)
    expect(await verifyStripeSignature(BODY, 'nonsense', SECRET, NOW)).toBe(false)
    expect(await verifyStripeSignature(BODY, `t=${seconds},v1=${signature}`, undefined, NOW)).toBe(false)
  })
})

describe('talking to Stripe in the shape it expects', () => {
  it('nests arrays and objects the way the form API reads them', () => {
    expect(stripeForm({
      mode: 'subscription',
      line_items: [{ price: 'price_1', quantity: 1 }],
      metadata: { supabase_user_id: 'user-1' },
    })).toBe('mode=subscription&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Bsupabase_user_id%5D=user-1')
  })

  it('leaves out what was not set instead of sending the word undefined', () => {
    expect(stripeForm({ customer: undefined, customer_email: 'a@example.com' }))
      .toBe('customer_email=a%40example.com')
  })
})

describe('when the paid period ends', () => {
  const subscription = { id: 'sub_1', status: 'active', customer: 'cus_1' }

  it('reads the period from the subscription', () => {
    expect(periodEnd({ ...subscription, current_period_end: 1_786_470_000 }))
      .toBe('2026-08-11T17:40:00.000Z')
  })

  it('reads it from the item when the newer API put it there', () => {
    expect(periodEnd({ ...subscription, items: { data: [{ current_period_end: 1_786_470_000 }] } }))
      .toBe('2026-08-11T17:40:00.000Z')
  })

  it('reports an unknown period as unknown rather than as now', () => {
    // null leaves current_period_end empty, which planState reads as "no end".
    // A zero would expire the plan the moment it was paid for.
    expect(periodEnd(subscription)).toBeNull()
  })
})
