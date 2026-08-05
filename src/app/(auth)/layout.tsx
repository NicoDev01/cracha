'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isInitialized, error, initialize } = useAuthStore()
  const [showTimeout, setShowTimeout] = useState(false)
  const pathname = usePathname()
  
  // Allow callback and confirm routes to render immediately without waiting for auth
  const isAuthCallbackRoute = pathname?.includes('/callback') || pathname?.includes('/confirm')

  useEffect(() => {
    if (!isAuthCallbackRoute && !isInitialized) {
      void initialize()
    }
  }, [initialize, isAuthCallbackRoute, isInitialized])

  // Show timeout message after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        setShowTimeout(true)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [isInitialized])

  // Skip auth check for callback routes
  if (isAuthCallbackRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CraCha</h1>
                <p className="text-sm text-gray-600">RAG-as-a-Service</p>
              </div>
            </div>
          </div>
          
          {children}
        </div>
      </div>
    )
  }

  // Show loading only if not initialized yet
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">
            {showTimeout ? 'Authentifizierung dauert länger als erwartet...' : 'Authentifizierung wird überprüft...'}
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {showTimeout && (
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Seite neu laden
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CraCha</h1>
              <p className="text-sm text-gray-600">RAG-as-a-Service</p>
            </div>
          </div>
        </div>
        
        {children}
      </div>
    </div>
  )
}
