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
 * The line under the logo names the product and says what it does in one
 * sentence. Google's OAuth branding review asks for the app's purpose to be
 * stated on the home page and for the name there to match the consent screen;
 * the hero does both, but it does it in marketing voice and split across a
 * headline and a paragraph. This is the plain version, and because it sits in
 * the footer it is on every public page a reviewer might open.
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
              width={150}
              height={150}
              className="dark:hidden"
            />
            <Image
              src="/images/logo/logo-dark.svg"
              alt="CraCha"
              width={150}
              height={150}
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