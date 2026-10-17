"use client";

import { Search, Settings, MessageSquare } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { GridItem } from "@/components/landing/ui/grid-item";

/**
 * The three steps.
 *
 * The first card used to promise "Webseiten, PDFs und mehr". There is no PDF
 * handling anywhere in the crawler — the settings offer a start URL, a depth,
 * a page limit and include/exclude patterns, and every one of them describes
 * an HTML page. Promising a format the product cannot read is the kind of
 * thing a visitor discovers thirty seconds after signing up.
 *
 * The steps are also written from the visitor's side now. "Crawlen, Chatten,
 * Verwalten" named the software's three screens; what a first-time reader
 * wants to know is how much of it lands on them, and the answer is: the first
 * step and the last one. The middle step is the point of the product — CraCha
 * finds the subpages itself — so it says so in as many words.
 */
export function BentoGrid() {
  return (
    <section id="how-to-use" className="py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-12 max-w-3xl text-center">
         <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
            Link rein. CraCha liest. <span className="text-orange-600 dark:text-orange-400">Du fragst.</span>
          </h2>
       </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8 lg:[&_h3]:min-h-[3.75rem] lg:[&_p]:min-h-[6.875rem] xl:[&_p]:min-h-[5.5rem]">
          <GridItem
            icon={<Search className="h-4 w-4" />}
            title="1. Link rein"
            description="Gib die Adresse der Website ein. Wenn du willst, legst du fest, welche Bereiche CraCha lesen soll, zum Beispiel nur /docs/."
          />
          <GridItem
            icon={<Settings className="h-4 w-4" />}
            title="2. CraCha liest"
            description="CraCha folgt den Links und der Sitemap und liest die Website Seite für Seite, ohne dass du dich durchklicken musst."
          />
          <GridItem
            icon={<MessageSquare className="h-4 w-4" />}
            title="3. Du fragst"
            description="Stell deine Frage im Chat und bekomm die Antwort mit Link zu der Stelle, an der sie steht."
          />
        </div>
      </MaxWidthWrapper>
    </section>
  );
}

export default BentoGrid;
