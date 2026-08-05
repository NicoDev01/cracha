'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const initialize = useAuthStore((state) => state.initialize)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    setIsClient(true)
    
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
