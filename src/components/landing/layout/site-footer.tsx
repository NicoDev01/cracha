"use client";

import Image from "next/image";

import { bilingual } from "@/i18n/copy";
import { Link, useAppLocale } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const copy = bilingual(
  {
    home: "Startseite",
    product: [
      { title: "Nutzung", href: "/#how-to-use" },
      { title: "Beispiele", href: "/beispiele" },
      { title: "Warum CraCha?", href: "/#why-cracha" },
      { title: "Preise", href: "/preise" },
      { title: "Häufige Fragen", href: "/#fragen" },
      { title: "Anleitung", href: "/website-mit-ki-durchsuchen" },
      { title: "Blog", href: "/blog" },
    ],
    legal: "Rechtliches",
    legalLinks: [
      { title: "Impressum", href: "/impressum" },
      { title: "Datenschutz", href: "/datenschutz" },
      { title: "Nutzungsbedingungen", href: "/nutzungsbedingungen" },
      { title: "Widerrufsbelehrung", href: "/widerrufsbelehrung" },
    ],
  },
  {
    home: "Home",
    product: [
      { title: "How it works", href: "/#how-to-use" },
      { title: "Examples", href: "/beispiele" },
      { title: "Why CraCha?", href: "/#why-cracha" },
      { title: "Pricing", href: "/preise" },
      { title: "FAQ", href: "/#fragen" },
      { title: "Guide", href: "/website-mit-ki-durchsuchen" },
      { title: "Blog", href: "/blog" },
    ],
    legal: "Legal",
    legalLinks: [
      { title: "Legal notice", href: "/impressum" },
      { title: "Privacy policy", href: "/datenschutz" },
      { title: "Terms of use", href: "/nutzungsbedingungen" },
      { title: "Right of withdrawal", href: "/widerrufsbelehrung" },
    ],
  },
);

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
  const t = copy[useAppLocale()];
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
          <Link href="/" className="text-sm font-medium text-foreground transition-colors hover:text-foreground">{t.home}</Link>
          <ul className="mt-4 list-none space-y-3">
            {t.product.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">{t.legal}</span>
          <ul className="mt-4 list-none space-y-3">
            {t.legalLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}