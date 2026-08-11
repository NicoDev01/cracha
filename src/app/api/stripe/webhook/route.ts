import { NextRequest, NextResponse } from 'next/server'

import { accountFor, applySubscription, billingAdmin } from '@/lib/server/billing'
import { getWorkerEnv } from '@/lib/server/cloudflare'
import { verifyStripeSignature, type StripeSubscription } from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

interface StripeEvent {
  id?: string
  type?: string
  data?: { object?: StripeSubscription }
}

/**
 * Only subscription events are handled, and that is enough: a failed payment,
 * a cancellation and a renewal all move the subscription into a new status and
 * emit `customer.subscription.updated`. Each of those events carries the
 * status, the period and the account, so none of them needs a second lookup.
 *
 * Everything else is answered with 200. An error would make Stripe retry an
 * event this app has no interest in, for days.
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
  if (!parsed.type?.startsWith('customer.subscription.')) {
    return NextResponse.json({ received: true, handled: false })
  }

  const subscription = parsed.data?.object
  if (!subscription?.id || !subscription.status) {
    return NextResponse.json({ received: true, handled: false })
  }

  try {
    const admin = billingAdmin()
    const userId = await accountFor(admin, subscription)
    if (!userId) {
      // A subscription created directly in the Stripe dashboard for someone who
      // has never been through checkout. There is no account to credit, and
      // retrying will not produce one.
      console.warn(JSON.stringify({
        event: 'stripe_webhook_unattributed',
        stripe_event: parsed.id,
        subscription: subscription.id,
      }))
      return NextResponse.json({ received: true, handled: false })
    }

    await applySubscription(admin, userId, subscription)
    console.log(JSON.stringify({
      event: 'stripe_subscription_applied',
      stripe_event: parsed.id,
      type: parsed.type,
      status: subscription.status,
    }))
    return NextResponse.json({ received: true, handled: true })
  } catch (error) {
    // 500 on purpose: this one Stripe should retry, because the account is now
    // paying for something it has not been given.
    console.error(JSON.stringify({
      event: 'stripe_webhook_failed',
      stripe_event: parsed.id,
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return NextResponse.json({ error: 'Verarbeitung fehlgeschlagen.' }, { status: 500 })
  }
}
