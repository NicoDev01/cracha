'use client'

import { useEffect } from 'react'
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from '@/stores/auth-store'
import { useCrawlStore } from '@/stores/crawl-store'
import { useMounted } from '@/hooks/use-mounted'
import { currentLocale } from '@/i18n/client-locale'
import { createClient } from '@/lib/supabase/client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isClient = useMounted()
  const router = useRouter()
  const initialize = useAuthStore((state) => state.initialize)
  const logout = useAuthStore((state) => state.logout)
  const userId = useAuthStore((state) => state.user?.id)
  const claimCrawlHistory = useCrawlStore((state) => state.claimFor)

  useEffect(() => {
    // Initialize auth with error handling
    const initAuth = async () => {
      try {
        await initialize()
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Set initialized to true even if failed, to prevent infinite loading
        useAuthStore.setState({ 
          isInitialized: true, 
          isLoading: false,
          error: currentLocale() === 'en' ? 'Sign-in could not be loaded' : 'Anmeldung konnte nicht geladen werden'
        })
      }
    }
    
    initAuth()
  }, [initialize])

  // The locally stored crawl history belongs to whoever is signed in. As soon
  // as that is somebody else, it goes.
  useEffect(() => {
    if (userId) claimCrawlHistory(userId)
  }, [userId, claimCrawlHistory])

  // Mails the site sends later (the activation reminder) use the language the
  // account last used here. Written once per session and language, not on
  // every page view.
  useEffect(() => {
    if (!userId) return
    const locale = currentLocale()
    const marker = `cracha-locale-synced:${userId}`
    try {
      if (sessionStorage.getItem(marker) === locale) return
    } catch {
      // Storage blocked: one extra metadata write is harmless.
    }
    void createClient().auth.updateUser({ data: { locale } }).then(({ error }) => {
      if (error) return
      try { sessionStorage.setItem(marker, locale) } catch { /* see above */ }
    })
  }, [userId])

  useEffect(() => {
    const handleExpiredSession = async () => {
      await logout()
      router.replace('/login?reason=session-expired')
    }
    window.addEventListener('cracha:auth-expired', handleExpiredSession)
    return () => window.removeEventListener('cracha:auth-expired', handleExpiredSession)
  }, [logout, router])

  // Prevent hydration mismatch by only rendering on client
  if (!isClient) {
    return <>{children}</>
  }

  return <>{children}</>
}
