import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { cn } from "@/lib/utils";
import { LazyVideo } from "@/components/landing/ui/lazy-video";

/**
 * The comparison against a plain AI chat.
 *
 * The text here used to be built from "unstrukturierte Daten", "dialogfähiger
 * Wissens-Hub" and "an der Oberfläche kratzen" — three phrases that sound like
 * a difference without naming one. The difference is countable: one page
 * versus every page the crawl reaches.
 *
 * The `data` object also carried a `title` the markup never read and an empty
 * `list` nothing rendered.
 */
export default function ProductShowcase() {
    const reverse = true;
    const video = "/videos/animation.webm";

    return (
        <section id="why-cracha" className="py-16 md:py-24">
            <MaxWidthWrapper>
                <div className="grid gap-10 px-2.5 lg:grid-cols-2 lg:items-center lg:px-7">
                    <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>
                        <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
                           Warum <span className="text-gradient_indigo-purple">CraCha</span>?
                        </h2>
                        <p className="mt-4 text-base text-muted-foreground">
                            Eine normale KI kennt nur die eine Seite, die du ihr
                            zeigst. CraCha kennt die ganze Website — jede
                            Unterseite, auch die, die im Menü nirgends auftaucht.
                            Du fragst einmal und hast die Antwort. <br />
                            <strong> Kein Suchen, kein Scrollen, keine zwanzig offenen Tabs.</strong>
                            
                        </p>
                    </div>
                    <div
                        className={cn(
                            "overflow-hidden rounded-xl border lg:-m-4",
                            reverse ? "order-1" : "order-2",
                        )}
                    >
                        <div className="aspect-video">
                            <LazyVideo
                                className="size-full object-cover object-center"
                                src={video}
                            />
                        </div>
                    </div>
                </div>
            </MaxWidthWrapper>
        </section>
    );
}
