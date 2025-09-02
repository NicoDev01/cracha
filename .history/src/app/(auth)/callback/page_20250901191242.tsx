'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'

function CallbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') || '/dashboard'

      console.log('🔄 Client-side callback processing:', { code: code?.substring(0, 8) + '...', next })

      try {
        const supabase = createClient()

        // For PKCE flow, we need to handle the session from the URL
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Session retrieval failed:', error)
          setStatus('error')
          setError(error.message)
          return
        }

        if (data.session) {
          console.log('✅ Session found, authentication successful')
          setStatus('success')

          // Redirect after successful auth
          setTimeout(() => {
            router.push(next)
          }, 1000)
        } else if (code) {
          // Fallback: try to exchange code for session
          console.log('🔄 Attempting code exchange as fallback...')
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('❌ Code exchange failed:', exchangeError)
            setStatus('error')
            setError(exchangeError.message)
            return
          }

          console.log('✅ Code exchange successful')
          setStatus('success')

          setTimeout(() => {
            router.push(next)
          }, 1000)
        } else {
          console.error('❌ No session or code found')
          setStatus('error')
          setError('No authentication data found')
        }

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
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-12 px-8">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentifizierung läuft...
            </h2>
            <p className="text-gray-600">
              Du wirst gleich weitergeleitet
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'success') {
    return (
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-12 px-8">
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
      <CardContent className="py-12 px-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
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
      </CardContent>
    </Card>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-12 px-8">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
          </div>
        </CardContent>
      </Card>
    }>
      <CallbackPageContent />
    </Suspense>
  )
}