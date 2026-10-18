import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import type { Locale } from "@/i18n/routing"
import { noIndex } from "@/lib/seo"

const meta = {
  de: { title: "Passwort zurücksetzen", description: "Fordere einen Link zum Zurücksetzen deines Passworts an." },
  en: { title: "Reset password", description: "Request a link to reset your password." },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] }
}

export default async function Page({ params }: PageProps<"/[locale]/reset-password">) {
  setRequestLocale((await params).locale as Locale)
  return <ResetPasswordForm />
}
