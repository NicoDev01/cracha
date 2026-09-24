import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/landing/layout/site-shell";
import { Button } from "@/components/ui/button";

// Next adds noindex to 404 responses itself.
export const metadata: Metadata = {
  title: "Seite nicht gefunden",
};

const suggestions = [
  { href: "/website-mit-ki-durchsuchen", label: "Anleitung: Website mit KI durchsuchen" },
  { href: "/beispiele", label: "Beispiele" },
  { href: "/preise", label: "Preise" },
  { href: "/blog", label: "Blog" },
];

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
        <p className="text-sm font-medium text-muted-foreground">Fehler 404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Diese Seite gibt es nicht</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Vielleicht wurde sie verschoben, oder der Link enthält einen Tippfehler.
        </p>
        <Button asChild rounded="full" className="mt-8">
          <Link href="/">Zur Startseite</Link>
        </Button>
        <ul className="mt-10 space-y-2 text-sm">
          {suggestions.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="underline underline-offset-4">{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteShell>
  );
}
