import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { FaqList } from "@/components/landing/faq-list";
import { JsonLd } from "@/components/landing/json-ld";
import type { FaqItem } from "@/lib/marketing/faq";
import { faqPageJsonLd } from "@/lib/marketing/structured-data";
import { bilingual } from "@/i18n/copy";
import type { Locale } from "@/i18n/routing";

const copy = bilingual(
  {
    back: "CraCha kennenlernen",
    start: "Kostenlos starten",
    how: "So geht’s",
    credits: "100 Start-Credits gratis · Keine Kreditkarte nötig",
    questions: "Beispielfragen",
    questionsHint: "Formulierungshilfen, keine aufgezeichneten Produktergebnisse. Ersetze die Platzhalter durch deine eigenen Begriffe.",
    steps: "So gehst du vor",
    limits: "Was CraCha nicht kann",
    faq: "Häufige Fragen",
    more: "Mehr zu Kosten und Ablauf:",
    moreCosts: "Kosten und häufige Fragen",
    moreGuide: "Anleitung mit Beispielfragen",
  },
  {
    back: "Discover CraCha",
    start: "Start for free",
    how: "How it works",
    credits: "100 free credits · No credit card required",
    questions: "Sample questions",
    questionsHint: "Phrasing aids, not recorded product results. Replace the placeholders with your own terms.",
    steps: "How to go about it",
    limits: "What CraCha can’t do",
    faq: "Frequently asked questions",
    more: "More on costs and the process:",
    moreCosts: "Costs and FAQ",
    moreGuide: "Guide with sample questions",
  },
);

export interface UseCaseContent {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  benefits: { title: string; text: string }[];
  exampleQuestions: string[];
  steps: { title: string; text: ReactNode }[];
  limits: ReactNode[];
  faq: FaqItem[];
  cta: { heading: string; text: string };
}

const ctaClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4";

/**
 * The shared frame of the use-case pages: same order of sections, same CTA,
 * and the FAQPage JSON-LD built from the very array the visible FAQ renders.
 */
export function UseCasePage({ content, locale }: { content: UseCaseContent; locale: Locale }) {
  const t = copy[locale];
  return (
    <article className="mx-auto max-w-3xl space-y-14 px-5 py-12 sm:py-20">
      <JsonLd data={faqPageJsonLd(content.faq)} />
      <header>
        <Link href="/" className="text-sm text-muted-foreground underline">{t.back}</Link>
        <p className="mt-6 text-sm font-medium text-muted-foreground">{content.eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{content.heading}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{content.intro}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <AppEntryLink signedOutHref="/register" className={ctaClass}>{t.start}</AppEntryLink>
          <Link href="#so-gehts" className="inline-flex min-h-11 items-center rounded-full border px-6 py-3 font-medium hover:bg-muted">{t.how}</Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t.credits}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {content.benefits.map((benefit) => (
          <div key={benefit.title} className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">{benefit.title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{benefit.text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-2xl font-semibold">{t.questions}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.questionsHint}</p>
        <ul className="mt-5 list-disc space-y-3 pl-5 leading-7">
          {content.exampleQuestions.map((question) => <li key={question}>{question}</li>)}
        </ul>
      </section>

      <section id="so-gehts" className="scroll-mt-24 space-y-5">
        <h2 className="text-2xl font-semibold">{t.steps}</h2>
        <ol className="list-decimal space-y-5 pl-6 leading-7 text-muted-foreground">
          {content.steps.map((step) => (
            <li key={step.title}><strong className="text-foreground">{step.title}</strong> {step.text}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.limits}</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          {content.limits.map((limit, index) => <li key={index}>{limit}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t.faq}</h2>
        <FaqList items={content.faq} />
        <p className="mt-6 leading-7 text-muted-foreground">
          {t.more} <Link href="/#fragen" className="underline underline-offset-4">{t.moreCosts}</Link> ·{" "}
          <Link href="/website-mit-ki-durchsuchen" className="underline underline-offset-4">{t.moreGuide}</Link>
        </p>
      </section>

      <div className="rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">{content.cta.heading}</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">{content.cta.text}</p>
        <AppEntryLink signedOutHref="/register" className={ctaClass}>{t.start}</AppEntryLink>
      </div>
    </article>
  );
}
