import Link from "next/link";
import { AppEntryLink } from "@/components/landing/app-entry-link";

export default function HeroLanding() {
  return (
    <section className="space-y-8 py-12 sm:py-20 lg:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-muted-foreground">Für deine Recherche in Websites und Dokumentationen</p>
        <h1 className="text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px] leading-tight">
          Frag die Website.<br />
          <span className="text-gradient_indigo-purple">Finde Antworten mit Quellen.</span>
        </h1>
        <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground sm:text-xl">
          Lass CraCha die öffentlichen Seiten einer Website einlesen und stelle deine Fragen auf Deutsch.
          Recherchiere in Produktinfos, Hilfecentern und Dokumentationen – mit Links zum Nachprüfen.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <AppEntryLink signedOutHref="/register" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4">
            Kostenlos starten
          </AppEntryLink>
          <Link href="#how-to-use" className="inline-flex min-h-11 items-center rounded-full border px-6 py-3 font-medium hover:bg-muted">
            So funktioniert’s
          </Link>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          100 Start-Credits · Keine Kreditkarte zum Testen · Nutzung im eigenen CraCha-Konto
        </p>
      </div>
    </section>
  );
}
