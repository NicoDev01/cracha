'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cache for the client to avoid recreation in serverless environments
let cachedClient: ReturnType<typeof createServerClient> | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30 seconds

export async function createClient() {
  try {
    // Check cache validity
    if (cachedClient && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedClient
    }

    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase environment variables not properly configured')
      throw new Error('Missing or invalid Supabase environment variables')
    }

    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })

    // Cache the client
    cachedClient = client
    cacheTimestamp = Date.now()
    
    return client
  } catch (error) {
    console.error('Failed to create Supabase server client:', error)
    // Clear cache on error
    cachedClient = null
    throw error
  }
}

/**
 * Get the authenticated user from the server-side session
 * Returns null if not authenticated
 * Includes retry logic for serverless environments
 */
export async function getAuthenticatedUser() {
  let retries = 2
  
  while (retries > 0) {
    try {
      // Check if Supabase is configured before attempting to create client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
        console.warn('Supabase not configured - returning null user')
        return null
      }

      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.warn('Supabase auth error:', error.message)
        return null
      }
      
      return user
    } catch (error) {
      console.error(`Error getting authenticated user (retries left: ${retries - 1}):`, error)
      retries--
      
      if (retries > 0) {
        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      
      return null
    }
  }
  
  return null
}

/**
 * Verify that the request is authenticated and extract user ID
 * Throws an error if not authenticated
 */
export async function requireAuth(): Promise<string> {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      throw new Error('Authentication required. Please log in to access this resource.')
    }
    
    return user.id
  } catch (error) {
    console.error('Authentication required:', error)
    throw new Error('Authentication required. Please log in to access this resource.')
  }
}