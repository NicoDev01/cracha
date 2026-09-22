'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useCrawlStore } from '@/stores/crawl-store'
import { useMounted } from '@/hooks/use-mounted'

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
          error: 'Authentifizierung konnte nicht geladen werden'
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
