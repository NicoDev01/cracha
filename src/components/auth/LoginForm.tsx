'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { GoogleAuthButton } from './GoogleAuthButton'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Handle retry messages from PKCE failures
  useEffect(() => {
    const retry = searchParams.get('retry')
    const message = searchParams.get('message')
    
    if (retry === 'pkce' && message) {
      setRetryMessage(decodeURIComponent(message))
      // Clear URL parameters
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await login(formData.email, formData.password)
      router.push('/dashboard')
    } catch {
      // Error is handled by the store
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Don't clear error immediately - let user read it
  }

  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Willkommen zurück
        </CardTitle>
        <CardDescription className="text-gray-600">
          Melde dich an, um auf dein CraCha Dashboard zuzugreifen
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Google Auth Button */}
        <GoogleAuthButton />

        {/* Divider */}
        <div className="relative" role="separator" aria-label="Oder mit E-Mail">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Oder mit E-Mail</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {(error || retryMessage) && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error || retryMessage}</span>
            </div>
          )}
          
          {/* PKCE Retry Info */}
          {retryMessage && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Google OAuth Retry</p>
                <p>Dies kann beim ersten Versuch passieren. Bitte versuche es erneut.</p>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              E-Mail-Adresse
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="deine@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Passwort
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Dein Passwort"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anmeldung läuft...
              </>
            ) : (
              'Anmelden'
            )}
          </Button>
        </form>

        {/* Forgot Password Link */}
        <div className="text-center">
          <Link
            href="/reset-password"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Passwort vergessen?
          </Link>
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Noch kein Account?{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
            >
              Jetzt registrieren
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Zurück zur Startseite
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}