import { setRequestLocale } from "next-intl/server";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { FaqList } from "@/components/landing/faq-list";
import { JsonLd } from "@/components/landing/json-ld";
import { bilingual, formatEuro, formatNumber, intlLocale } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import type { FaqItem } from "@/lib/marketing/faq";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";
import { faqPageJsonLd } from "@/lib/marketing/structured-data";

/**
 * Everything on this page is computed from the tariff in credit-tariff.ts, so
 * a price change there changes the page, the Offer markup and the examples in
 * one go.
 */

/** Half the credits for pages, half for answers: a mix most accounts end up with. */
function mixedUse(credits: number) {
  const pages = Math.floor(credits / 2 / CREDITS.perPage);
  const questions = Math.floor((credits - pages * CREDITS.perPage) / CREDITS.perChatMessage);
  return { pages, questions };
}

const starterPages = 20;
const starterQuestions = Math.floor((CREDITS.welcome - starterPages * CREDITS.perPage) / CREDITS.perChatMessage);
const smallest = CREDIT_PACKAGES[0];
const lowestCents = Math.min(...CREDIT_PACKAGES.map((pack) => pack.priceCents));

const copy = (locale: Locale) =>
  bilingual(
    {
      title: "Preise: Credits statt Abo",
      description: `CraCha kostet nur, was du nutzt: ${CREDITS.welcome} Start-Credits gratis, danach Credit-Pakete ab ${formatEuro(lowestCents, locale)} als einmalige Aufladung. Kein Abo, keine Kreditkarte zum Start.`,
      keywords: ["CraCha Preise", "Website Chatbot Kosten", "Website durchsuchen KI Preis", "Website mit KI durchsuchen kostenlos"],
      back: "CraCha kennenlernen",
      heading: "Preise: Credits statt Abo",
      intro: `Du startest mit ${CREDITS.welcome} Credits gratis und ohne Kreditkarte. Reicht das nicht, lädst du dein Guthaben mit einem Paket auf. Kein Abo, keine Grundgebühr.`,
      usageHeading: "So werden Credits verbraucht",
      perPage: `${CREDITS.perPage} Credit`,
      perPageText: "pro eingelesener Seite. Abgerechnet werden nur die Seiten, die CraCha tatsächlich eingelesen hat.",
      perAnswer: `${CREDITS.perChatMessage} Credits`,
      perAnswerText: "pro Antwort, egal wie lang sie wird. Schlägt eine Antwort technisch fehl, bekommst du die Credits zurück.",
      starter: `Beispiel mit dem Startguthaben: ${starterPages} Seiten einlesen kostet ${starterPages * CREDITS.perPage} Credits. Mit den übrigen ${CREDITS.welcome - starterPages * CREDITS.perPage} Credits stellst du ${starterQuestions} Fragen.`,
      packsHeading: "Credit-Pakete",
      oneTime: "einmalig, inkl. USt.",
      credits: (n: number) => `${formatNumber(n, locale)} Credits`,
      pages: (n: number) => `${formatNumber(n, locale)} Seiten einlesen`,
      questions: (n: number) => `oder ${formatNumber(n, locale)} Fragen stellen`,
      mixed: (pages: number, questions: number) => `oder gemischt: ${formatNumber(pages, locale)} Seiten und ${formatNumber(questions, locale)} Fragen`,
      perCredit: (cents: number) => `${cents.toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })} Cent pro Credit`,
      buyBefore: "Pakete kaufst du nach der Anmeldung im Dashboard. Die Zahlung läuft über Stripe. Als Verbraucher hast du ein gesetzliches Widerrufsrecht, Einzelheiten stehen in der",
      withdrawal: "Widerrufsbelehrung",
      includedHeading: "Was im Preis enthalten ist",
      included: [
        `Bis zu ${CREDITS.maxDatabases} Wissensbasen je Konto, jede mit bis zu 500 Seiten pro Einlesevorgang.`,
        "Jede Antwort mit Links zu den Seiten, auf die sie sich stützt.",
        "Fragen auf Deutsch, auch wenn die eingelesene Website englisch ist.",
        "Die Wissensbasis bleibt in deinem Konto, bis du sie löschst. Für das Aufbewahren zahlst du nichts.",
      ],
      faqHeading: "Häufige Fragen zu den Kosten",
      faq: [
        { question: "Brauche ich für den Start eine Kreditkarte?", answer: `Nein. Nach der Registrierung und der Bestätigung deiner E-Mail-Adresse hast du ${CREDITS.welcome} Start-Credits. Zahlungsdaten brauchst du erst, wenn du ein Paket kaufst.` },
        { question: "Ist das ein Abo?", answer: "Nein. Jedes Paket ist eine einmalige Aufladung. Es verlängert sich nicht und es gibt nichts zu kündigen." },
        { question: "Verfallen gekaufte Credits?", answer: "Eine zeitbasierte Löschung von Guthaben ist derzeit nicht vorgesehen. Credits sind an dein Konto gebunden und nicht übertragbar." },
        { question: "Zahle ich für Seiten, die nicht eingelesen werden konnten?", answer: "Nein. Beim Start eines Einlesevorgangs wird das Guthaben für die gewählte Höchstzahl an Seiten vorgemerkt. Abgerechnet werden nur die tatsächlich eingelesenen Seiten, der Rest geht zurück. Scheitert oder endet der Vorgang ohne Ergebnis, wird nichts berechnet." },
        { question: "Was kostet eine Antwort, die nicht ankommt?", answer: `Nichts. Liefert CraCha wegen eines technischen Fehlers keine vollständige Antwort, werden die ${CREDITS.perChatMessage} Credits erstattet. Brichst du eine Antwort selbst ab, nachdem sie begonnen hat, bleibt sie berechnet.` },
        { question: "Bekomme ich eine Rechnung?", answer: "Ja. Die Zahlung läuft über Stripe, und zu jedem Kauf wird eine Rechnung erstellt. Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer." },
      ] as FaqItem[],
      ctaHeading: "Erst testen, dann entscheiden",
      ctaText: `Mit den Start-Credits siehst du an einer eigenen Website, ob CraCha für dich passt. Das kleinste Paket kostet danach ${formatEuro(smallest.priceCents, locale)}.`,
      cta: "Kostenlos starten",
    },
    {
      title: "Pricing: credits instead of a subscription",
      description: `CraCha only costs what you use: ${CREDITS.welcome} free credits, then credit packs from ${formatEuro(lowestCents, locale)} as a one-time top-up. No subscription, no credit card to start.`,
      keywords: ["CraCha pricing", "website chatbot cost", "AI website search price", "search website with AI free"],
      back: "Discover CraCha",
      heading: "Pricing: credits instead of a subscription",
      intro: `You start with ${CREDITS.welcome} free credits, no credit card required. If that’s not enough, you top up your balance with a pack. No subscription, no base fee.`,
      usageHeading: "How credits are used",
      perPage: `${CREDITS.perPage} credit`,
      perPageText: "per page read. You’re only charged for the pages CraCha actually read.",
      perAnswer: `${CREDITS.perChatMessage} credits`,
      perAnswerText: "per answer, however long it gets. If an answer fails for technical reasons, you get the credits back.",
      starter: `Example with the free credits: reading ${starterPages} pages costs ${starterPages * CREDITS.perPage} credits. With the remaining ${CREDITS.welcome - starterPages * CREDITS.perPage} credits you ask ${starterQuestions} questions.`,
      packsHeading: "Credit packs",
      oneTime: "one-time, incl. VAT",
      credits: (n: number) => `${formatNumber(n, locale)} credits`,
      pages: (n: number) => `read ${formatNumber(n, locale)} pages`,
      questions: (n: number) => `or ask ${formatNumber(n, locale)} questions`,
      mixed: (pages: number, questions: number) => `or mixed: ${formatNumber(pages, locale)} pages and ${formatNumber(questions, locale)} questions`,
      perCredit: (cents: number) => `${cents.toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })} cents per credit`,
      buyBefore: "You buy packs in the dashboard after signing in. Payment is handled by Stripe. As a consumer you have a statutory right of withdrawal; the details are in the",
      withdrawal: "withdrawal policy",
      includedHeading: "What’s included",
      included: [
        `Up to ${CREDITS.maxDatabases} knowledge bases per account, each with up to 500 pages per run.`,
        "Every answer with links to the pages it is based on.",
        "Ask in your language, even if the website is in another one.",
        "The knowledge base stays in your account until you delete it. Storing it costs nothing.",
      ],
      faqHeading: "Questions about costs",
      faq: [
        { question: "Do I need a credit card to start?", answer: `No. After signing up and confirming your email address you have ${CREDITS.welcome} free credits. You only need payment details when you buy a pack.` },
        { question: "Is this a subscription?", answer: "No. Every pack is a one-time top-up. It doesn’t renew and there’s nothing to cancel." },
        { question: "Do purchased credits expire?", answer: "There is currently no time-based expiry of credits. Credits are tied to your account and not transferable." },
        { question: "Do I pay for pages that couldn’t be read?", answer: "No. When a run starts, credits for the chosen maximum number of pages are reserved. Only the pages actually read are charged; the rest is returned. If the run fails or ends without a result, nothing is charged." },
        { question: "What does an answer cost that never arrives?", answer: `Nothing. If CraCha can’t deliver a complete answer because of a technical error, the ${CREDITS.perChatMessage} credits are refunded. If you stop an answer yourself after it has started, it remains charged.` },
        { question: "Do I get an invoice?", answer: "Yes. Payment is handled by Stripe, and an invoice is created for every purchase. All prices include statutory VAT." },
      ] as FaqItem[],
      ctaHeading: "Try first, then decide",
      ctaText: `With the free credits you can see on a website of your own whether CraCha fits your needs. After that, the smallest pack costs ${formatEuro(smallest.priceCents, locale)}.`,
      cta: "Start for free",
    },
  )[locale];

export async function generateMetadata({ params }: PageProps<"/[locale]/preise">) {
  const locale = (await params).locale as Locale;
  const t = copy(locale);
  return marketingPageMetadata({ path: "/preise", locale, title: t.title, description: t.description, keywords: t.keywords });
}

export default async function PreisePage({ params }: PageProps<"/[locale]/preise">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = copy(locale);
  return (
    <article className="mx-auto max-w-4xl space-y-14 px-5 py-12 sm:py-20">
      <JsonLd data={faqPageJsonLd(t.faq)} />
      <header className="max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground underline">{t.back}</Link>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t.heading}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t.intro}</p>
      </header>

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">{t.usageHeading}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <p className="text-3xl font-bold">{t.perPage}</p>
            <p className="mt-2 leading-7 text-muted-foreground">{t.perPageText}</p>
          </div>
          <div className="rounded-2xl border p-6">
            <p className="text-3xl font-bold">{t.perAnswer}</p>
            <p className="mt-2 leading-7 text-muted-foreground">{t.perAnswerText}</p>
          </div>
        </div>
        <p className="leading-7 text-muted-foreground">{t.starter}</p>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">{t.packsHeading}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pack) => {
            const mix = mixedUse(pack.credits);
            const centsPerCredit = pack.priceCents / pack.credits;
            return (
              <div key={pack.id} className="flex flex-col rounded-2xl border p-6">
                <h3 className="text-lg font-semibold">{pack.label}</h3>
                <p className="mt-3 text-4xl font-bold">{formatEuro(pack.priceCents, locale)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.oneTime}</p>
                <p className="mt-5 font-medium">{t.credits(pack.credits)}</p>
                <ul className="mt-3 flex-1 space-y-2 text-sm leading-6 text-muted-foreground">
                  <li>{t.pages(pack.credits / CREDITS.perPage)}</li>
                  <li>{t.questions(Math.floor(pack.credits / CREDITS.perChatMessage))}</li>
                  <li>{t.mixed(mix.pages, mix.questions)}</li>
                  <li>{t.perCredit(centsPerCredit)}</li>
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {t.buyBefore}{" "}
          <Link href="/widerrufsbelehrung" className="underline underline-offset-4">{t.withdrawal}</Link>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.includedHeading}</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          {t.included.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-4 text-2xl font-semibold">{t.faqHeading}</h2>
        <FaqList items={t.faq} />
      </section>

      <div className="max-w-3xl rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">{t.ctaHeading}</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">{t.ctaText}</p>
        <AppEntryLink
          signedOutHref="/register"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t.cta}
        </AppEntryLink>
      </div>
    </article>
  );
}
