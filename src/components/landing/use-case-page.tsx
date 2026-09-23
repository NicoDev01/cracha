import Link from "next/link";
import type { ReactNode } from "react";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { FaqList } from "@/components/landing/faq-list";
import { JsonLd } from "@/components/landing/json-ld";
import type { FaqItem } from "@/lib/marketing/faq";
import { faqPageJsonLd } from "@/lib/marketing/structured-data";

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
export function UseCasePage({ content }: { content: UseCaseContent }) {
  return (
    <article className="mx-auto max-w-3xl space-y-14 px-5 py-12 sm:py-20">
      <JsonLd data={faqPageJsonLd(content.faq)} />
      <header>
        <Link href="/" className="text-sm text-muted-foreground underline">CraCha kennenlernen</Link>
        <p className="mt-6 text-sm font-medium text-muted-foreground">{content.eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{content.heading}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{content.intro}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <AppEntryLink signedOutHref="/register" className={ctaClass}>Kostenlos starten</AppEntryLink>
          <Link href="#so-gehts" className="inline-flex min-h-11 items-center rounded-full border px-6 py-3 font-medium hover:bg-muted">So geht’s</Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">100 Start-Credits gratis · Keine Kreditkarte nötig</p>
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
        <h2 className="text-2xl font-semibold">Beispielfragen</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Formulierungshilfen, keine aufgezeichneten Produktergebnisse. Ersetze die Platzhalter durch deine eigenen Begriffe.</p>
        <ul className="mt-5 list-disc space-y-3 pl-5 leading-7">
          {content.exampleQuestions.map((question) => <li key={question}>{question}</li>)}
        </ul>
      </section>

      <section id="so-gehts" className="scroll-mt-24 space-y-5">
        <h2 className="text-2xl font-semibold">So gehst du vor</h2>
        <ol className="list-decimal space-y-5 pl-6 leading-7 text-muted-foreground">
          {content.steps.map((step) => (
            <li key={step.title}><strong className="text-foreground">{step.title}</strong> {step.text}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Was CraCha nicht kann</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          {content.limits.map((limit, index) => <li key={index}>{limit}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Häufige Fragen</h2>
        <FaqList items={content.faq} />
        <p className="mt-6 leading-7 text-muted-foreground">
          Mehr zu Kosten und Ablauf: <Link href="/#fragen" className="underline underline-offset-4">Kosten und häufige Fragen</Link> ·{" "}
          <Link href="/website-mit-ki-durchsuchen" className="underline underline-offset-4">Anleitung mit Beispielfragen</Link>
        </p>
      </section>

      <div className="rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">{content.cta.heading}</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">{content.cta.text}</p>
        <AppEntryLink signedOutHref="/register" className={ctaClass}>Kostenlos starten</AppEntryLink>
      </div>
    </article>
  );
}
