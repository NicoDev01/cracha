import Link from "next/link";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { usageExamples } from "@/lib/marketing/examples";

/**
 * A broad entry point to /beispiele. It replaced a section that named
 * agencies, marketing teams and developers as the audience — which read as
 * "not for you" to everyone else with a website worth asking.
 */
export default function ExamplesTeaser() {
  return (
    <section id="beispiele" className="scroll-mt-24 py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
            Wofür du CraCha <span className="text-gradient_indigo-purple">nutzen kannst</span>
          </h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Für jede öffentliche Website, auf der die Antwort irgendwo zwischen vielen Unterseiten steht.
          </p>
        </div>
        <ul className="flex flex-wrap justify-center gap-3">
          {usageExamples.map((example) => (
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
            Beispiele ansehen
          </Link>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
