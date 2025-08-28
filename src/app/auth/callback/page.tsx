'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      const next = searchParams.get('next') || '/dashboard'
      
      console.log('🔄 Callback processing:', { code: code?.substring(0, 8) + '...', token_hash: token_hash?.substring(0, 8) + '...', type, next })

      if (!code && !token_hash) {
        console.error('❌ No authentication parameters found')
        setStatus('error')
        setError('Missing authentication parameters')
        return
      }

      try {
        const supabase = createClient()
        let authResult
        
        if (token_hash && type) {
          // Handle token_hash + type flow (email confirmation, password reset)
          console.log('🔍 Using token_hash + type flow')
          authResult = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'email' | 'signup' | 'recovery' | 'email_change'
          })
        } else if (code) {
          // Handle code flow (OAuth, etc.)
          console.log('🔍 Using code flow')
          authResult = await supabase.auth.exchangeCodeForSession(code)
        } else {
          throw new Error('Invalid authentication parameters')
        }

        if (authResult.error) {
          console.error('❌ Authentication failed:', authResult.error)
          setStatus('error')
          setError(authResult.error.message)
          return
        }

        console.log('✅ Authentication successful, redirecting to:', next)
        setStatus('success')
        
        // Redirect after successful auth
        setTimeout(() => {
          router.push(next)
        }, 1000)

      } catch (err) {
        console.error('❌ Callback processing error:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentifizierung läuft...
          </h2>
          <p className="text-gray-600">
            Du wirst gleich weitergeleitet
          </p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erfolgreich authentifiziert!
          </h2>
          <p className="text-gray-600">
            Du wirst weitergeleitet...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <div className="text-center">
        <div className="h-12 w-12 text-red-600 mx-auto mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentifizierung fehlgeschlagen
        </h2>
        <p className="text-gray-600 mb-6">
          {error || 'Ein unbekannter Fehler ist aufgetreten'}
        </p>
        <button
          onClick={() => router.push('/login')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Zur Anmeldung
        </button>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <CallbackPageContent />
    </Suspense>
  )
}