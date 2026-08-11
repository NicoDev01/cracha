'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase ist nicht konfiguriert.')
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write cookies; middleware refreshes sessions.
        }
      },
    },
  })
}

export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()
    const id = data?.claims?.sub
    if (error || typeof id !== 'string') return null
    // The address comes along for Stripe: handing it to Checkout means the
    // customer is created against the address the account already proved,
    // instead of whatever gets typed into the payment form.
    const email = data?.claims?.email
    return { id, email: typeof email === 'string' ? email : undefined }
  } catch {
    return null
  }
}
