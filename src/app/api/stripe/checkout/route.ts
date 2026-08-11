import { NextRequest, NextResponse } from 'next/server'

import { billingAdmin, existingCustomer } from '@/lib/server/billing'
import { getWorkerEnv } from '@/lib/server/cloudflare'
import { stripePost } from '@/lib/server/stripe'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Opens Stripe's hosted checkout and hands back the URL to send the browser to.
 * Card details never touch this application: the page they are typed into is
 * Stripe's, on Stripe's domain.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const env = getWorkerEnv()
  if (!env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: 'Es ist kein Tarif hinterlegt.' }, { status: 503 })
  }

  try {
    const admin = billingAdmin()
    const customer = await existingCustomer(admin, user.id)
    const origin = new URL(request.url).origin

    const session = await stripePost<{ url?: string }>('/checkout/sessions', {
      mode: 'subscription',
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/dashboard?abo=aktiv`,
      cancel_url: `${origin}/dashboard?abo=abgebrochen`,
      // The account is stamped onto the subscription itself, not just onto the
      // checkout: subscription events arrive for years afterwards, and the
      // checkout session is long gone by then.
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
      client_reference_id: user.id,
      // Reusing the customer keeps one person from collecting a new Stripe
      // customer on every visit to the pricing page.
      ...(customer ? { customer } : { customer_email: user.email }),
      allow_promotion_codes: true,
    })

    if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert.')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'stripe_checkout_failed',
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return NextResponse.json({ error: 'Die Bezahlseite konnte nicht geöffnet werden.' }, { status: 502 })
  }
}
