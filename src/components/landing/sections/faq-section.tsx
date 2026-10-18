import { Link } from "@/i18n/navigation";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { FaqList } from "@/components/landing/faq-list";
import { bilingual } from "@/i18n/copy";
import { getAppLocale } from "@/i18n/server";
import { landingFaq } from "@/lib/marketing/faq";

const copy = bilingual(
  { heading: "Gut zu wissen, bevor du startest", guide: "Website mit KI durchsuchen: Anleitung und Beispielfragen" },
  { heading: "Good to know before you start", guide: "Search a website with AI: guide and example questions" },
);

/**
 * The landing FAQ. It used to share a section with a cost calculator, the
 * three credit packs and an illustrative answer; the price now lives in one
 * FAQ item, and the page renders the FAQPage JSON-LD from the same array.
 */
export default async function FaqSection() {
  const locale = await getAppLocale();
  const t = copy[locale];
  return (
    <section id="fragen" className="scroll-mt-24 py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold">{t.heading}</h2>
          <FaqList items={landingFaq[locale]} />
          <Link href="/website-mit-ki-durchsuchen" className="mt-6 inline-block py-2 font-medium underline underline-offset-4">{t.guide}</Link>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
