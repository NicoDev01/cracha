'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      environment: process.env.NODE_ENV || 'unknown'
    })
    
    // Throw error in production to avoid silent failures
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase configuration is required in production')
    }
    
    console.warn('⚠️ Using placeholder Supabase client for development')
    // Return a mock client for development when Supabase is not configured
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