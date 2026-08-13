import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { existingCustomer, findPackage } from '@/lib/server/credits'
import { stripePost } from '@/lib/server/stripe'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Opens Stripe's hosted checkout for one credit package and hands back the URL
 * to send the browser to. Card details never touch this application: the page
 * they are typed into is Stripe's, on Stripe's domain.
 *
 * `payment`, not `subscription`. Credits are bought once and kept until they
 * are used; there is nothing to renew, nothing to cancel, and nobody to charge
 * in a month for a service they stopped using.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { package?: unknown } | null
  const pack = findPackage(body?.package)
  if (!pack) return NextResponse.json({ error: 'Unbekanntes Paket.' }, { status: 400 })

  const env = getWorkerEnv()
  const price = env[pack.priceEnvKey]
  if (!price) {
    return NextResponse.json({ error: 'Für dieses Paket ist kein Preis hinterlegt.' }, { status: 503 })
  }

  try {
    const customer = await existingCustomer(user.id)
    const origin = new URL(request.url).origin

    const session = await stripePost<{ url?: string }>('/checkout/sessions', {
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/dashboard?guthaben=aufgeladen`,
      cancel_url: `${origin}/dashboard?guthaben=abgebrochen`,
      // The account and the package are stamped onto the session, because the
      // webhook that credits the balance sees the session and nothing else. The
      // package id rather than the number of credits: the amount is looked up
      // from the tariff at redemption, so it can never be dictated from outside.
      metadata: { supabase_user_id: user.id, package: pack.id },
      client_reference_id: user.id,
      // Reusing the customer keeps one person from collecting a new Stripe
      // customer on every top-up. In payment mode Stripe creates none unless
      // asked, and without one there is no receipt history to point anyone at.
      ...(customer ? { customer } : { customer_email: user.email, customer_creation: 'always' }),
      allow_promotion_codes: true,
    })

    if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert.')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'stripe_checkout_failed',
      package: pack.id,
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return NextResponse.json({ error: 'Die Bezahlseite konnte nicht geöffnet werden.' }, { status: 502 })
  }
}
