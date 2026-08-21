import type { ReactNode } from "react";
import { BadgeCheck, Filter, Network, SlidersHorizontal, Zap } from "lucide-react";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { GridItem } from "@/components/landing/ui/grid-item";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

/**
 * Every card used to carry a foreign logo. The icons were looked up by name
 * from the shared `Icons` map, and the names in the data were `nextjs`,
 * `google`, `search`, `laptop` and `user` — so the first two features were
 * illustrated with the Next.js and the Google logo. On a feature card that
 * does not read as decoration, it reads as an integration that does not exist.
 *
 * Two of the claims were also not ours to make. "Keine Halluzinationen, keine
 * Unsicherheiten" is a guarantee no retrieval system can give, and the system
 * prompt does not attempt it — it instructs the model to say plainly when the
 * sources do not contain the answer. That is the honest version and it is the
 * stronger one. And the answer carries a citation marker linking to the source
 * page, not a verbatim quote; the chat lists them under "Verwendete Quellen".
 */
const features: Feature[] = [
  {
    title: "Aus hunderten Seiten wird Wissen",
    description:
      "CraCha crawlt deine Website — Seite für Seite, bis zu hunderte. Menüs, Cookie-Banner und Werbung fallen weg, vom Rest bleibt das Wesentliche, kondensiert und bereit für Fragen.",
    icon: <Filter className="h-4 w-4" />,
  },
  {
    title: "Auch die Seiten, die sonst keiner findet",
    description:
      "CraCha klickt sich bis zu fünf Ebenen tief durch die Website — auch in Unterseiten, die im Menü nirgends verlinkt sind. Bis zu 500 Seiten pro Wissensdatenbank.",
    icon: <Network className="h-4 w-4" />,
  },
  {
    title: "Du sagst, was reinkommt",
    description:
      "Wie tief, wie viele Seiten, welche Bereiche — das legst du vorher fest. Was dich nicht interessiert, lässt CraCha einfach weg.",
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
  {
    title: "Du siehst immer, woher es kommt",
    description:
      "Zu jeder Antwort gehört die Seite, auf der es steht — ein Klick, und du liest es im Original nach. Und steht etwas nirgends, sagt CraCha das, statt sich etwas auszudenken.",
    icon: <BadgeCheck className="h-4 w-4" />,
  },
  {
    title: "In Minuten fertig, nicht in Tagen",
    description:
      "Eine mittelgroße Website ist in wenigen Minuten durch. Du siehst live, wie weit CraCha ist, und legst danach sofort los.",
    icon: <Zap className="h-4 w-4" />,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24">
        <MaxWidthWrapper>
             <div className="mx-auto mb-12 max-w-3xl text-center">
                <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
                    Das macht CraCha für <span className="text-gradient_indigo-purple">dich</span>
                </h2>
            </div>

          {/* No mt on top of the header's mb-12: the two used to be separated
              by a paragraph as well, and without it they add up to 6rem. */}
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {features.slice(0, 2).map((feature) => (
                    <GridItem
                        key={feature.title}
                        icon={feature.icon}
                        title={feature.title}
                        description={feature.description}
                    />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {features.slice(2).map((feature) => (
                    <GridItem
                        key={feature.title}
                        icon={feature.icon}
                        title={feature.title}
                        description={feature.description}
                    />
                ))}
            </div>
          </div>
        </MaxWidthWrapper>
    </section>
  );
}
