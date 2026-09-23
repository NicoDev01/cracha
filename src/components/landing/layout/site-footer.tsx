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
 * The logo column carries no prose. Two paragraphs used to sit here for
 * Google's OAuth branding review — what the app does, and which Google fields
 * it receives. The second one is still on /datenschutz, which the review form
 * links to directly; the first is what the hero says.
 *
 * There is deliberately no product column: Chat, Crawl and Datenbanken live
 * behind the login, and listing them on the public page promised more than
 * a visitor could reach — and crowded out the legal links that do belong
 * here.
 */
export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn("border-t bg-background", className)}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-full flex flex-col items-start md:col-span-2">
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
        </div>
        <div>
          <Link href="/" className="text-sm font-medium text-foreground transition-colors hover:text-foreground">Startseite</Link>
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
              <Link href="/#kosten" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Kosten & Fragen
              </Link>
            </li>
            <li>
              <Link href="/website-mit-ki-durchsuchen" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Anleitung
              </Link>
            </li>
            <li>
              <Link href="/kundenwebsite-durchsuchen" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Für Agenturen
              </Link>
            </li>
            <li>
              <Link href="/dokumentation-durchsuchen" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Für Entwickler
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
            <li>
              <Link href="/widerrufsbelehrung" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Widerrufsbelehrung
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}