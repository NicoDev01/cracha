import type { Metadata } from "next"
import { noIndex } from "@/lib/seo"
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  ...noIndex,
  title: "Passwort zurücksetzen",
  description: "Fordere einen Link zum Zurücksetzen deines Passworts an.",
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}