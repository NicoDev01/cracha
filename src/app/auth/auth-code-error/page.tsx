'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  const router = useRouter()

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
            <h3 className="font-semibold text-red-800 mb-2">Mögliche Ursachen:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Die Anmeldung wurde abgebrochen</li>
              <li>• Ungültiger Authentifizierungscode</li>
              <li>• Sitzung ist abgelaufen</li>
              <li>• Konfigurationsproblem</li>
            </ul>
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