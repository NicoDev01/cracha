import { setRequestLocale } from "next-intl/server";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { bilingual } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { usageExamples } from "@/lib/marketing/examples";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

const copy = bilingual(
  {
    title: "Beispiele zur Nutzung: Was du mit CraCha fragen kannst",
    description:
      "Von der Firmenwebsite über Dokumentationen und Hilfe-Center bis zu Förderprogrammen: Beispiele, wie du eine ganze Website mit CraCha befragst – mit Beispielfragen.",
    keywords: ["Website mit KI durchsuchen Beispiele", "ganze Website durchsuchen Beispiele", "Fragen an eine Website stellen"],
    back: "CraCha kennenlernen",
    heading: "Beispiele zur Nutzung",
    intro:
      "CraCha passt überall dort, wo die Antwort irgendwo auf einer Website mit vielen Unterseiten steht. Du gibst die Start-URL ein, CraCha findet und liest die Unterseiten ein, und du stellst deine Fragen – jede Antwort mit Link zur Quelle. Hier ein paar Anregungen.",
    hint: "Die Fragen sind Formulierungshilfen, keine aufgezeichneten Ergebnisse. Ersetze die Platzhalter in eckigen Klammern durch deine eigenen Begriffe.",
    questions: "Beispielfragen",
    rulesHeading: "Was für alle Beispiele gilt",
    rules: [
      "CraCha liest öffentlich erreichbare HTML-Seiten ein. Login-Bereiche, Paywalls und PDF-Dateien gehören nicht dazu.",
      "Pro Einlesevorgang sind bis zu 500 Seiten möglich. Mit Mustern beschränkst du das Einlesen auf die Bereiche, die du brauchst.",
      "CraCha arbeitet mit dem Stand des Einlesens. Ändert sich die Website, liest du sie erneut ein.",
      "Auch Antworten mit Quellen können unvollständig oder falsch sein. Prüfe Wichtiges über den Quellenlink im Original.",
    ],
    ctaHeading: "Probier es mit deiner Website aus",
    ctaText: "Du brauchst nur eine Start-URL und eine konkrete Frage. 100 Start-Credits gratis, keine Kreditkarte nötig.",
    cta: "Kostenlos starten",
  },
  {
    title: "Examples: what you can ask CraCha",
    description:
      "From company websites and documentation to help centers and funding programs: examples of how to question an entire website with CraCha – with sample questions.",
    keywords: ["search website with AI examples", "chat with a website examples", "ask questions about a website"],
    back: "Discover CraCha",
    heading: "Examples",
    intro:
      "CraCha fits wherever the answer is somewhere on a website with many subpages. You enter the start URL, CraCha finds and reads the subpages, and you ask your questions – every answer with a link to its source. Here are a few ideas.",
    hint: "The questions are phrasing aids, not recorded results. Replace the placeholders in square brackets with your own terms.",
    questions: "Sample questions",
    rulesHeading: "What applies to all examples",
    rules: [
      "CraCha reads publicly accessible HTML pages. Login areas, paywalls and PDF files are not included.",
      "Up to 500 pages per run. Use patterns to limit reading to the sections you need.",
      "CraCha works with the state of its last read. If the website changes, you read it again.",
      "Even answers with sources can be incomplete or wrong. Check anything important in the original via the source link.",
    ],
    ctaHeading: "Try it with your website",
    ctaText: "All you need is a start URL and a concrete question. 100 free credits, no credit card required.",
    cta: "Start for free",
  },
);

export async function generateMetadata({ params }: PageProps<"/[locale]/beispiele">) {
  const locale = (await params).locale as Locale;
  const t = copy[locale];
  return marketingPageMetadata({ path: "/beispiele", locale, title: t.title, description: t.description, keywords: t.keywords });
}

const ctaClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4";

export default async function BeispielePage({ params }: PageProps<"/[locale]/beispiele">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = copy[locale];
  return (
    <article className="mx-auto max-w-5xl space-y-14 px-5 py-12 sm:py-20">
      <header className="max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground underline">{t.back}</Link>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t.heading}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t.intro}</p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t.hint}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {usageExamples[locale].map((example) => (
          <section key={example.id} id={example.id} className="scroll-mt-24 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">{example.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{example.description}</p>
            <h3 className="mt-5 text-sm font-medium">{t.questions}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 leading-7">
              {example.questions.map((question) => <li key={question}>{question}</li>)}
            </ul>
            {example.note && <p className="mt-4 text-sm leading-6 text-muted-foreground">{example.note}</p>}
            {example.more && (
              <Link href={example.more.href} className="mt-4 inline-block py-1 font-medium underline underline-offset-4">
                {example.more.label}
              </Link>
            )}
          </section>
        ))}
      </div>

      <section className="max-w-3xl space-y-4">
        <h2 className="text-2xl font-semibold">{t.rulesHeading}</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          {t.rules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
      </section>

      <div className="max-w-3xl rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">{t.ctaHeading}</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">{t.ctaText}</p>
        <AppEntryLink signedOutHref="/register" className={ctaClass}>{t.cta}</AppEntryLink>
      </div>
    </article>
  );
}
