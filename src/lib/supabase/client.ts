'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const environment = process.env.NODE_ENV || 'unknown'
    const isBuildTime = typeof window === 'undefined' && environment === 'production'
    
    console.warn('⚠️ Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      environment,
      isBuildTime
    })
    
    // Only throw error at runtime in production, not during build time
    if (environment === 'production' && !isBuildTime && typeof window !== 'undefined') {
      throw new Error('Supabase configuration is required in production')
    }
    
    console.warn('⚠️ Using placeholder Supabase client for build/development')
    // Return a mock client when Supabase is not configured
    return createBrowserClient(
      'https://placeholder.supabase.co', 
      'placeholder-anon-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )
  }

  console.log('✅ Supabase client initialized:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyLength: supabaseAnonKey.length
  })

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}