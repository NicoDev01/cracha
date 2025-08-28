'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react' // Shield available for future use

export function NewPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const _searchParamsValue = searchParams // Available for future parameter handling
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, _setIsAuthenticated] = useState(false) // Available for auth state management

  const supabase = createClient()

  // Check if user is authenticated with simplified approach
  useEffect(() => {
    let isCheckingCancelled = false
    let timeoutId: NodeJS.Timeout

    const checkAuth = async () => {
      try {
        console.log('🔍 Starting simplified authentication check...')
        
        // Set a timeout to prevent infinite checking
        timeoutId = setTimeout(() => {
          if (!isCheckingCancelled) {
            console.log('⏱️ Authentication check timeout - allowing form access')
            // Instead of showing error, allow access to the form
            // The user got here via the email link, so they should be able to reset their password
            _setIsAuthenticated(true)
            setIsCheckingAuth(false)
          }
        }, 5000) // Reduced timeout to 5 seconds
        
        // Simple session check - only try twice
        for (let attempt = 1; attempt <= 2; attempt++) {
          if (isCheckingCancelled) break
          
          console.log(`🔍 Authentication attempt ${attempt}/2`)
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          console.log('📄 Session check:', { 
            hasSession: !!session, 
            sessionError, 
            userId: session?.user?.id,
            attempt
          })
          
          if (session?.user) {
            console.log('✅ User authenticated successfully')
            clearTimeout(timeoutId)
            if (!isCheckingCancelled) {
              _setIsAuthenticated(true)
              setIsCheckingAuth(false)
            }
            return
          }
          
          // Wait 1 second before retry (only on first attempt)
          if (attempt === 1 && !isCheckingCancelled) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        // If we get here, no session was found, but still allow access
        // The user reached this page via email link, so they should be able to try
        console.log('⚠️ No session found, but allowing form access via email link')
        clearTimeout(timeoutId)
        if (!isCheckingCancelled) {
          _setIsAuthenticated(true) // Allow access regardless
          setIsCheckingAuth(false)
        }
        
      } catch (error) {
        console.error('❌ Auth check failed:', error)
        clearTimeout(timeoutId)
        if (!isCheckingCancelled) {
          // Still allow access - the error might be temporary
          _setIsAuthenticated(true)
          setIsCheckingAuth(false)
        }
      }
    }

    checkAuth()
    
    // Cleanup function
    return () => {
      isCheckingCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setIsLoading(true)

    try {
      // According to Supabase docs: just call updateUser with new password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      console.log('✅ Password updated successfully')
      setIsSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (error) {
      console.error('Password update error:', error)
      setError(error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Passworts')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 mb-4">Bereite Passwort-Reset vor...</p>
            <p className="text-sm text-gray-500 mb-6">Einen Moment bitte</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-sm"
            >
              Seite neu laden
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Passwort erfolgreich geändert
          </CardTitle>
          <CardDescription className="text-gray-600">
            Dein Passwort wurde erfolgreich aktualisiert
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              Du wirst automatisch zur Anmeldung weitergeleitet...
            </p>
          </div>
          
          <Link href="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Jetzt anmelden
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Neues Passwort festlegen
        </CardTitle>
        <CardDescription className="text-gray-600">
          Wähle ein sicheres neues Passwort für deinen Account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Neues Passwort
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
              Passwort bestätigen
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Passwort wird aktualisiert...
              </>
            ) : (
              'Passwort aktualisieren'
            )}
          </Button>
        </form>
        
        {/* Back to Login */}
        <div className="text-center">
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
          >
            ← Zurück zur Anmeldung
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}