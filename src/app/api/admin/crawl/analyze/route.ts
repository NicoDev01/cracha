import { NextRequest, NextResponse } from 'next/server'

import { analyzeSite } from '@/lib/server/crawler-api'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null
  if (!body || typeof body.url !== 'string') {
    return NextResponse.json({ success: false, error: 'url ist erforderlich.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ success: true, analysis: await analyzeSite(body.url) })
  } catch (error) {
    console.error('Site analysis failed', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Die Website konnte nicht analysiert werden.' },
      { status: 502 },
    )
  }
}
