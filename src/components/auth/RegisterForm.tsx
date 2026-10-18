'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link, useAppLocale } from "@/i18n/navigation";
import { localizePath } from "@/i18n/paths";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { GoogleAuthButton } from './GoogleAuthButton'

// The store reports a successful sign-up through the same field as errors.
const isSuccess = (message: string) => /erfolgreich|successful/i.test(message)

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com',
  'yopmail.com', 'trashmail.com', 'throwawaymail.com', 'sharklasers.com',
  'dispostable.com', 'getairmail.com', 'fakemailgenerator.com', 'temp-mail.org',
  'burnermail.io', 'dropmail.me', 'guerrillamailblock.com',
])

const copy = {
  de: {
    resent: 'Falls eine Bestätigung aussteht, wurde eine neue E-Mail angefordert. Prüfe dein Postfach.',
    resendFailed: 'Die E-Mail konnte gerade nicht erneut angefordert werden. Bitte warte kurz und versuche es noch einmal.',
    emailRequired: 'E-Mail ist erforderlich',
    emailInvalid: 'Bitte gib eine gültige E-Mail-Adresse ein',
    disposable: 'Wegwerf-E-Mail-Adressen sind nicht gestattet.',
    passwordRequired: 'Passwort ist erforderlich',
    passwordShort: 'Passwort muss mindestens 6 Zeichen lang sein',
    mismatch: 'Passwörter stimmen nicht überein',
    checkInbox: 'Bitte prüfe dein Postfach und bestätige deine E-Mail-Adresse.',
    nextStep: 'Dein nächster Schritt',
    noMail: 'Keine E-Mail gefunden? Prüfe auch den Spam-Ordner. Öffne den Bestätigungslink, bevor du dich anmeldest.',
    address: 'Bestätigungsadresse:',
    requesting: 'Wird angefordert…',
    resendIn: (seconds: number) => `Erneut senden in ${seconds} s`,
    resend: 'Bestätigung erneut senden',
    correct: 'Mit korrigierter E-Mail-Adresse registrieren',
    toLogin: 'Weiter zur Anmeldung',
    title: 'Account erstellen',
    subtitle: 'Starte mit kostenlosem Testguthaben. Keine Kreditkarte erforderlich.',
    instant: 'Sofortiger Zugriff',
    orEmail: 'Oder mit E-Mail',
    name: 'Name (optional)',
    namePlaceholder: 'Max Mustermann',
    email: 'E-Mail-Adresse',
    emailPlaceholder: 'deine@email.com',
    password: 'Passwort',
    passwordPlaceholder: 'Mindestens 6 Zeichen',
    hidePassword: 'Passwort verbergen',
    showPassword: 'Passwort anzeigen',
    confirm: 'Passwort bestätigen',
    confirmPlaceholder: 'Passwort wiederholen',
    hideConfirm: 'Passwortbestätigung verbergen',
    showConfirm: 'Passwortbestätigung anzeigen',
    termsBefore: 'Mit der Registrierung stimmst du unseren',
    terms: 'Nutzungsbedingungen',
    termsMiddle: 'zu. Informationen zur Datenverarbeitung findest du in der',
    privacy: 'Datenschutzerklärung',
    termsAfter: '. Hast du nach 24 Stunden noch keine Website eingelesen, erinnern wir dich einmal per E-Mail; widersprechen kannst du jederzeit.',
    creating: 'Account wird erstellt...',
    haveAccount: 'Bereits ein Account?',
    signIn: 'Jetzt anmelden',
    home: '← Zurück zur Startseite',
  },
  en: {
    resent: 'If a confirmation is pending, a new email has been requested. Check your inbox.',
    resendFailed: 'The email could not be requested again right now. Please wait a moment and try again.',
    emailRequired: 'Email is required',
    emailInvalid: 'Please enter a valid email address',
    disposable: 'Disposable email addresses are not allowed.',
    passwordRequired: 'Password is required',
    passwordShort: 'Password must be at least 6 characters long',
    mismatch: 'Passwords do not match',
    checkInbox: 'Please check your inbox and confirm your email address.',
    nextStep: 'Your next step',
    noMail: 'No email? Check your spam folder too. Open the confirmation link before you sign in.',
    address: 'Confirmation address:',
    requesting: 'Requesting…',
    resendIn: (seconds: number) => `Resend in ${seconds} s`,
    resend: 'Resend confirmation',
    correct: 'Sign up with a corrected email address',
    toLogin: 'Continue to sign-in',
    title: 'Create account',
    subtitle: 'Start with free trial credits. No credit card required.',
    instant: 'Instant access',
    orEmail: 'Or with email',
    name: 'Name (optional)',
    namePlaceholder: 'Jane Doe',
    email: 'Email address',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    confirm: 'Confirm password',
    confirmPlaceholder: 'Repeat password',
    hideConfirm: 'Hide password confirmation',
    showConfirm: 'Show password confirmation',
    termsBefore: 'By signing up you agree to our',
    terms: 'terms of use',
    termsMiddle: '. You can find information on data processing in the',
    privacy: 'privacy policy',
    termsAfter: '. If you haven’t read a website after 24 hours, we’ll remind you once by email; you can object at any time.',
    creating: 'Creating account...',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    home: '← Back to the home page',
  },
} as const

export function RegisterForm() {
  const locale = useAppLocale()
  const t = copy[locale]
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
        options: { emailRedirectTo: `${window.location.origin}/confirm?next=${localizePath('/dashboard', locale)}` },
      })
      if (error) throw error
      setConfirmationMessage(t.resent)
      setCooldown(60)
    } catch {
      setConfirmationMessage(t.resendFailed)
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
      errors.email = t.emailRequired
    } else if (!formData.email.includes('@')) {
      errors.email = t.emailInvalid
    } else {
      const domain = formData.email.split('@')[1]?.toLowerCase().trim()
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        errors.email = t.disposable
      }
    }
    
    if (!formData.password) {
      errors.password = t.passwordRequired
    } else if (formData.password.length < 6) {
      errors.password = t.passwordShort
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t.mismatch
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
      setConfirmationMessage(useAuthStore.getState().error || t.checkInbox)
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
          <CardTitle>{t.nextStep}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {confirmationMessage}
          </p>
          <p className="text-sm text-gray-600">
            {t.noMail}
          </p>
          <p className="text-sm break-all">{t.address} {formData.email}</p>
          <Button variant="outline" disabled={resending || cooldown > 0} onClick={() => void resend()}>
            {resending ? t.requesting : cooldown > 0 ? t.resendIn(cooldown) : t.resend}
          </Button>
          <button type="button" className="block text-sm underline" onClick={() => { setRegistrationComplete(false); clearError(); setFormData(value => ({ ...value, password: '', confirmPassword: '' })) }}>
            {t.correct}
          </button>
          <Link href="/login" className="block font-semibold text-blue-600 hover:underline">
            {t.toLogin}
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
        {/* Google Auth Button */}
        <div className="space-y-1.5">
          <div className="text-right text-xs text-blue-600 font-medium px-1">
            <span>{t.instant}</span>
          </div>
          <GoogleAuthButton isRegister />
        </div>
        
        {/* Divider */}
        <div className="relative" role="separator" aria-label={t.orEmail}>
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">{t.orEmail}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error/Success Message */}
          {error && (
            <div className={`flex items-center space-x-2 p-3 border rounded-lg ${
              isSuccess(error) 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {isSuccess(error) ? (
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
              {t.name}
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder={t.namePlaceholder}
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
              {t.email}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder={t.emailPlaceholder}
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
              {t.password}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t.passwordPlaceholder}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? t.hidePassword : t.showPassword}
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
              {t.confirm}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t.confirmPlaceholder}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? t.hideConfirm : t.showConfirm}
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
              {t.termsBefore}{' '}
              <Link href="/nutzungsbedingungen" className="text-blue-600 hover:underline">
                {t.terms}
              </Link>
              {t.termsMiddle}{' '}
              <Link href="/datenschutz" className="text-blue-600 hover:underline">
                {t.privacy}
              </Link>
              {t.termsAfter}
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
                {t.creating}
              </>
            ) : (
              t.title
            )}
          </Button>
        </form>
        
        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-600">
            {t.haveAccount}{' '}
            <Link 
              href="/login" 
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
            >
              {t.signIn}
            </Link>
          </p>
        </div>
        
        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t.home}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
