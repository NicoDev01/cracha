'use client'

import { createBrowserClient } from '@supabase/ssr'

// Environment variables for Cloudflare Workers
function getEnvVar(key: string): string | undefined {
  // Try process.env first (Node.js/dev mode)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key]
  }
  
  // Fallback to hardcoded values for Cloudflare Workers
  const envVars: Record<string, string> = {
    'NEXT_PUBLIC_SUPABASE_URL': 'https://ncfrgsqfnccjfyezxjsj.supabase.co',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk'
  }
  
  return envVars[key]
}

export function createClient() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')!
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')!

  console.log('✅ Supabase client initialized for Cloudflare Workers:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyLength: supabaseAnonKey.length,
    runtime: typeof process !== 'undefined' ? 'Node.js' : 'Cloudflare Workers'
  })

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}