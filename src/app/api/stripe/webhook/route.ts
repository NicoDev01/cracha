import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { findPackage, grantPurchasedCredits, rememberCustomer } from '@/lib/server/credits'
import { customerId, verifyStripeSignature } from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

interface CheckoutSession {
  id?: string
  payment_status?: string
  customer?: string | { id: string } | null
  metadata?: Record<string, string> | null
}

interface StripeEvent {
  id?: string
  type?: string
  data?: { object?: CheckoutSession }
}

/**
 * Only `checkout.session.completed` is handled, and that is enough: credits are
 * bought outright, so there is no renewal, no dunning and no cancellation to
 * follow. Everything else is answered with 200 — an error would make Stripe
 * retry an event this app has no interest in, for days.
 *
 * The amount is never taken from the event. The session carries the package id;
 * how many credits that is worth is looked up from the tariff here.
 */
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

  const parsed = JSON.parse(payload) as StripeEvent
  if (parsed.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, handled: false })
  }

  const session = parsed.data?.object
  const userId = session?.metadata?.supabase_user_id
  const pack = findPackage(session?.metadata?.package)

  // A session that is completed but not paid is a delayed payment method that
  // has not settled. Crediting it now would hand out credits for money that may
  // never arrive; Stripe sends `checkout.session.async_payment_succeeded` when
  // it does, and until this app sells to such methods there is nothing to do.
  if (!session?.id || !userId || !pack || session.payment_status !== 'paid') {
    console.warn(JSON.stringify({
      event: 'stripe_checkout_ignored',
      stripe_event: parsed.id,
      payment_status: session?.payment_status,
      has_account: Boolean(userId),
      has_package: Boolean(pack),
    }))
    return NextResponse.json({ received: true, handled: false })
  }

  try {
    const granted = await grantPurchasedCredits({
      userId,
      credits: pack.credits,
      sessionId: session.id,
      detail: `Paket ${pack.label}`,
    })

    // Kept so the next top-up reuses the same customer instead of making a new
    // one. Deliberately after the grant: a failure here must not cost anyone
    // their credits, and the next checkout simply creates a customer again.
    const customer = customerId(session.customer ?? null)
    if (customer) {
      try {
        await rememberCustomer(userId, customer)
      } catch (error) {
        console.warn(JSON.stringify({
          event: 'stripe_customer_not_stored',
          error: error instanceof Error ? error.message : 'unknown',
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'credits_purchased',
      stripe_event: parsed.id,
      package: pack.id,
      credits: pack.credits,
      // False means the event was a replay and the credits were already there.
      granted,
    }))
    return NextResponse.json({ received: true, handled: true })
  } catch (error) {
    // 500 on purpose: this one Stripe should retry, because the account has
    // paid for something it has not been given.
    console.error(JSON.stringify({
      event: 'stripe_webhook_failed',
      stripe_event: parsed.id,
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return NextResponse.json({ error: 'Verarbeitung fehlgeschlagen.' }, { status: 500 })
  }
}
