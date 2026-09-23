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
            So einfach geht <span className="text-gradient_indigo-purple">CraCha</span>
          </h2>
       </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
          <GridItem
            icon={<Search className="h-4 w-4" />}
            title="1. Start-URL eingeben"
            description="Gib die Adresse einer Website ein und leg fest, wie viele Unterseiten CraCha einlesen soll – oder einfach alle aus der Sitemap, bis zu 500 pro Durchgang."
          />
          <GridItem
            icon={<Settings className="h-4 w-4" />}
            title="2. CraCha findet alle Unterseiten"
            description="CraCha folgt den Links oder der Sitemap der Website, findet die Unterseiten automatisch und liest sie ein – du klickst dich durch nichts. Im Dashboard siehst du, sobald deine Wissensbasis bereit ist."
          />
          <GridItem
            icon={<MessageSquare className="h-4 w-4" />}
            title="3. Fragen stellen"
            description="Frag im Chat, was du wissen willst. Jede Antwort nennt ihre Quellen als klickbare Links, die dich direkt zur passenden Originalseite führen."
          />
        </div>
      </MaxWidthWrapper>
    </section>
  );
}

export default BentoGrid;
