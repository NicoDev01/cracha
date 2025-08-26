import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { FeatureLdg } from "@/types";
import { GridItem } from "@/components/landing/ui/grid-item";

export const features: FeatureLdg[] = [
    {
        title: "Intelligente Inhalts-Extraktion",
        description:
            "CraCha crawlt nicht nur, er versteht. Unser Crawler dringt tief in Websites ein und extrahiert nur den reinen Text-Inhalt, befreit von unnötigem HTML-Ballast.",
        link: "/dashboard",
        icon: "nextjs",
    },
    {
        title: "Universeller Daten-Konnektor",
        description:
            "Egal ob Webseiten, PDFs, Word- oder Markdown-Dokumente – verbinden Sie jede Quelle und verwandeln Sie verstreute Informationen in eine zentrale Wissensdatenbank.",
        link: "/dashboard",
        icon: "google",
    },
    {
        title: "Lückenlose Wissensbasis",
        description:
            "Vergessen Sie oberflächliche Suchen. CraCha erfasst jede einzelne Unterseite und sorgt so für ein vollständiges, tiefes Verständnis Ihrer gesamten Datenlandschaft.",
        link: "/dashboard",
        icon: "search",
    },
    {
        title: "Dynamische KI-Steuerung",
        description:
            "Sie sind der Architekt Ihrer KI. Legen Sie Crawling-Tiefe, -Grenzen und Filter fest, um die Wissensbasis präzise nach Ihren Anforderungen zu formen.",
        link: "/dashboard",
        icon: "laptop",
    },
    {
        title: "Verifizierte Antworten",
        description:
            "Kein Raten, keine Halluzinationen. CraCha liefert faktenbasierte Antworten und belegt jede Aussage mit einem direkten Zitat und Link zur Originalquelle.",
        link: "/dashboard",
        icon: "user",
    },
];

export default function Features() {
  return (
    <section className="py-16 md:py-24">
        <MaxWidthWrapper>
             <div className="mx-auto mb-12 max-w-3xl text-center">
                <h2 className="font-heading text-3xl leading-tight md:text-5xl text-foreground">
                    Eine Engine, die für Sie <span className="text-gradient_indigo-purple">denkt</span>
                </h2>
                <p className="mt-4 text-muted-foreground">
                    CraCha ist vollgepackt mit intelligenten Funktionen, die Ihnen die mühsame Arbeit abnehmen.
                </p>
            </div>

          <div className="mt-12 grid gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {[features[0], features[1]].map((feature) => {
                    const Icon = Icons[feature.icon as keyof typeof Icons] || Icons.nextjs;
                    return (
                        <GridItem
                            key={feature.title}
                            icon={<Icon />}
                            title={feature.title}
                            description={feature.description}
                        />
                    );
                })}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {[features[2], features[3], features[4]].map((feature) => {
                    const Icon = Icons[feature.icon as keyof typeof Icons] || Icons.nextjs;
                    return (
                        <GridItem
                            key={feature.title}
                            icon={<Icon />}
                            title={feature.title}
                            description={feature.description}
                        />
                    );
                })}
            </div>
          </div>
        </MaxWidthWrapper>
    </section>
  );
}
