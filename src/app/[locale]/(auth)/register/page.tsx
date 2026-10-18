import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"

import { RegisterForm } from '@/components/auth/RegisterForm'
import type { Locale } from "@/i18n/routing"
import { noIndex } from "@/lib/seo"

const meta = {
  de: { title: "Registrieren", description: "Lege dein CraCha-Konto an." },
  en: { title: "Sign up", description: "Create your CraCha account." },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/register">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] }
}

export default async function Page({ params }: PageProps<"/[locale]/register">) {
  setRequestLocale((await params).locale as Locale)
  return <RegisterForm />
}
