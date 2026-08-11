import type { Metadata } from "next"
import { noIndex } from "@/lib/seo"
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  ...noIndex,
  title: "Registrieren",
  description: "Lege dein CraCha-Konto an.",
}

export default function RegisterPage() {
  return <RegisterForm />
}