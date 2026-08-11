import type { Metadata } from "next"
import { noIndex } from "@/lib/seo"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  ...noIndex,
  title: "Anmeldung fehlgeschlagen",
  description: "Die Anmeldung konnte nicht abgeschlossen werden.",
}

export default function AuthCodeErrorPage() {
  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Anmeldung fehlgeschlagen
        </CardTitle>
        <CardDescription className="text-gray-600">
          Es gab ein Problem bei der Anmeldung mit deinem OAuth-Provider
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Mögliche Ursachen:</h3>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Der Anmeldecode ist abgelaufen</li>
            <li>• Die Anmeldung wurde abgebrochen</li>
            <li>• Ein technischer Fehler ist aufgetreten</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <Link href="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Anmeldung
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline" className="w-full">
              Zur Startseite
            </Button>
          </Link>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Probleme? Kontaktiere unseren{' '}
            <Link href="/support" className="text-blue-600 hover:underline">
              Support
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}