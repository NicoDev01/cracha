import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { FeatureLdg } from "@/types";
import { GridItem } from "@/components/landing/ui/grid-item";

export const features: FeatureLdg[] = [
    {
        title: "Antworten ohne den Lärm",
        description:
            "Unsere intelligente Extraktion filtert automatisch störende Menüs, Werbung und unwichtigen Code heraus. Sie erhalten nur den reinen, relevanten Inhalt als Antwortgrundlage.",
        link: "/dashboard",
        icon: "nextjs",
    },
    {
        title: "Lückenlose Wissensbasis",
        description:
            "Verpassen Sie nie wieder versteckte Details. CraCha folgt Links tief in die Website-Struktur, um eine lückenlose Wissensbasis zu garantieren – nicht nur von einer Seite, sondern von der gesamten Domain.",
        link: "/dashboard",
        icon: "google",
    },
    {
        title: "Ihre KI, nach Ihren Regeln",
        description:
            "Formen Sie eine Wissensbasis, die exakt Ihren Bedürfnissen entspricht. Mit anpassbaren Crawling-Regeln legen Sie genau fest, was Ihre KI wissen soll – und was nicht.",
        link: "/dashboard",
        icon: "search",
    },
    {
        title: "100 % transparente Antworten",
        description:
            "Keine \"Halluzinationen\", keine Unsicherheiten. Jede Antwort wird mit einem direkten Zitat und einem Link zur Originalquelle belegt. So wissen Sie immer, woher die Information stammt.",
        link: "/dashboard",
        icon: "laptop",
    },
    {
        title: "Blitzschnelle Verarbeitung",
        description:
            "Von der URL zur fertigen Wissensbasis in Minuten, nicht Stunden. Unsere optimierte Pipeline verarbeitet selbst komplexe Websites mit hunderten von Seiten in Rekordzeit.",
        link: "/dashboard",
        icon: "user",
    },
];

export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24">
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
