import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { cn } from "@/lib/utils";
import { LazyVideo } from "@/components/landing/ui/lazy-video";

/**
 * The comparison against AI search — Google's AI mode, ChatGPT with search,
 * Perplexity — which is what a visitor would otherwise use, not a plain chat.
 * It names the difference without running the others down: they search the
 * web anew for every question, CraCha has read the one website beforehand.
 * Google itself says not every page gets indexed ("Indexing isn't
 * guaranteed", Search Central: How Search works).
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
                           Die KI-Suche sucht. <span className="text-orange-600 dark:text-orange-400">CraCha kennt sich aus.</span>
                        </h2>
                        <p className="mt-4 text-base text-muted-foreground">
                            Eine KI-Suche geht bei jeder Frage neu ins Netz und nimmt ein paar
                            Treffer, die eine Suchmaschine weit oben zeigt. Was tief in einer
                            Website steckt, taucht dort selten auf. CraCha liest die Website, die
                            du gewählt hast, vorab Seite für Seite, auch Unterseiten, die Google
                            nicht listet. Deine Fragen beantwortet CraCha nur aus dieser Website,
                            mit Link zur Quelle. Und weil sie in deinem Konto bleibt, fragst du
                            morgen einfach weiter.
                        </p>
                        <p className="mt-4 text-base font-semibold text-foreground">
                            Für die schnelle Frage zwischendurch reicht die KI-Suche.
                            Wenn’s genau sein muss, frag CraCha.
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
