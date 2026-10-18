'use client'

import { useState } from 'react'
import { Link, useAppLocale } from "@/i18n/navigation";
import { localizePath } from "@/i18n/paths";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const copy = {
  de: {
    failed: 'Ein Fehler ist aufgetreten',
    sentTitle: 'E-Mail gesendet',
    sentSubtitle: 'Wir haben dir einen Link zum Zurücksetzen deines Passworts gesendet',
    sentText: 'Prüfe dein E-Mail-Postfach und klicke auf den Link, um dein Passwort zurückzusetzen. Der Link ist 1 Stunde gültig.',
    back: 'Zurück zur Anmeldung',
    noMail: 'Keine E-Mail erhalten?',
    again: 'Erneut senden',
    title: 'Passwort zurücksetzen',
    subtitle: 'Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten',
    email: 'E-Mail-Adresse',
    emailPlaceholder: 'deine@email.com',
    sending: 'Link wird gesendet...',
    send: 'Reset-Link senden',
  },
  en: {
    failed: 'Something went wrong',
    sentTitle: 'Email sent',
    sentSubtitle: 'We’ve sent you a link to reset your password',
    sentText: 'Check your inbox and click the link to reset your password. The link is valid for 1 hour.',
    back: 'Back to sign-in',
    noMail: 'Didn’t get an email?',
    again: 'Send again',
    title: 'Reset password',
    subtitle: 'Enter your email address to receive a reset link',
    email: 'Email address',
    emailPlaceholder: 'you@example.com',
    sending: 'Sending link...',
    send: 'Send reset link',
  },
} as const

export function ResetPasswordForm() {
  const locale = useAppLocale()
  const t = copy[locale]
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/confirm?next=${localizePath('/reset-password/new-password', locale)}`
      })
      
      if (error) {
        throw error
      }
      
      setIsSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.failed)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t.sentTitle}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {t.sentSubtitle}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              {t.sentText}
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.back}
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t.noMail}{' '}
              <button 
                onClick={() => setIsSuccess(false)}
                className="text-blue-600 hover:underline"
              >
                {t.again}
              </button>
            </p>
          </div>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="email"
                required
              />
            </div>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.sending}
              </>
            ) : (
              t.send
            )}
          </Button>
        </form>
        
        {/* Back to Login */}
        <div className="text-center">
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
          >
            ← {t.back}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
