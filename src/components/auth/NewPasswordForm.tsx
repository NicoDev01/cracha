'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from "next/navigation";
import { Link, useAppLocale, useRouter } from "@/i18n/navigation";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react' // Shield available for future use

const copy = {
  de: {
    tooShort: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    mismatch: 'Die Passwörter stimmen nicht überein.',
    failed: 'Fehler beim Aktualisieren des Passworts',
    preparing: 'Bereite Passwort-Reset vor...',
    moment: 'Einen Moment bitte',
    reload: 'Seite neu laden',
    doneTitle: 'Passwort erfolgreich geändert',
    doneSubtitle: 'Dein Passwort wurde erfolgreich aktualisiert',
    redirecting: 'Du wirst automatisch zur Anmeldung weitergeleitet...',
    signIn: 'Jetzt anmelden',
    title: 'Neues Passwort festlegen',
    subtitle: 'Wähle ein sicheres neues Passwort für deinen Account',
    newPassword: 'Neues Passwort',
    newPlaceholder: 'Mindestens 6 Zeichen',
    confirm: 'Passwort bestätigen',
    confirmPlaceholder: 'Passwort wiederholen',
    hidePassword: 'Passwort verbergen',
    showPassword: 'Passwort anzeigen',
    updating: 'Passwort wird aktualisiert...',
    update: 'Passwort aktualisieren',
    back: '← Zurück zur Anmeldung',
  },
  en: {
    tooShort: 'The password must be at least 6 characters long.',
    mismatch: 'The passwords do not match.',
    failed: 'Could not update the password',
    preparing: 'Preparing password reset...',
    moment: 'One moment please',
    reload: 'Reload page',
    doneTitle: 'Password changed',
    doneSubtitle: 'Your password has been updated',
    redirecting: 'You’ll be taken to the sign-in page automatically...',
    signIn: 'Sign in now',
    title: 'Set a new password',
    subtitle: 'Choose a secure new password for your account',
    newPassword: 'New password',
    newPlaceholder: 'At least 6 characters',
    confirm: 'Confirm password',
    confirmPlaceholder: 'Repeat password',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    updating: 'Updating password...',
    update: 'Update password',
    back: '← Back to sign-in',
  },
} as const

export function NewPasswordForm() {
  const t = copy[useAppLocale()]
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
      setError(t.tooShort)
      return
    }

    if (password !== confirmPassword) {
      setError(t.mismatch)
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
      setError(error instanceof Error ? error.message : t.failed)
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
            <p className="text-gray-600 mb-4">{t.preparing}</p>
            <p className="text-sm text-gray-500 mb-6">{t.moment}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="text-sm"
            >
              {t.reload}
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
            {t.doneTitle}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {t.doneSubtitle}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              {t.redirecting}
            </p>
          </div>
          
          <Link href="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {t.signIn}
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
          {t.title}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {t.subtitle}
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
              {t.newPassword}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t.newPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
              {t.confirm}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t.confirmPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
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
                {t.updating}
              </>
            ) : (
              t.update
            )}
          </Button>
        </form>
        
        {/* Back to Login */}
        <div className="text-center">
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
          >
            {t.back}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}