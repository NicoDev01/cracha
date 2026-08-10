import Link from "next/link";
import { Icons } from "@/components/shared/icons";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";

/**
 * The first screen.
 *
 * Every line here used to render at opacity 0 and wait for a `useEffect` to
 * switch it on, then fade for up to 1.5 seconds — the button a further second
 * after that. The text was in the HTML the whole time; it was simply invisible
 * until React had hydrated. The stagger is now a CSS animation with a delay
 * per line, so the hero appears as soon as the stylesheet does.
 */
export default function HeroLanding() {
  return (
    <section className="space-y-8 py-12 sm:py-20 lg:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
        {/* The product name as readable text, not only in a logo's alt
            attribute. Anything that reads the page rather than looking at it —
            a review bot, a search engine, a link preview — otherwise finds no
            name here at all. */}
        <p className="reveal font-urban text-sm font-bold uppercase tracking-[0.25em] text-muted-foreground">
          CraCha
        </p>

        <h1 className="reveal text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px] leading-tight [animation-delay:80ms]">
          <div className="mb-1">Die Abkürzung durch</div>
          <div className="text-gradient_indigo-purple font-extrabold">
            hunderte Websites
          </div>
        </h1>

        <p className="reveal max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8 [animation-delay:160ms]">
          <strong>CraCha</strong> verwandelt mit einem Klick komplette Websites in Ihren individuellen Experten. Während andere Tools nur einzelne Seiten sehen, erfassen wir den <strong>gesamten Kontext</strong> für präzise, quellenbasierte Antworten aus hunderten von Unterseiten.
        </p>

        <div className="flex justify-center">
          <Link href="/login" prefetch={true}>
            <RainbowButton className="reveal gap-2 [animation-delay:240ms]">
              <span>jetzt Starten</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
