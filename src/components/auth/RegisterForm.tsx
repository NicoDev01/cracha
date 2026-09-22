'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { GoogleAuthButton } from './GoogleAuthButton'

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com',
  'yopmail.com', 'trashmail.com', 'throwawaymail.com', 'sharklasers.com',
  'dispostable.com', 'getairmail.com', 'fakemailgenerator.com', 'temp-mail.org',
  'burnermail.io', 'dropmail.me', 'guerrillamailblock.com',
])

export function RegisterForm() {
  const { register, isLoading, error, clearError } = useAuthStore()
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const resend = async () => {
    if (resending || cooldown > 0) return
    setResending(true)
    try {
      const { error } = await createClient().auth.resend({
        type: 'signup', email: formData.email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/confirm?next=/dashboard` },
      })
      if (error) throw error
      setConfirmationMessage('Falls eine Bestätigung aussteht, wurde eine neue E-Mail angefordert. Prüfe dein Postfach.')
      setCooldown(60)
    } catch {
      setConfirmationMessage('Die E-Mail konnte gerade nicht erneut angefordert werden. Bitte warte kurz und versuche es noch einmal.')
      setCooldown(60)
    } finally { setResending(false) }
  }
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    
    if (!formData.email.trim()) {
      errors.email = 'E-Mail ist erforderlich'
    } else if (!formData.email.includes('@')) {
      errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein'
    } else {
      const domain = formData.email.split('@')[1]?.toLowerCase().trim()
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        errors.email = 'Wegwerf-E-Mail-Adressen sind nicht gestattet.'
      }
    }
    
    if (!formData.password) {
      errors.password = 'Passwort ist erforderlich'
    } else if (formData.password.length < 6) {
      errors.password = 'Passwort muss mindestens 6 Zeichen lang sein'
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwörter stimmen nicht überein'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    if (!validateForm()) {
      return
    }
    
    try {
      await register(formData.email.trim(), formData.password, formData.name.trim())
      
      // Keep confirmation instructions visible until the visitor chooses to leave.
      setConfirmationMessage(useAuthStore.getState().error || 'Bitte prüfe dein Postfach und bestätige deine E-Mail-Adresse.')
      setFormData(value => ({ ...value, email: value.email.trim() }))
      setRegistrationComplete(true)
      setCooldown(60)
      
    } catch (registrationError) {
      // Only actual errors (not success messages) will reach here
      console.error('Registration error:', registrationError)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (validationErrors[field]) setValidationErrors(prev => ({ ...prev, [field]: '' }))
  }

  const isFormValid = formData.email && formData.password && formData.confirmPassword

  if (registrationComplete) {
    return (
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Dein nächster Schritt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {confirmationMessage}
          </p>
          <p className="text-sm text-gray-600">
            Keine E-Mail gefunden? Prüfe auch den Spam-Ordner. Öffne den Bestätigungslink, bevor du dich anmeldest.
          </p>
          <p className="text-sm break-all">Bestätigungsadresse: {formData.email}</p>
          <Button variant="outline" disabled={resending || cooldown > 0} onClick={() => void resend()}>
            {resending ? 'Wird angefordert…' : cooldown > 0 ? `Erneut senden in ${cooldown} s` : 'Bestätigung erneut senden'}
          </Button>
          <button type="button" className="block text-sm underline" onClick={() => { setRegistrationComplete(false); clearError(); setFormData(value => ({ ...value, password: '', confirmPassword: '' })) }}>
            Mit korrigierter E-Mail-Adresse registrieren
          </button>
          <Link href="/login" className="block font-semibold text-blue-600 hover:underline">
            Weiter zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Account erstellen
        </CardTitle>
        <CardDescription className="text-gray-600">
          Starte mit kostenlosem Testguthaben. Keine Kreditkarte erforderlich.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Google Auth Button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-blue-600 font-medium px-1">
            <span>⚡ Empfohlen</span>
            <span>Sofortiger Zugriff</span>
          </div>
          <GoogleAuthButton isRegister />
        </div>
        
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
          {/* Error/Success Message */}
          {error && (
            <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
              error.includes('erfolgreich') 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error.includes('erfolgreich') ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 font-medium">
              Name (optional)
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="Max Mustermann"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="name"
                maxLength={100}
              />
            </div>
            {validationErrors.name && (
              <p className="text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>
          
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
            {validationErrors.email && (
              <p className="text-sm text-red-600">{validationErrors.email}</p>
            )}
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
                placeholder="Mindestens 6 Zeichen"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-600">{validationErrors.password}</p>
            )}
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
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Passwortbestätigung verbergen' : 'Passwortbestätigung anzeigen'}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="text-sm text-red-600">{validationErrors.confirmPassword}</p>
            )}
          </div>
          
          {/* Terms & Privacy */}
          <div className="flex items-start space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>
              Mit der Registrierung stimmst du unseren{' '}
              <Link href="/nutzungsbedingungen" className="text-blue-600 hover:underline">
                Nutzungsbedingungen
              </Link>{' '}
              zu. Informationen zur Datenverarbeitung findest du in der{' '}
              <Link href="/datenschutz" className="text-blue-600 hover:underline">
                Datenschutzerklärung
              </Link>{' '}
              .
            </p>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Account wird erstellt...
              </>
            ) : (
              'Account erstellen'
            )}
          </Button>
        </form>
        
        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Bereits ein Account?{' '}
            <Link 
              href="/login" 
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
            >
              Jetzt anmelden
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
