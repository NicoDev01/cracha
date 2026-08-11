import { NextResponse } from 'next/server'

import { getUsage } from '@/lib/server/plan'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * What this account has used and what it is allowed. The interface needs it to
 * show the remaining budget before someone runs into it — the limits are only
 * fair if they are visible in advance.
 */
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 })

  try {
    return NextResponse.json({ success: true, usage: await getUsage(user.id) })
  } catch (error) {
    console.error('Usage lookup failed', error)
    return NextResponse.json({ error: 'Kontingent konnte nicht geladen werden.' }, { status: 503 })
  }
}
