import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('🔄 Confirm route params:', { token_hash: token_hash?.substring(0, 8) + '...', type, code: code?.substring(0, 8) + '...', next })

  if (token_hash && type) {
    // Handle token_hash + type flow (traditional email confirmation)
    console.log('📧 Processing token_hash + type flow')
    const supabase = await createClient()
    
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email',
      token_hash,
    })
    
    if (!error) {
      console.log('✅ Token verification successful')
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('❌ Token verification failed:', error)
    }
  } else if (code) {
    // Handle code flow (password reset with exchangeCodeForSession)
    console.log('🔐 Processing code flow')
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('✅ Code exchange successful')
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('❌ Code exchange failed:', error)
    }
  }

  // Return the user to an error page with instructions
  console.log('🚫 No valid authentication parameters found')
  return NextResponse.redirect(`${origin}/auth-code-error`)
}