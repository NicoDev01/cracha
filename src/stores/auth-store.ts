'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
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
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

          if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
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

          // First try to get session (less strict than getUser)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            console.log('Session error (expected if no session):', sessionError.message)
            // This is expected if user is not logged in
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

          if (session?.user) {
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              avatar: session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
              plan: 'free', // Default plan
              created_at: session.user.created_at
            }

            set({
              user: authUser,
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
            if (event === 'SIGNED_IN' && session?.user) {
              const authUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                avatar: session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                plan: 'free',
                created_at: session.user.created_at
              }

              set({
                user: authUser,
                session,
                isAuthenticated: true,
                error: null
              })
            } else if (event === 'SIGNED_OUT') {
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
          set({
            error: error instanceof Error ? error.message : 'Authentication failed',
            isLoading: false
          })
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const { error } = await supabase.auth.signInWithPassword({
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

          // User state will be updated by onAuthStateChange
          set({ isLoading: false })

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
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name
              },
              emailRedirectTo: undefined // Disable email confirmation
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

          // Registration successful - show success message
          set({
            error: 'Registrierung erfolgreich! Nach Bestätigung deiner E-Mail-Adresse kannst du dich jetzt anmelden.',
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
          console.log('🔄 Starting Google OAuth flow...')

          // Clear any existing problematic cookies before starting
          document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('auth-token-code-verifier')) {
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              console.log('🧹 Cleared old code verifier cookie:', name);
            }
          });

          // Determine correct redirect URL based on environment
          const currentOrigin = window.location.origin
          const isWranglerDev = currentOrigin.includes('localhost:8787')
          const isProduction = window.location.hostname.includes('workers.dev') || window.location.hostname.includes('aimpact-agency')
          
          let redirectUrl: string
          if (isWranglerDev) {
            // Wrangler dev - Direct to localhost:8787
            redirectUrl = 'http://localhost:8787/auth/callback'
          } else if (isProduction) {
            // Production - HTTPS Workers domain
            redirectUrl = 'https://cracha.aimpact-agency.workers.dev/auth/callback'
          } else {
            // Next.js dev - HTTP localhost
            redirectUrl = `${currentOrigin}/auth/callback`
          }

          console.log('🔗 Using redirect URL:', redirectUrl)
          console.log('🌍 Environment detection:', { 
            currentOrigin, 
            isWranglerDev, 
            isProduction, 
            hostname: window.location.hostname,
            port: window.location.port 
          })

          // Cloudflare Workers PKCE-optimierte Konfiguration
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
                // Cloudflare Workers spezifische Parameter
                response_type: 'code'
              },
              // Optimiert für serverless/edge Umgebungen
              skipBrowserRedirect: false,
              scopes: 'openid email profile'
            }
          })

          if (error) {
            console.error('❌ Google OAuth initiation error:', error)
            
            // Spezielle Behandlung für Workers-spezifische Fehler
            if (error.message.includes('code verifier') || error.message.includes('PKCE')) {
              set({ 
                error: 'Google OAuth Fehler. Dies kann beim ersten Versuch passieren - bitte versuche es erneut.',
                isLoading: false 
              })
            } else {
              set({ 
                error: error.message || 'Google Anmeldung fehlgeschlagen',
                isLoading: false 
              })
            }
            throw error
          }

          console.log('✅ Google OAuth initiated successfully:', data)
          // OAuth redirect will handle the rest - don't set loading to false here

        } catch (error) {
          console.error('❌ Google login error:', error)
          set({
            error: error instanceof Error ? error.message : 'Google Anmeldung fehlgeschlagen',
            isLoading: false
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          const { error } = await supabase.auth.signOut()

          if (error) {
            throw error
          }

          // User state will be updated by onAuthStateChange
          set({ isLoading: false })

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Logout failed',
            isLoading: false
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