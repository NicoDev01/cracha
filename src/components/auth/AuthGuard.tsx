'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, isInitialized, initialize } = useAuthStore()

  useEffect(() => {
    // Initialize auth store on component mount
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  useEffect(() => {
    // Only redirect after auth has been initialized and we're not loading
    if (isInitialized && !isLoading && !isAuthenticated) {
      console.log('🔒 User not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, isInitialized, router])

  // Show loading state while checking authentication
  if (!isInitialized || isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">
            Überprüfe Anmeldung...
          </p>
        </div>
      </div>
    )
  }

  // Show loading state while redirecting
  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">
            Weiterleitung zur Anmeldung...
          </p>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}

// Higher-order component version for easier use
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard fallback={fallback}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}