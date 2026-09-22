'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import { clearAuthCookies } from '@/lib/auth/clear-auth-cookies'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  created_at: string
}

/** The same mapping was written out at every place a session appears. */
function authUserFromSession(user: User): AuthUser {
  const email = user.email ?? ''
  return {
    id: user.id,
    email,
    name: user.user_metadata?.name || email.split('@')[0] || 'User',
    avatar: user.user_metadata?.avatar_url
      || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    created_at: user.created_at,
  }
}

interface AuthState {
  user: AuthUser | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  
  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

const supabase = createClient()

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('Authentifizierung hat das Zeitlimit überschritten.')),
      timeoutMs
    )

    promise.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading to prevent hydration mismatch
      error: null,
      isInitialized: false,
      
      initialize: async () => {
        set({ isLoading: true })
        
        try {
          // Check if Supabase is properly configured
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
            console.warn('Supabase not configured - skipping auth initialization')
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              isInitialized: true
            })
            return
          }
          
          const { data: claimsData, error: claimsError } = await withTimeout(
            supabase.auth.getClaims(),
            5_000
          )
          
          if (claimsError || !claimsData?.claims?.sub) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
            clearAuthCookies()
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              isInitialized: true
            })
            return
          }

          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            set({
              user: authUserFromSession(session.user),
              session,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isInitialized: true
            })
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              isInitialized: true
            })
          }
          
          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            if (event !== 'SIGNED_OUT' && session?.user) {
              set({
                user: authUserFromSession(session.user),
                session,
                isAuthenticated: true,
                error: null
              })
            } else {
              set({
                user: null,
                session: null,
                isAuthenticated: false,
                error: null
              })
            }
          })
          
        } catch (error) {
          console.error('Auth initialization error:', error)
          clearAuthCookies()
          set({ 
            error: null,
            isLoading: false,
            isInitialized: true,
            isAuthenticated: false,
            user: null,
            session: null,
          })
        }
      },
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) {
            // Better error messages
            let errorMessage = error.message
            if (error.message.includes('Invalid login credentials')) {
              errorMessage = 'E-Mail oder Passwort ist falsch. Bitte überprüfe deine Eingaben.'
            } else if (error.message.includes('Email not confirmed')) {
              errorMessage = 'Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte prüfe dein Postfach.'
            } else if (error.message.includes('Too many requests')) {
              errorMessage = 'Zu viele Anmeldeversuche. Bitte warte einen Moment und versuche es erneut.'
            }
            throw new Error(errorMessage)
          }
          
          // Set the session here rather than waiting for onAuthStateChange.
          // The form pushes to /dashboard the moment this resolves, and the
          // guard there reads isAuthenticated. Leaving that to a listener that
          // fires a tick later meant the guard often saw a signed-out store and
          // bounced back to /login — the reason a correct password sometimes
          // had to be entered twice.
          const session = data.session
          if (!session?.user) throw new Error('Anmeldung fehlgeschlagen.')

          set({
            user: authUserFromSession(session.user),
            session,
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
            error: null,
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen'
          set({ 
            error: errorMessage,
            isLoading: false 
          })
          throw error
        }
      },
      
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name
              },
              // Was undefined, which does not disable anything — it makes
              // Supabase fall back to the project's Site URL. That is how a
              // confirmation link sent from cracha-app.com ended up pointing at
              // localhost. The link now comes back to the site the user is on.
              emailRedirectTo: `${window.location.origin}/confirm?next=/dashboard`,
            }
          })
          
          if (error) {
            // Better error messages
            let errorMessage = error.message
            if (error.message.includes('already registered')) {
              errorMessage = 'Ein Account mit dieser E-Mail-Adresse existiert bereits.'
            } else if (error.message.includes('invalid email')) {
              errorMessage = 'Bitte gib eine gültige E-Mail-Adresse ein.'
            } else if (error.message.includes('password')) {
              errorMessage = 'Das Passwort ist zu schwach. Mindestens 6 Zeichen erforderlich.'
            }
            throw new Error(errorMessage)
          }
          
          // Supabase reports an already-confirmed account by returning a user
          // with no identities rather than an error, so that case has to be
          // read off the response instead of caught.
          if (data.user && data.user.identities?.length === 0) {
            throw new Error('Ein Account mit dieser E-Mail-Adresse existiert bereits.')
          }

          // Which of the two messages is true depends on whether the project
          // requires confirmation, and the response says so: a session comes
          // back only when it does not.
          set({
            error: data.session
              ? 'Registrierung erfolgreich! Du kannst dich jetzt anmelden.'
              : `Fast geschafft! Wir haben dir eine E-Mail an ${email} geschickt. Bestätige den Link darin, dann kannst du dich anmelden.`,
            isLoading: false
          })

          // Don't throw error for successful registration

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registrierung fehlgeschlagen'
          set({ 
            error: errorMessage,
            isLoading: false 
          })
          throw error
        }
      },
      
      loginWithGoogle: async () => {
        set({ isLoading: true, error: null })

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            }
          })

          if (error) {
            throw error
          }

          // OAuth redirect will handle the rest
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Google login failed',
            isLoading: false 
          })
          throw error
        }
      },
      
      logout: async () => {
        set({ isLoading: true })

        try {
          const { error } = await supabase.auth.signOut({ scope: 'local' })

          if (error) {
            console.warn('Logout error (continuing anyway):', error)
          }

          clearAuthCookies()
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          })

        } catch (error) {
          // Even if logout fails, clear local state
          clearAuthCookies()
          set({
            error: error instanceof Error ? error.message : 'Logout failed',
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },
      
      clearError: () => {
        set({ error: null })
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'cracha-auth',
      partialize: () => ({
        // Only persist user data, never authentication status
        // This forces re-authentication on every session
        user: null, // Don't persist user to force proper auth check
        isAuthenticated: false // Never persist auth status
      })
    }
  )
)
