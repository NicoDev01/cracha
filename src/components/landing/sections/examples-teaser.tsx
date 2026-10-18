import { Link } from "@/i18n/navigation";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { bilingual } from "@/i18n/copy";
import { getAppLocale } from "@/i18n/server";
import { usageExamples } from "@/lib/marketing/examples";

const copy = bilingual(
  {
    heading: "Für jede Website, in der du dich ",
    accent: "sonst verlierst",
    text: "Neuer Kunde, neues Tool, neue Doku: Die Antwort steht irgendwo zwischen hundert Unterseiten. CraCha findet sie.",
    cta: "Beispiele ansehen",
  },
  {
    heading: "For every website you’d ",
    accent: "otherwise get lost in",
    text: "New client, new tool, new docs: the answer is somewhere among a hundred subpages. CraCha finds it.",
    cta: "See examples",
  },
);

/**
 * A broad entry point to /beispiele. It replaced a section that named
 * agencies, marketing teams and developers as the audience — which read as
 * "not for you" to everyone else with a website worth asking.
 */
export default async function ExamplesTeaser() {
  const locale = await getAppLocale();
  const t = copy[locale];
  return (
    <section id="beispiele" className="scroll-mt-24 py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
            {t.heading}<span className="text-orange-600 dark:text-orange-400">{t.accent}</span>
          </h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">{t.text}</p>
        </div>
        <ul className="flex flex-wrap justify-center gap-3">
          {usageExamples[locale].map((example) => (
            <li key={example.id}>
              <Link
                href={`/beispiele#${example.id}`}
                className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {example.title}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex justify-center">
          <Link href="/beispiele" className="inline-flex min-h-11 items-center rounded-full border px-6 py-3 font-medium hover:bg-muted">
            {t.cta}
          </Link>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
