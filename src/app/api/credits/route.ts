import { NextResponse } from 'next/server'

import { CREDIT_PACKAGES, getCreditState, recentEntries } from '@/lib/server/credits'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Balance, what it buys, and the last movements. The interface needs all three
 * to show what is left before someone runs out rather than at the moment a
 * crawl is refused — and prepaid credits are only fair if the price of the next
 * action is visible before it is taken.
 */
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  try {
    const [state, entries] = await Promise.all([
      getCreditState(user.id),
      recentEntries(user.id),
    ])
    return NextResponse.json({
      success: true,
      credits: state,
      entries,
      packages: CREDIT_PACKAGES.map(({ id, credits, priceCents, label }) => ({ id, credits, priceCents, label })),
    })
  } catch (error) {
    console.error('Credit lookup failed', error)
    return NextResponse.json({ error: 'Guthaben konnte nicht geladen werden.' }, { status: 503 })
  }
}
