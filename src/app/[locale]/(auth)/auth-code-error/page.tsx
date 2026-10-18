import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { AlertCircle, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { siteConfig } from "@/config/site"
import { bilingual } from "@/i18n/copy"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { noIndex } from "@/lib/seo"

const copy = bilingual(
  {
    title: "Anmeldung fehlgeschlagen",
    description: "Die Anmeldung konnte nicht abgeschlossen werden.",
    lead: "Es gab ein Problem bei der Anmeldung oder der Bestätigung deiner E-Mail-Adresse.",
    causes: "Mögliche Ursachen:",
    reasons: ["Der Link oder Anmeldecode ist abgelaufen", "Die Anmeldung wurde abgebrochen", "Ein technischer Fehler ist aufgetreten"],
    back: "Zurück zur Anmeldung",
    home: "Zur Startseite",
    help: "Probleme? Schreib uns an",
  },
  {
    title: "Sign-in failed",
    description: "The sign-in could not be completed.",
    lead: "There was a problem signing you in or confirming your email address.",
    causes: "Possible causes:",
    reasons: ["The link or sign-in code has expired", "The sign-in was cancelled", "A technical error occurred"],
    back: "Back to sign-in",
    home: "Back to the home page",
    help: "Having trouble? Email us at",
  },
)

export async function generateMetadata({ params }: PageProps<"/[locale]/auth-code-error">): Promise<Metadata> {
  const t = copy[(await params).locale as Locale]
  return { ...noIndex, title: t.title, description: t.description }
}

export default async function AuthCodeErrorPage({ params }: PageProps<"/[locale]/auth-code-error">) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const t = copy[locale]
  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">{t.title}</CardTitle>
        <CardDescription className="text-gray-600">{t.lead}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">{t.causes}</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {t.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>

        <div className="space-y-3">
          <Link href="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full">{t.home}</Button>
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {t.help}{' '}
            <a href={`mailto:${siteConfig.mailSupport}`} className="text-blue-600 hover:underline">{siteConfig.mailSupport}</a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
