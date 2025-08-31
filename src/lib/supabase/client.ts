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
      detectSessionInUrl: true,
      // PKCE Konfiguration für Cloudflare Workers
      flowType: 'pkce',
      // Cookie-Konfiguration für Cross-Origin
      storage: {
        getItem: (key: string) => {
          if (typeof window !== 'undefined') {
            return window.localStorage.getItem(key)
          }
          return null
        },
        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value)
          }
        },
        removeItem: (key: string) => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key)
          }
        }
      }
    },
    // Cloudflare Workers Cookie-Konfiguration
    cookies: {
      get: (name: string) => {
        if (typeof document !== 'undefined') {
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
          return value || null
        }
        return null
      },
      set: (name: string, value: string, options: Record<string, unknown> = {}) => {
        if (typeof document !== 'undefined') {
          let cookieString = `${name}=${value}`
          
          // Cloudflare Workers optimierte Cookie-Optionen
          const cookieOptions = {
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'lax', // Weniger restriktiv als 'none'
            ...options
          }
          
          Object.entries(cookieOptions).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              cookieString += `; ${key}=${val}`
            }
          })
          
          document.cookie = cookieString
          console.log('🍪 Cookie set for Workers:', name, cookieOptions)
        }
      },
      remove: (name: string, _options: Record<string, unknown> = {}) => {
        if (typeof document !== 'undefined') {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          console.log('🗑️ Cookie removed:', name)
        }
      }
    }
  })
}