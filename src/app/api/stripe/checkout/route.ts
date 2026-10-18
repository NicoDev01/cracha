import { NextRequest, NextResponse } from 'next/server'

import { getWorkerEnv } from '@/lib/server/cloudflare'
import { admitRequest, existingCustomer, findPackage } from '@/lib/server/credits'
import { stripeGet, stripePost } from '@/lib/server/stripe'
import { reconcileCheckout } from '@/lib/server/payment-reconciliation'
import { PURCHASE_CONSENT, PURCHASE_TERMS_VERSION } from '@/lib/purchase-consent'
import { localizePath } from '@/i18n/paths'
import { localeFromRequest, say } from '@/i18n/request-locale'
import type { Locale } from '@/i18n/routing'
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
  const body = (await request.json().catch(() => null)) as { package?: unknown; acceptTerms?: unknown; locale?: unknown } | null
  // The dialog says which language the buyer read the consent in.
  const locale: Locale = body?.locale === 'en' || body?.locale === 'de' ? body.locale : localeFromRequest(request)
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: say(locale, 'Authentifizierung erforderlich.', 'Please sign in.') }, { status: 401 })

  const pack = findPackage(body?.package)
  if (!pack) return NextResponse.json({ error: say(locale, 'Unbekanntes Paket.', 'Unknown pack.') }, { status: 400 })

  if (body?.acceptTerms !== true) return NextResponse.json({ error: say(locale, 'Bitte bestätige die Nutzungsbedingungen und den gewünschten sofortigen Leistungsbeginn.', 'Please confirm the terms of use and the immediate start of the service.') }, { status: 400 })

  const env = getWorkerEnv()
  const price = env[pack.priceEnvKey]
  if (!price) {
    return NextResponse.json({ error: say(locale, 'Für dieses Paket ist kein Preis hinterlegt.', 'No price is set up for this pack.') }, { status: 503 })
  }

  try {
    if (!(await admitRequest(user.id, 'checkout', 5, 60))) return NextResponse.json({ error: say(locale, 'Bitte warte kurz vor dem nächsten Versuch.', 'Please wait a moment before trying again.') }, { status: 429 })
    const configuredPrice = await stripeGet<{ active: boolean; currency: string; unit_amount: number; tax_behavior: string }>(`/prices/${encodeURIComponent(price)}`)
    if (!configuredPrice.active || configuredPrice.currency !== 'eur' || configuredPrice.unit_amount !== pack.priceCents || configuredPrice.tax_behavior !== 'inclusive') throw new Error('Stripe-Preis muss dem Bruttotarif entsprechen (EUR, inklusive Steuer).')
    const customer = await existingCustomer(user.id)
    const origin = new URL(request.url).origin

    const session = await stripePost<{ url?: string }>('/checkout/sessions', {
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}${localizePath('/dashboard', locale)}?guthaben=aufgeladen&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${localizePath('/dashboard', locale)}?guthaben=abgebrochen`,
      // The account and the package are stamped onto the session, because the
      // webhook that credits the balance sees the session and nothing else. The
      // package id rather than the number of credits: the amount is looked up
      // from the tariff at redemption, so it can never be dictated from outside.
      metadata: { supabase_user_id: user.id, package: pack.id, terms_version: PURCHASE_TERMS_VERSION, accepted_at: new Date().toISOString(), immediate_start: 'true', consent_text: PURCHASE_CONSENT[locale], consent_locale: locale },
      client_reference_id: user.id,
      // Reusing the customer keeps one person from collecting a new Stripe
      // customer on every top-up. In payment mode Stripe creates none unless
      // asked, and without one there is no receipt history to point anyone at.
      ...(customer ? { customer, customer_update: { address: 'auto' } } : { customer_email: user.email, customer_creation: 'always' }),

      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      locale,
      invoice_creation: { enabled: true, invoice_data: { footer: say(locale, 'Auf Wunsch sofortiger Leistungsbeginn. Das gesetzliche Widerrufsrecht bleibt bestehen. Nutzungsbedingungen: https://cracha-app.com/nutzungsbedingungen — Widerruf: https://cracha-app.com/widerrufsbelehrung', 'Service started immediately on request. The statutory right of withdrawal remains. Terms of use: https://cracha-app.com/en/terms — Withdrawal: https://cracha-app.com/en/withdrawal') } },
    })

    if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert.')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'stripe_checkout_failed',
      package: pack.id,
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return NextResponse.json({ error: say(locale, 'Die Bezahlseite konnte nicht geöffnet werden.', 'The payment page could not be opened.') }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  const locale = localeFromRequest(request)
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: say(locale, 'Authentifizierung erforderlich.', 'Please sign in.') }, { status: 401 })
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId || !/^cs_[a-zA-Z0-9_]{10,240}$/.test(sessionId)) return NextResponse.json({ error: say(locale, 'Ungültige Checkout-ID.', 'Invalid checkout ID.') }, { status: 400 })
  try {
    if (!(await admitRequest(user.id, 'checkout-status', 30, 60))) return NextResponse.json({ error: say(locale, 'Bitte warte kurz.', 'Please wait a moment.') }, { status: 429 })
    return NextResponse.json({ status: await reconcileCheckout(sessionId, user.id) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: say(locale, 'Die Zahlung konnte noch nicht bestätigt werden. Bitte prüfe dein Guthaben später erneut.', 'The payment could not be confirmed yet. Please check your balance again later.') }, { status: 502 })
  }
}
