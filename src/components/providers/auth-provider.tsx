'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const initialize = useAuthStore((state) => state.initialize)

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

  // Prevent hydration mismatch by only rendering on client
  if (!isClient) {
    return <>{children}</>
  }

  return <>{children}</>
}