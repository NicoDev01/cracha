'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase ist nicht konfiguriert.')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
    const { data, error } = await supabase.auth.getUser()
    return error ? null : data.user
  } catch {
    return null
  }
}

export async function getAuthenticatedSession() {
  const supabase = await createClient()
  const [{ data: userData, error: userError }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])
  if (userError || !userData.user || !sessionData.session?.access_token) return null
  return { user: userData.user, accessToken: sessionData.session.access_token }
}

export async function requireAuth(): Promise<string> {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error('Authentifizierung erforderlich.')
  return user.id
}
