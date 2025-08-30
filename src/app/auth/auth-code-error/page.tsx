'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

function AuthCodeErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'flow_state_not_found':
        return 'OAuth Flow-Status nicht gefunden. Möglicherweise ist die Sitzung abgelaufen.'
      case 'server_error':
        return 'Server-Fehler bei der Authentifizierung.'
      case 'exchange_failed':
        return 'Code-Austausch fehlgeschlagen. Bitte versuche es erneut.'
      case 'no_code':
        return 'Kein Authentifizierungscode erhalten.'
      case 'no_auth_params':
        return 'Keine gültigen Authentifizierungsparameter erhalten.'
      case 'auth_failed':
        return 'Authentifizierung fehlgeschlagen. Token möglicherweise abgelaufen.'
      case 'no_session':
        return 'Keine Sitzung erstellt. Bitte versuche es erneut.'
      default:
        return 'Ein unbekannter Fehler ist aufgetreten.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Authentifizierung fehlgeschlagen
          </CardTitle>
          <CardDescription className="text-gray-600">
            Es gab ein Problem bei der Anmeldung mit Google
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Fehlerdetails:</h3>
            <p className="text-sm text-red-700 mb-3">
              {getErrorMessage(error)}
            </p>
            {error && (
              <p className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                Error Code: {error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/login')}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Erneut versuchen
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full h-12"
            >
              Zur Startseite
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Problem weiterhin vorhanden?{' '}
              <a 
                href="mailto:support@cracha.com" 
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Kontaktiere den Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}