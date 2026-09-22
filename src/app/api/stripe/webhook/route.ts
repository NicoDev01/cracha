import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { reconcileCheckout, reconcilePaymentIntent } from '@/lib/server/payment-reconciliation'
import { verifyStripeSignature } from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const env = getWorkerEnv()

  // Read before verifying, and verify against exactly these bytes: re-encoding
  // the parsed JSON would produce a different string and a different HMAC.
  const payload = await request.text()
  const valid = await verifyStripeSignature(
    payload,
    request.headers.get('stripe-signature'),
    env.STRIPE_WEBHOOK_SECRET,
  )
  if (!valid) {
    console.warn(JSON.stringify({ event: 'stripe_webhook_rejected' }))
    return new NextResponse('Ungültige Signatur.', { status: 400 })
  }


  let event: { type?: string; data?: { object?: { id?: string; payment_intent?: string; metadata?: Record<string, string> } } }
  try { event = JSON.parse(payload) } catch { return NextResponse.json({ error: 'Ungültiges Ereignis.' }, { status: 400 }) }
  const object = event?.data?.object
  try {
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type ?? '') && object?.id && object.metadata?.supabase_user_id && object.metadata?.package) {
      await reconcileCheckout(object.id)
    } else if (['charge.refunded', 'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed', 'charge.dispute.funds_reinstated', 'charge.dispute.funds_withdrawn'].includes(event.type ?? '') && object?.payment_intent) {
      await reconcilePaymentIntent(object.payment_intent)
    } else {
      return NextResponse.json({ received: true, handled: false })
    }
    return NextResponse.json({ received: true, handled: true })
  } catch {
    console.error(JSON.stringify({ event: 'stripe_reconciliation_failed', type: event.type }))
    return NextResponse.json({ error: 'Verarbeitung fehlgeschlagen.' }, { status: 500 })
  }
}
