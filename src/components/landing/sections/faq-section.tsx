import Link from "next/link";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { FaqList } from "@/components/landing/faq-list";
import { landingFaq } from "@/lib/marketing/faq";

/**
 * The landing FAQ. It used to share a section with a cost calculator, the
 * three credit packs and an illustrative answer; the price now lives in one
 * FAQ item, and the page renders the FAQPage JSON-LD from the same array.
 */
export default function FaqSection() {
  return (
    <section id="fragen" className="scroll-mt-24 py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold">Gut zu wissen, bevor du startest</h2>
          <FaqList items={landingFaq} />
          <Link href="/website-mit-ki-durchsuchen" className="mt-6 inline-block py-2 font-medium underline underline-offset-4">Website mit KI durchsuchen: Anleitung und Beispielfragen</Link>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
