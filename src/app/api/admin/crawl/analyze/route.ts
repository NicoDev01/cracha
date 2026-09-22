import { NextRequest, NextResponse } from 'next/server'

import { admitRequest } from '@/lib/server/credits'
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
    if (!(await admitRequest(user.id, 'analyze', 6, 60))) return NextResponse.json({ success: false, error: 'Bitte warte eine Minute vor der nächsten Analyse.' }, { status: 429, headers: { 'Retry-After': '60' } })
    return NextResponse.json({ success: true, analysis: await analyzeSite(body.url) })
  } catch (error) {
    console.error('Site analysis failed', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Die Website konnte nicht analysiert werden.' },
      { status: 502 },
    )
  }
}
