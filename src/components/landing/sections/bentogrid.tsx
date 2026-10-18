"use client";

import { Search, Settings, MessageSquare } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { GridItem } from "@/components/landing/ui/grid-item";
import { bilingual } from "@/i18n/copy";
import { useAppLocale } from "@/i18n/navigation";

const copy = bilingual(
  {
    heading: "Link rein. CraCha liest.",
    accent: "Du fragst.",
    steps: [
      { title: "1. Link rein", description: "Gib die Adresse der Website ein. Wenn du willst, legst du fest, welche Bereiche CraCha lesen soll, zum Beispiel nur /docs/." },
      { title: "2. CraCha liest", description: "CraCha folgt den Links und der Sitemap und liest die Website Seite für Seite, ohne dass du dich durchklicken musst." },
      { title: "3. Du fragst", description: "Stell deine Frage im Chat und bekomm die Antwort mit Link zu der Stelle, an der sie steht." },
    ],
  },
  {
    heading: "Paste a link. CraCha reads.",
    accent: "You ask.",
    steps: [
      { title: "1. Paste a link", description: "Enter the website’s address. If you like, choose which sections CraCha should read, for example only /docs/." },
      { title: "2. CraCha reads", description: "CraCha follows the links and the sitemap and reads the website page by page, so you don’t have to click through it." },
      { title: "3. You ask", description: "Ask your question in the chat and get the answer with a link to the exact place it comes from." },
    ],
  },
);

const icons = [<Search key="s" className="h-4 w-4" />, <Settings key="g" className="h-4 w-4" />, <MessageSquare key="m" className="h-4 w-4" />];

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
  const t = copy[useAppLocale()];
  return (
    <section id="how-to-use" className="py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
            {t.heading} <span className="text-orange-600 dark:text-orange-400">{t.accent}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8 lg:[&_h3]:min-h-[3.75rem] lg:[&_p]:min-h-[6.875rem] xl:[&_p]:min-h-[5.5rem]">
          {t.steps.map((step, index) => (
            <GridItem key={step.title} icon={icons[index]} title={step.title} description={step.description} />
          ))}
        </div>
      </MaxWidthWrapper>
    </section>
  );
}

export default BentoGrid;
