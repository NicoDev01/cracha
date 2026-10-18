import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"

import { LoginForm } from '@/components/auth/LoginForm'
import type { Locale } from "@/i18n/routing"
import { noIndex } from "@/lib/seo"

const meta = {
  de: { title: "Anmelden", description: "Melde dich bei CraCha an." },
  en: { title: "Sign in", description: "Sign in to CraCha." },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] }
}

export default async function Page({ params }: PageProps<"/[locale]/login">) {
  setRequestLocale((await params).locale as Locale)
  return <LoginForm />
}
