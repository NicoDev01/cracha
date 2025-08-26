import { createClient } from '@supabase/supabase-js'

// Admin client for bypassing RLS and email confirmation
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

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