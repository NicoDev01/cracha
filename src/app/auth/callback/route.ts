import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const error = searchParams.get('error')
    const next = searchParams.get('next') ?? '/dashboard'

    console.log('🔄 Auth callback received:', { 
      code: code?.substring(0, 8) + '...', 
      token_hash: token_hash?.substring(0, 8) + '...', 
      type, 
      error, 
      origin,
      fullUrl: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    })

  // Simple test endpoint
  if (searchParams.get('test') === 'true') {
    console.log('✅ Test callback route working')
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Callback route is working',
      timestamp: new Date().toISOString(),
      origin,
      url: request.url
    })
  }

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error from provider:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}`)
  }

  const supabase = await createClient()
  let authResult

  try {
    if (token_hash && type) {
      // Redirect email-based flows to UI page for better UX
      console.log('🔄 Redirecting email flow to UI page:', type)
      const uiParams = new URLSearchParams({
        token_hash,
        type,
        ...(next !== '/dashboard' && { next })
      })
      return NextResponse.redirect(`${origin}/auth/callback-ui?${uiParams.toString()}`)
    } else if (code) {
      // Handle OAuth code flow directly (Google, etc.)
      console.log('🔍 Processing OAuth code flow')
      console.log('🔍 Request cookies:', request.headers.get('cookie'))
      
      // Debug PKCE code verifier
      const cookies = request.headers.get('cookie') || ''
      const codeVerifierMatch = cookies.match(/sb-[^-]+-auth-token-code-verifier=([^;]+)/)
      const codeVerifier = codeVerifierMatch ? codeVerifierMatch[1] : null
      
      console.log('🔍 PKCE Code Verifier found:', codeVerifier ? 'Yes' : 'No')
      console.log('🔍 Auth Code length:', code.length)
      
      authResult = await supabase.auth.exchangeCodeForSession(code)
      
      if (authResult.error) {
        console.error('❌ OAuth error:', authResult.error)
        
        // Special handling for PKCE errors (Cloudflare Workers specific)
        if (authResult.error.message.includes('code verifier') || 
            authResult.error.message.includes('invalid request') ||
            authResult.error.message.includes('both auth code and code verifier')) {
          
          console.log('🔄 PKCE error detected - Cloudflare Workers cookie issue')
          console.log('🔍 Error details:', authResult.error.message)
          
          // Attempt immediate retry with session cleanup
          try {
            console.log('🔄 Attempting PKCE retry with fresh session...')
            
            // Create fresh Supabase client
            const freshSupabase = await createClient()
            
            // Try exchangeCodeForSession again with fresh client
            const retryResult = await freshSupabase.auth.exchangeCodeForSession(code)
            
            if (!retryResult.error && retryResult.data.session) {
              console.log('✅ PKCE retry successful!')
              return NextResponse.redirect(`${origin}${next}`)
            }
          } catch (retryError) {
            console.log('❌ PKCE retry failed:', retryError)
          }
          
          // If retry fails, redirect to login with helpful message
          const response = NextResponse.redirect(`${origin}/login?retry=pkce&message=${encodeURIComponent('Google OAuth Fehler. Bitte versuche es erneut - dies passiert manchmal beim ersten Versuch.')}`)
          
          // Clear all auth-related cookies
          const cookiesToClear = [
            'sb-ncfrgsqfnccjfyezxjsj-auth-token-code-verifier',
            'sb-placeholder-auth-token-code-verifier',
            'sb-ncfrgsqfnccjfyezxjsj-auth-token',
            'supabase-auth-token'
          ]
          
          cookiesToClear.forEach(cookieName => {
            response.cookies.set(cookieName, '', { 
              expires: new Date(0), 
              path: '/',
              secure: true,
              sameSite: 'lax'
            })
          })
          
          return response
        }
        
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=auth_failed&message=${encodeURIComponent(authResult.error.message)}`)
      }

      if (authResult.data.session) {
      console.log('✅ Session created successfully')
      
      // Determine redirect URL based on environment
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const isWranglerDev = origin.includes('8787')
      
      let redirectUrl: string
      
      if (isWranglerDev) {
        redirectUrl = `http://localhost:8787${next}`
      } else if (isLocalEnv) {
        redirectUrl = `${origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }
      
      console.log('🔗 Redirecting to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
      } else {
        console.error('❌ No session created from OAuth')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_session`)
      }
    } else {
      console.error('❌ No valid auth parameters')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_auth_params`)
    }

  } catch (error) {
    console.error('❌ Auth callback error:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=server_error`)
  }
  } catch (outerError) {
    console.error('❌ Critical callback error:', outerError)
    // Fallback redirect if everything fails
    const fallbackOrigin = request.url.split('/auth/callback')[0]
    return NextResponse.redirect(`${fallbackOrigin}/auth/auth-code-error?error=critical_error`)
  }
}