import Link from "next/link";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { FaqList } from "@/components/landing/faq-list";
import { JsonLd } from "@/components/landing/json-ld";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import type { FaqItem } from "@/lib/marketing/faq";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";
import { faqPageJsonLd } from "@/lib/marketing/structured-data";

/**
 * Everything on this page is computed from the tariff in credit-tariff.ts, so
 * a price change there changes the page, the Offer markup and the examples in
 * one go.
 */

export const metadata = marketingPageMetadata({
  path: "/preise",
  title: "Preise: Credits statt Abo",
  description: `CraCha kostet nur, was du nutzt: ${CREDITS.welcome} Start-Credits gratis, danach Credit-Pakete ab ${formatEuro(Math.min(...CREDIT_PACKAGES.map((pack) => pack.priceCents)))} als einmalige Aufladung. Kein Abo, keine Kreditkarte zum Start.`,
  keywords: ["CraCha Preise", "Website Chatbot Kosten", "KI Wissensdatenbank Preis", "Website mit KI durchsuchen kostenlos"],
});

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100);
}

function formatNumber(value: number) {
  return value.toLocaleString("de-DE");
}

/** Half the credits for pages, half for answers: a mix most accounts end up with. */
function mixedUse(credits: number) {
  const pages = Math.floor(credits / 2 / CREDITS.perPage);
  const questions = Math.floor((credits - pages * CREDITS.perPage) / CREDITS.perChatMessage);
  return { pages, questions };
}

const starterPages = 20;
const starterQuestions = Math.floor((CREDITS.welcome - starterPages * CREDITS.perPage) / CREDITS.perChatMessage);
const smallest = CREDIT_PACKAGES[0];

const faq: FaqItem[] = [
  {
    question: "Brauche ich für den Start eine Kreditkarte?",
    answer: `Nein. Nach der Registrierung und der Bestätigung deiner E-Mail-Adresse hast du ${CREDITS.welcome} Start-Credits. Zahlungsdaten brauchst du erst, wenn du ein Paket kaufst.`,
  },
  {
    question: "Ist das ein Abo?",
    answer: "Nein. Jedes Paket ist eine einmalige Aufladung. Es verlängert sich nicht und es gibt nichts zu kündigen.",
  },
  {
    question: "Verfallen gekaufte Credits?",
    answer: "Eine zeitbasierte Löschung von Guthaben ist derzeit nicht vorgesehen. Credits sind an dein Konto gebunden und nicht übertragbar.",
  },
  {
    question: "Zahle ich für Seiten, die nicht eingelesen werden konnten?",
    answer: "Nein. Beim Start eines Einlesevorgangs wird das Guthaben für die gewählte Höchstzahl an Seiten vorgemerkt. Abgerechnet werden nur die tatsächlich eingelesenen Seiten, der Rest geht zurück. Scheitert oder endet der Vorgang ohne Ergebnis, wird nichts berechnet.",
  },
  {
    question: "Was kostet eine Antwort, die nicht ankommt?",
    answer: `Nichts. Liefert CraCha wegen eines technischen Fehlers keine vollständige Antwort, werden die ${CREDITS.perChatMessage} Credits erstattet. Brichst du eine Antwort selbst ab, nachdem sie begonnen hat, bleibt sie berechnet.`,
  },
  {
    question: "Bekomme ich eine Rechnung?",
    answer: "Ja. Die Zahlung läuft über Stripe, und zu jedem Kauf wird eine Rechnung erstellt. Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer.",
  },
];

export default function PreisePage() {
  return (
    <article className="mx-auto max-w-4xl space-y-14 px-5 py-12 sm:py-20">
      <JsonLd data={faqPageJsonLd(faq)} />
      <header className="max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground underline">CraCha kennenlernen</Link>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">Preise: du zahlst nur, was du nutzt</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Du startest mit {CREDITS.welcome} Credits gratis und ohne Kreditkarte. Reicht das nicht, lädst du dein Guthaben
          mit einem Paket auf. Kein Abo, keine Grundgebühr.
        </p>
      </header>

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">So werden Credits verbraucht</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <p className="text-3xl font-bold">{CREDITS.perPage} Credit</p>
            <p className="mt-2 leading-7 text-muted-foreground">pro eingelesener Seite. Abgerechnet werden nur die Seiten, die CraCha tatsächlich eingelesen hat.</p>
          </div>
          <div className="rounded-2xl border p-6">
            <p className="text-3xl font-bold">{CREDITS.perChatMessage} Credits</p>
            <p className="mt-2 leading-7 text-muted-foreground">pro Antwort, egal wie lang sie wird. Schlägt eine Antwort technisch fehl, bekommst du die Credits zurück.</p>
          </div>
        </div>
        <p className="leading-7 text-muted-foreground">
          Beispiel mit dem Startguthaben: {starterPages} Seiten einlesen kostet {starterPages * CREDITS.perPage} Credits. Mit den übrigen{" "}
          {CREDITS.welcome - starterPages * CREDITS.perPage} Credits stellst du {starterQuestions} Fragen.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">Credit-Pakete</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pack) => {
            const mix = mixedUse(pack.credits);
            const centsPerCredit = pack.priceCents / pack.credits;
            return (
              <div key={pack.id} className="flex flex-col rounded-2xl border p-6">
                <h3 className="text-lg font-semibold">{pack.label}</h3>
                <p className="mt-3 text-4xl font-bold">{formatEuro(pack.priceCents)}</p>
                <p className="mt-1 text-sm text-muted-foreground">einmalig, inkl. USt.</p>
                <p className="mt-5 font-medium">{formatNumber(pack.credits)} Credits</p>
                <ul className="mt-3 flex-1 space-y-2 text-sm leading-6 text-muted-foreground">
                  <li>{formatNumber(pack.credits / CREDITS.perPage)} Seiten einlesen</li>
                  <li>oder {formatNumber(Math.floor(pack.credits / CREDITS.perChatMessage))} Fragen stellen</li>
                  <li>oder gemischt: {formatNumber(mix.pages)} Seiten und {formatNumber(mix.questions)} Fragen</li>
                  <li>{centsPerCredit.toLocaleString("de-DE", { maximumFractionDigits: 2 })} Cent pro Credit</li>
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Pakete kaufst du nach der Anmeldung im Dashboard. Die Zahlung läuft über Stripe. Als Verbraucher hast du ein
          gesetzliches Widerrufsrecht, Einzelheiten stehen in der{" "}
          <Link href="/widerrufsbelehrung" className="underline underline-offset-4">Widerrufsbelehrung</Link>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Was im Preis enthalten ist</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          <li>Bis zu {CREDITS.maxDatabases} Wissensbasen je Konto, jede mit bis zu 500 Seiten pro Einlesevorgang.</li>
          <li>Jede Antwort mit Links zu den Seiten, auf die sie sich stützt.</li>
          <li>Fragen auf Deutsch, auch wenn die eingelesene Website englisch ist.</li>
          <li>Die Wissensbasis bleibt in deinem Konto, bis du sie löschst. Für das Aufbewahren zahlst du nichts.</li>
        </ul>
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-4 text-2xl font-semibold">Häufige Fragen zu den Kosten</h2>
        <FaqList items={faq} />
      </section>

      <div className="max-w-3xl rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Erst testen, dann entscheiden</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">
          Mit den Start-Credits siehst du an einer eigenen Website, ob CraCha für dich passt. Das kleinste Paket kostet danach{" "}
          {formatEuro(smallest.priceCents)}.
        </p>
        <AppEntryLink
          signedOutHref="/register"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Kostenlos starten
        </AppEntryLink>
      </div>
    </article>
  );
}
