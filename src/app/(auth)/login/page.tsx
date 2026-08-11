import type { Metadata } from "next"
import { noIndex } from "@/lib/seo"
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  ...noIndex,
  title: "Anmelden",
  description: "Melde dich bei CraCha an.",
}

export default function LoginPage() {
  return <LoginForm />
}