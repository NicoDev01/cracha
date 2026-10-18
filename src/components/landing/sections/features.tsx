import type { ReactNode } from "react";
import { BadgeCheck, FileCheck, Languages, Network, SearchX } from "lucide-react";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { GridItem } from "@/components/landing/ui/grid-item";
import { bilingual } from "@/i18n/copy";
import { getAppLocale } from "@/i18n/server";

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
const icons = [
  <Network key="n" className="h-4 w-4" />,
  <BadgeCheck key="b" className="h-4 w-4" />,
  <SearchX key="s" className="h-4 w-4" />,
  <Languages key="l" className="h-4 w-4" />,
  <FileCheck key="f" className="h-4 w-4" />,
];

const copy = bilingual<{ heading: string; accent: string; features: Omit<Feature, "icon">[] }>(
  {
    heading: "Was du ",
    accent: "davon hast",
    features: [
      { title: "Findet die Unterseiten selbst", description: "Du gibst eine Adresse ein, nicht hundert. CraCha folgt den Links und der Sitemap und liest die Website Seite für Seite." },
      { title: "Jede Antwort mit Quelle", description: "Unter jeder Antwort stehen die Seiten, auf die sie sich stützt – als klickbare Links. Ein Klick, und du liest die Aussage im Original nach." },
      { title: "Sagt, wenn es nicht drinsteht", description: "CraCha antwortet nur aus der Website, die du gewählt hast. Steht die Antwort dort nicht, sagt CraCha dir das, statt etwas zu erfinden." },
      { title: "Frag auf Deutsch", description: "Auch wenn die Website englisch ist. Die Quellenlinks führen auf die Originalseiten." },
      { title: "Texte gegen die Website prüfen", description: "Füg einen Entwurf oder eine Preisliste in den Content-Check ein. CraCha zeigt Widersprüche und veraltete Angaben, mit Quelle." },
    ],
  },
  {
    heading: "What you ",
    accent: "get out of it",
    features: [
      { title: "Finds the subpages itself", description: "You enter one address, not a hundred. CraCha follows the links and the sitemap and reads the website page by page." },
      { title: "Every answer with a source", description: "Below every answer you see the pages it is based on – as clickable links. One click and you read the statement in the original." },
      { title: "Tells you when it isn’t there", description: "CraCha answers only from the website you chose. If the answer isn’t on it, CraCha says so instead of making something up." },
      { title: "Ask in your language", description: "Even if the website is in another language. The source links lead to the original pages." },
      { title: "Check texts against the website", description: "Paste a draft or a price list into the Content Check. CraCha shows contradictions and outdated details, with sources." },
    ],
  },
);

export default async function Features() {
  const t = copy[await getAppLocale()];
  const features: Feature[] = t.features.map((feature, index) => ({ ...feature, icon: icons[index] }));
  return (
    <section id="features" className="py-16 md:py-24">
        <MaxWidthWrapper>
             <div className="mx-auto mb-12 max-w-3xl text-center">
                <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
                    {t.heading}<span className="text-orange-600 dark:text-orange-400">{t.accent}</span>
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
