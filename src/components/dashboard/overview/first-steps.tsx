import { Link } from "@/i18n/navigation";
import { Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CREDITS } from '@/lib/credit-tariff'

/** The page count the crawl form suggests for a first try. */
export const FIRST_CRAWL_PAGES = 20

export const primaryCta = 'h-10 gap-1.5 bg-brand-500 px-5 !text-white shadow-sm hover:bg-brand-600'

/** What a brand-new account sees instead of an empty knowledge base list. */
export function FirstSteps({ locale = 'de' }: { locale?: 'de' | 'en' }) {
  const questionsLeft = Math.floor((CREDITS.welcome - FIRST_CRAWL_PAGES * CREDITS.perPage) / CREDITS.perChatMessage)
  const en = locale === 'en'
  const steps = en ? [
    { title: 'Crawl a website', text: `Enter the address of a public website. ${FIRST_CRAWL_PAGES} pages are enough to start.` },
    { title: 'Wait a moment', text: 'Reading runs in the background. As soon as the knowledge base is ready, it shows up here.' },
    { title: 'Ask questions', text: 'Ask a concrete question. Every answer links the pages it comes from.' },
  ] : [
    {
      title: 'Website crawlen',
      text: `Gib die Adresse einer öffentlichen Website ein. Für den Anfang reichen ${FIRST_CRAWL_PAGES} Seiten.`,
    },
    {
      title: 'Kurz warten',
      text: 'Das Einlesen läuft im Hintergrund. Sobald die Wissensbasis bereit ist, erscheint sie hier.',
    },
    {
      title: 'Fragen stellen',
      text: 'Stell eine konkrete Frage. Jede Antwort verlinkt die Seiten, aus denen sie stammt.',
    },
  ]

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 dark:border-gray-800 dark:bg-white/[0.03]" aria-labelledby="first-steps">
      <h2 id="first-steps" className="text-base font-semibold text-gray-900 dark:text-white">
        {en ? 'Your first answer in three steps' : 'In drei Schritten zur ersten Antwort'}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {en
          ? `New accounts start with ${CREDITS.welcome} credits: enough for ${FIRST_CRAWL_PAGES} pages and then ${questionsLeft} questions.`
          : `Neue Konten starten mit ${CREDITS.welcome} Credits: genug für ${FIRST_CRAWL_PAGES} Seiten und danach ${questionsLeft} Fragen.`}
      </p>
      {/* The numbers are drawn, not list markers: Tailwind's reset strips those. */}
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{step.title}</p>
              <p className="mt-0.5 text-sm leading-6 text-gray-600 dark:text-gray-300">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button asChild rounded="full" className={primaryCta}>
          <Link href="/dashboard/crawl" prefetch={false}><Globe className="size-4" />{en ? 'Crawl a website' : 'Website crawlen'}</Link>
        </Button>
        <Link href="/website-mit-ki-durchsuchen" className="text-sm text-brand-600 underline underline-offset-2 dark:text-brand-400">
          {en ? 'Guide with sample questions' : 'Anleitung mit Beispielfragen'}
        </Link>
      </div>
    </section>
  )
}
