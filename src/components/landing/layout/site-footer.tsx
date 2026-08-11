import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The section links are written as "/#features" rather than "#features". This
 * footer also renders on /impressum, /datenschutz and /nutzungsbedingungen,
 * where a bare fragment points at an anchor that does not exist on the page —
 * the link did nothing, and none of the link equity from those pages reached
 * the landing page.
 *
 * The two paragraphs under the logo exist for Google's OAuth branding review,
 * which asks the home page for three separate things: what the app is called,
 * what it does, and why it wants the user data it asks for. The hero covers
 * the first two, but in marketing voice and split across a headline and a
 * paragraph. The first paragraph here is the plain version of that. The second
 * answers the third question, which nothing else on the site answered: it
 * names the three fields Google hands us, what they are used for, and what
 * does not happen with them. Both sit in the footer, so they are on every
 * public page a reviewer might open rather than only on the landing page.
 */
export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn("border-t bg-background", className)}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-14 sm:px-6 md:grid-cols-5 lg:px-8">
        <div className="col-span-full flex flex-col items-start gap-6 md:col-span-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo/logo.svg"
              alt="CraCha"
              width={185}
              height={45}
              className="dark:hidden"
            />
            <Image
              src="/images/logo/logo-dark.svg"
              alt="CraCha"
              width={185}
              height={45}
              className="hidden dark:block"
            />
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">CraCha</strong> liest
            eine komplette Website samt aller Unterseiten ein und macht daraus
            eine durchsuchbare Wissensdatenbank. Du stellst Fragen im Chat und
            bekommst Antworten mit Link auf die Seite, aus der sie stammen. Zum
            Anmelden nutzt CraCha deine E-Mail-Adresse oder dein Google-Konto.
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Meldest du dich über Google an, erhält CraCha aus deinem Google-Konto
            ausschließlich deinen Namen, deine E-Mail-Adresse und dein
            Profilbild. Diese Angaben dienen allein dazu, dein CraCha-Konto
            anzulegen und dich beim nächsten Besuch wiederzuerkennen. Weitere
            Daten fragt CraCha nicht ab, und es werden keine Daten an Dritte
            verkauft oder für Werbung genutzt. Einzelheiten stehen in der{" "}
            <Link
              href="/datenschutz"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
        <div>
          <Link href="/" className="text-sm font-medium text-foreground transition-colors hover:text-foreground">Home</Link>
          <ul className="mt-4 list-none space-y-3">
            <li>
              <Link href="/#how-to-use" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Nutzung
              </Link>
            </li>
            <li>
              <Link href="/#why-cracha" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Warum CraCha?
              </Link>
            </li>
            <li>
              <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="/#canvas-section" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Jetzt loslegen
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-foreground transition-colors hover:text-foreground">Dashboard</Link>
          <ul className="mt-4 list-none space-y-3">
            <li>
              <Link href="/dashboard/chat" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Chat
              </Link>
            </li>
            <li>
              <Link href="/dashboard/crawl" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Crawl
              </Link>
            </li>
            <li>
              <Link href="/dashboard/data" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Datenbanken
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">Rechtliches</span>
          <ul className="mt-4 list-none space-y-3">
            <li>
              <Link href="/impressum" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Impressum
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Datenschutz
              </Link>
            </li>
            <li>
              <Link href="/nutzungsbedingungen" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Nutzungsbedingungen
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}