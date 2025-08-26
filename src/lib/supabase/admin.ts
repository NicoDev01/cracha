import { createClient } from '@supabase/supabase-js'

// Lazy initialization of admin client
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    }
    
    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return _supabaseAdmin
}

// Admin client for bypassing RLS and email confirmation
export const supabaseAdmin = (() => {
  try {
    return getSupabaseAdmin()
  } catch (error) {
    // During build time, return a null client to prevent build failures
    console.warn('Supabase admin client not available during build:', error)
    return null
  }
})()

// Helper function to manually confirm user (for development)
export async function confirmUser(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { email_confirm: true }
  )
  
  if (error) {
    console.error('Error confirming user:', error)
    return { error }
  }
  
  return { data }
}