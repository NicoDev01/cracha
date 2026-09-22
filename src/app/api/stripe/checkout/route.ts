import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { admitRequest, existingCustomer, findPackage } from '@/lib/server/credits'
import { stripeGet, stripePost } from '@/lib/server/stripe'
import { reconcileCheckout } from '@/lib/server/payment-reconciliation'
import { PURCHASE_CONSENT_TEXT, PURCHASE_TERMS_VERSION } from '@/lib/purchase-consent'
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

  const body = (await request.json().catch(() => null)) as { package?: unknown; acceptTerms?: unknown } | null
  const pack = findPackage(body?.package)
  if (!pack) return NextResponse.json({ error: 'Unbekanntes Paket.' }, { status: 400 })

  if (body?.acceptTerms !== true) return NextResponse.json({ error: 'Bitte bestätige die Nutzungsbedingungen und den gewünschten sofortigen Leistungsbeginn.' }, { status: 400 })

  const env = getWorkerEnv()
  const price = env[pack.priceEnvKey]
  if (!price) {
    return NextResponse.json({ error: 'Für dieses Paket ist kein Preis hinterlegt.' }, { status: 503 })
  }

  try {
    if (!(await admitRequest(user.id, 'checkout', 5, 60))) return NextResponse.json({ error: 'Bitte warte kurz vor dem nächsten Versuch.' }, { status: 429 })
    const configuredPrice = await stripeGet<{ active: boolean; currency: string; unit_amount: number; tax_behavior: string }>(`/prices/${encodeURIComponent(price)}`)
    if (!configuredPrice.active || configuredPrice.currency !== 'eur' || configuredPrice.unit_amount !== pack.priceCents || configuredPrice.tax_behavior !== 'inclusive') throw new Error('Stripe-Preis muss dem Bruttotarif entsprechen (EUR, inklusive Steuer).')
    const customer = await existingCustomer(user.id)
    const origin = new URL(request.url).origin

    const session = await stripePost<{ url?: string }>('/checkout/sessions', {
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/dashboard?guthaben=aufgeladen&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?guthaben=abgebrochen`,
      // The account and the package are stamped onto the session, because the
      // webhook that credits the balance sees the session and nothing else. The
      // package id rather than the number of credits: the amount is looked up
      // from the tariff at redemption, so it can never be dictated from outside.
      metadata: { supabase_user_id: user.id, package: pack.id, terms_version: PURCHASE_TERMS_VERSION, accepted_at: new Date().toISOString(), immediate_start: 'true', consent_text: PURCHASE_CONSENT_TEXT },
      client_reference_id: user.id,
      // Reusing the customer keeps one person from collecting a new Stripe
      // customer on every top-up. In payment mode Stripe creates none unless
      // asked, and without one there is no receipt history to point anyone at.
      ...(customer ? { customer, customer_update: { address: 'auto' } } : { customer_email: user.email, customer_creation: 'always' }),

      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      locale: 'de',
      invoice_creation: { enabled: true, invoice_data: { footer: 'Auf Wunsch sofortiger Leistungsbeginn. Das gesetzliche Widerrufsrecht bleibt bestehen. Nutzungsbedingungen: https://cracha-app.com/nutzungsbedingungen — Widerruf: https://cracha-app.com/widerrufsbelehrung' } },
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

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId || !/^cs_[a-zA-Z0-9_]{10,240}$/.test(sessionId)) return NextResponse.json({ error: 'Ungültige Checkout-ID.' }, { status: 400 })
  try {
    if (!(await admitRequest(user.id, 'checkout-status', 30, 60))) return NextResponse.json({ error: 'Bitte warte kurz.' }, { status: 429 })
    return NextResponse.json({ status: await reconcileCheckout(sessionId, user.id) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Die Zahlung konnte noch nicht bestätigt werden. Bitte prüfe dein Guthaben später erneut.' }, { status: 502 })
  }
}
