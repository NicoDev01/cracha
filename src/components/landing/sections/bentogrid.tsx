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
 * step and the last one.
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
            title="1. Website auswählen"
            description="Konto erstellen, E-Mail bestätigen und eine öffentliche Website auswählen. Beginne mit einem passenden Bereich und höchstens 20 Seiten."
          />
          <GridItem
            icon={<Settings className="h-4 w-4" />}
            title="2. Inhalte einlesen"
            description="CraCha liest die erreichbaren Seiten ein und bereitet sie für deine Fragen auf. Im Dashboard siehst du, sobald deine Wissensbasis bereit ist."
          />
          <GridItem
            icon={<MessageSquare className="h-4 w-4" />}
            title="3. Fragen und Quellen prüfen"
            description="Stell deine Frage im Chat und spring über die Quellenlinks direkt zur passenden Originalseite. Deine Wissensbasen bleiben in deinem Konto, du kannst jederzeit weiterfragen."
          />
        </div>
      </MaxWidthWrapper>
    </section>
  );
}

export default BentoGrid;
