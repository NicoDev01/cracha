import { NextRequest, NextResponse } from 'next/server'

import { billingAdmin, existingCustomer } from '@/lib/server/billing'
import { stripePost } from '@/lib/server/stripe'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Cancelling, changing the card, downloading invoices: all of it happens in
 * Stripe's own portal. Building any of that here would mean holding payment
 * data that Stripe already holds, and getting the cancellation rules right a
 * second time.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  try {
    const customer = await existingCustomer(billingAdmin(), user.id)
    if (!customer) {
      return NextResponse.json({ error: 'Für dieses Konto gibt es noch kein Abo.' }, { status: 404 })
    }

    const session = await stripePost<{ url?: string }>('/billing_portal/sessions', {
      customer,
      return_url: `${new URL(request.url).origin}/dashboard`,
    })
    if (!session.url) throw new Error('Stripe hat keine Portal-URL geliefert.')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'stripe_portal_failed',
      error: error instanceof Error ? error.message : 'unknown',
    }))
    return NextResponse.json({ error: 'Die Abo-Verwaltung konnte nicht geöffnet werden.' }, { status: 502 })
  }
}
