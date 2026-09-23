import { NextRequest, NextResponse } from 'next/server'

import { isAccountDeletionConfirmed } from '@/lib/account-deletion'
import { AccountDeletionError, accountIsGone, deleteAccount } from '@/lib/server/account-deletion'
import { admitRequest } from '@/lib/server/credits'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Deletes the signed-in account. Only ever the caller's own: the user id comes
 * from the verified session, never from the body. Safe to call again after any
 * failure — and after success, which answers success once more.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ success: false, error: 'Authentifizierung erforderlich.' }, { status: 401 })

  // JSON only: a cross-site form can post text/plain that happens to parse as
  // JSON, but it cannot send this content type without a CORS preflight.
  const isJson = request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ?? false
  const body = isJson ? ((await request.json().catch(() => null)) as { confirm?: unknown } | null) : null
  if (!isAccountDeletionConfirmed(body?.confirm)) {
    return NextResponse.json({ success: false, error: 'Bitte bestätige die Löschung mit dem Wort LÖSCHEN.' }, { status: 400 })
  }

  let admitted: boolean
  try {
    admitted = await admitRequest(user.id, 'account_delete', 5, 3600)
  } catch {
    // request_limits references the auth user, so this fails once the account
    // is gone. A repeated request after success must not look like an error.
    if (await accountIsGone(user.id).catch(() => false)) return NextResponse.json({ success: true })
    return NextResponse.json({ success: false, error: 'Kontolöschung ist gerade nicht möglich. Bitte versuche es später erneut.' }, { status: 503 })
  }
  if (!admitted) {
    return NextResponse.json({ success: false, error: 'Zu viele Versuche. Bitte warte eine Weile und versuche es dann erneut.' }, { status: 429 })
  }

  try {
    await deleteAccount(user.id)
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error(JSON.stringify({ event: 'account_deletion_failed', userId: user.id, error: String(error) }))
    return NextResponse.json(
      { success: false, error: 'Kontolöschung konnte nicht abgeschlossen werden. Dein Konto wurde nicht gelöscht. Bitte versuche es erneut.' },
      { status: 500 },
    )
  }

  console.info(JSON.stringify({ event: 'account_deleted', userId: user.id }))
  return NextResponse.json({ success: true })
}
