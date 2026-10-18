'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from "next/navigation";
import { useAppLocale, useRouter } from "@/i18n/navigation";

const copy = {
  de: {
    signInFailed: (code: string) => `Anmeldung fehlgeschlagen (${code}).`,
    noData: 'Keine Anmeldedaten gefunden.',
    failed: 'Anmeldung fehlgeschlagen.',
    processing: 'Anmeldung läuft...',
    redirectSoon: 'Du wirst gleich weitergeleitet',
    success: 'Erfolgreich angemeldet!',
    redirecting: 'Du wirst weitergeleitet...',
    errorTitle: 'Anmeldung fehlgeschlagen',
    unknown: 'Ein unbekannter Fehler ist aufgetreten',
    toLogin: 'Zur Anmeldung',
    loading: 'Wird geladen...',
  },
  en: {
    signInFailed: (code: string) => `Sign-in failed (${code}).`,
    noData: 'No sign-in data found.',
    failed: 'Sign-in failed.',
    processing: 'Signing you in...',
    redirectSoon: 'You’ll be redirected in a moment',
    success: 'Signed in!',
    redirecting: 'Redirecting...',
    errorTitle: 'Sign-in failed',
    unknown: 'An unknown error occurred',
    toLogin: 'Go to sign-in',
    loading: 'Loading...',
  },
} as const
import { createClient } from '@/lib/supabase/client'
import { safeAuthNext } from '@/lib/supabase/redirect'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { useLightOnly } from '@/lib/theme/use-light-only'

/**
 * Reads a failure that Supabase reported by redirecting here.
 *
 * A rejected provider handshake arrives as `?error=…&error_description=…`, and
 * for implicit-flow failures the same pair sits in the URL fragment instead,
 * where `useSearchParams` cannot see it. Reading only the query made every
 * provider-side failure show "no authentication data" — which sounds like a
 * missing redirect and says nothing about, say, a client secret Google refused.
 * The query is preferred because the fragment copy is encoded twice.
 */
function readProviderError(searchParams: URLSearchParams, t: (typeof copy)[keyof typeof copy]): string | null {
  const fragment = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, ''),
  )
  const pick = (key: string) => searchParams.get(key) ?? fragment.get(key)

  const description = pick('error_description')
  const code = pick('error_code') ?? pick('error')
  if (!description && !code) return null
  if (!description) return t.signInFailed(code ?? '')
  return code ? `${description} (${code})` : description
}

function CallbackPageContent() {
  const router = useRouter()
  const t = copy[useAppLocale()]
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const providerError = readProviderError(searchParams, t)
      if (providerError) {
        setStatus('error')
        setError(providerError)
        return
      }

      const code = searchParams.get('code')
      const next = safeAuthNext(searchParams.get('next'))

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
          setError(t.noData)
        }

      } catch (err) {
        console.error('❌ Callback processing error:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : t.failed)
      }
    }

    handleCallback()
  }, [searchParams, router, t])

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardContent className="flex items-center justify-center py-12 px-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t.processing}
              </h2>
              <p className="text-gray-600">
                {t.redirectSoon}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardContent className="flex items-center justify-center py-12 px-8">
            <div className="text-center">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t.success}
              </h2>
              <p className="text-gray-600">
                {t.redirecting}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardContent className="py-12 px-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t.errorTitle}
            </h2>
            <p className="text-gray-600 mb-6">
              {error || t.unknown}
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {t.toLogin}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CallbackPage() {
  const t = copy[useAppLocale()]
  // Outside the (auth) group, so the light guard has to be applied here.
  useLightOnly()

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardContent className="flex items-center justify-center py-12 px-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t.loading}
              </h2>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <CallbackPageContent />
    </Suspense>
  )
}
