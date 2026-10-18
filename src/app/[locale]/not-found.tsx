import type { Metadata } from "next";

import { SiteShell } from "@/components/landing/layout/site-shell";
import { Button } from "@/components/ui/button";
import { bilingual } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import { getAppLocale } from "@/i18n/server";

// One title for both languages: metadata of a 404 inside a prerendered route
// (an unknown blog slug) is resolved where the page's language is unknown, and
// reading it from the request headers there broke the render with a 500.
// Next adds noindex to 404 responses itself.
export const metadata: Metadata = { title: "Seite nicht gefunden · Page not found" };

const copy = bilingual(
  {
    code: "Fehler 404",
    heading: "Diese Seite gibt es nicht",
    text: "Vielleicht wurde sie verschoben, oder der Link enthält einen Tippfehler.",
    home: "Zur Startseite",
    suggestions: [
      { href: "/website-mit-ki-durchsuchen", label: "Anleitung: Website mit KI durchsuchen" },
      { href: "/beispiele", label: "Beispiele" },
      { href: "/preise", label: "Preise" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    code: "Error 404",
    heading: "This page doesn't exist",
    text: "It may have moved, or the link has a typo.",
    home: "Back to the home page",
    suggestions: [
      { href: "/website-mit-ki-durchsuchen", label: "Guide: search a website with AI" },
      { href: "/beispiele", label: "Examples" },
      { href: "/preise", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
);

export default async function NotFound() {
  const t = copy[await getAppLocale()];
  return (
    <SiteShell>
      <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
        <p className="text-sm font-medium text-muted-foreground">{t.code}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.heading}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{t.text}</p>
        <Button asChild rounded="full" className="mt-8">
          <Link href="/">{t.home}</Link>
        </Button>
        <ul className="mt-10 space-y-2 text-sm">
          {t.suggestions.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="underline underline-offset-4">{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteShell>
  );
}
