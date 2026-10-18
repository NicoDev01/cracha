import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { Suspense } from 'react'

import { NewPasswordForm } from '@/components/auth/NewPasswordForm'
import type { Locale } from "@/i18n/routing"
import { noIndex } from "@/lib/seo"
import { LightOnly } from '@/lib/theme/use-light-only'

const meta = {
  de: { title: "Neues Passwort", description: "Lege ein neues Passwort für dein CraCha-Konto fest.", tagline: "Frag die Website." },
  en: { title: "New password", description: "Set a new password for your CraCha account.", tagline: "Ask the website." },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password/new-password">): Promise<Metadata> {
  const t = meta[(await params).locale as Locale]
  return { ...noIndex, title: t.title, description: t.description }
}

export default async function NewPasswordPage({ params }: PageProps<"/[locale]/reset-password/new-password">) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* This page sits outside the (auth) group, so it needs the guard itself. */}
      <LightOnly />
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CraCha</h1>
              <p className="text-sm text-gray-600">{meta[locale].tagline}</p>
            </div>
          </div>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <NewPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
