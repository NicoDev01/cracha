

"use client";

import { Search, Settings, MessageSquare } from "lucide-react";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { GridItem } from "@/components/landing/ui/grid-item";

export function BentoGrid() {
  return (
    <section className="py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="mx-auto mb-12 max-w-3xl text-center">
         <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
            So einfach geht <span className="text-gradient_indigo-purple">CraCha</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            CraCha automatisiert das Crawling Ihrer Webinhalte, strukturiert das Wissen und liefert präzise KI-basierte Antworten. Verwalten Sie alles zentral und halten Sie Ihre Daten mühelos aktuell.
          </p>
       </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
          <GridItem
            icon={<Search className="h-4 w-4" />}
            title="1. Crawlen"
            description="Erfassen Sie Inhalte von jeder Quelle – Webseiten, PDFs und mehr – vollautomatisch und in Minutenschnelle."
          />
          <GridItem
            icon={<MessageSquare className="h-4 w-4" />}
            title="2. Chatten"
            description="Stellen Sie Fragen in natürlicher Sprache und erhalten Sie sofort präzise, KI-gestützte Antworten aus Ihren Daten."
          />
          <GridItem
            icon={<Settings className="h-4 w-4" />}
            title="3. Verwalten"
            description="Behalten Sie die volle Kontrolle. Managen und aktualisieren Sie alle Ihre Wissensdatenbanken an einem zentralen Ort."
          />
        </div>
      </MaxWidthWrapper>
    </section>
  );
}

export default BentoGrid;
