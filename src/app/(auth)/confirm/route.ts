import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeAuthNext } from '@/lib/supabase/redirect'

const EMAIL_TYPES: readonly string[] = ['email', 'signup', 'recovery', 'invite', 'email_change']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = safeAuthNext(searchParams.get('next'))

  try {
    const supabase = await createClient()
    if (tokenHash && type && EMAIL_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })
      if (!error) return NextResponse.redirect(new URL(next, origin))
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(new URL(next, origin))
    }
  } catch {
    // Tokens and authorization codes must never enter logs, even as prefixes.
    console.error(JSON.stringify({ event: 'auth_confirmation_failed' }))
  }
  return NextResponse.redirect(new URL('/auth-code-error', origin))
}
