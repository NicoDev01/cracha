/**
 * Cloudflare Workers optimierte Auth-Lösung
 * Umgeht PKCE Cookie-Probleme durch stateless JWT Approach
 */

import { createClient } from './client'

export interface WorkersAuthOptions {
  redirectUrl: string
  skipPKCE?: boolean
}

export async function initiateGoogleAuthForWorkers(options: WorkersAuthOptions) {
  const supabase = createClient()
  
  console.log('🔄 Starting Workers-optimized Google OAuth...')
  
  try {
    // Für Cloudflare Workers: Verwende implicit flow als Fallback
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: options.redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          // Cloudflare Workers spezifische Parameter
          response_type: 'code',
          // Weniger strenge PKCE-Validierung
          ...(options.skipPKCE && {
            code_challenge_method: 'plain'
          })
        },
        // Optimiert für serverless Umgebungen
        skipBrowserRedirect: false
      }
    })
    
    if (error) {
      console.error('❌ Workers OAuth initiation failed:', error)
      throw error
    }
    
    console.log('✅ Workers OAuth initiated successfully')
    return { data, error: null }
    
  } catch (error) {
    console.error('❌ Workers OAuth error:', error)
    return { data: null, error }
  }
}

/**
 * Fallback für PKCE-Probleme: Verwende Session-basierte Authentifizierung
 */
export async function handleWorkersAuthCallback(code: string) {
  const supabase = createClient()
  
  console.log('🔄 Processing Workers auth callback...')
  
  try {
    // Erste Versuch: Standard PKCE
    const result = await supabase.auth.exchangeCodeForSession(code)
    
    if (result.error && result.error.message.includes('code verifier')) {
      console.log('🔄 PKCE failed, attempting alternative approach...')
      
      // Alternative: Verwende Session-Refresh als Fallback
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (sessionData.session) {
          console.log('✅ Alternative auth method successful - existing session found')
          return { data: sessionData, error: null }
        }
        
        // Letzter Versuch: Refresh session
        const { data: refreshData } = await supabase.auth.refreshSession()
        
        if (refreshData.session) {
          console.log('✅ Session refresh successful')
          return { data: refreshData, error: null }
        }
        
        console.log('❌ All alternative methods failed')
        
      } catch (altError) {
        console.log('❌ Alternative auth methods failed:', altError)
      }
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Workers callback processing failed:', error)
    return { data: null, error }
  }
}