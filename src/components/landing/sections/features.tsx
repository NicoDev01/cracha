import type { ReactNode } from "react";
import { BadgeCheck, FileCheck, Languages, Network, SearchX } from "lucide-react";

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
 * The caveat that such an answer can still be wrong lives in the FAQ
 * ("Sind die Antworten immer richtig?"), not on this card.
 */
const features: Feature[] = [
  {
    title: "Findet die Unterseiten selbst",
    description:
      "Du gibst eine Adresse ein, nicht hundert. CraCha folgt den Links und der Sitemap und liest die Website Seite für Seite.",
    icon: <Network className="h-4 w-4" />,
  },
  {
    title: "Jede Antwort mit Quelle",
    description:
      "Unter jeder Antwort stehen die Seiten, auf die sie sich stützt – als klickbare Links. Ein Klick, und du liest die Aussage im Original nach.",
    icon: <BadgeCheck className="h-4 w-4" />,
  },
  {
    title: "Sagt, wenn es nicht drinsteht",
    description:
      "CraCha antwortet nur aus der Website, die du gewählt hast. Steht die Antwort dort nicht, sagt CraCha dir das, statt etwas zu erfinden.",
    icon: <SearchX className="h-4 w-4" />,
  },
  {
    title: "Frag auf Deutsch",
    description:
      "Auch wenn die Website englisch ist. Die Quellenlinks führen auf die Originalseiten.",
    icon: <Languages className="h-4 w-4" />,
  },
  {
    title: "Texte gegen die Website prüfen",
    description:
      "Füg einen Entwurf oder eine Preisliste in den Content-Check ein. CraCha zeigt Widersprüche und veraltete Angaben, mit Quelle.",
    icon: <FileCheck className="h-4 w-4" />,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24">
        <MaxWidthWrapper>
             <div className="mx-auto mb-12 max-w-3xl text-center">
                <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
                    Was du <span className="text-orange-600 dark:text-orange-400">davon hast</span>
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
