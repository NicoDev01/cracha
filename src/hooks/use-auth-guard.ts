'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export function useAuthGuard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { 
    user, 
    isAuthenticated, 
    isLoading,
    isReady: !isLoading && isAuthenticated
  }
}