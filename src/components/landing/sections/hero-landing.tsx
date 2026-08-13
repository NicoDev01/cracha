import Link from "next/link";
import { Icons } from "@/components/shared/icons";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";

/**
 * The first screen.
 *
 * The headline used to read "Die Abkürzung durch hunderte Websites", which
 * described something the product does not do: a crawl covers hundreds of
 * subpages of one site, up to the 500-page limit — not hundreds of sites. The
 * paragraph underneath said "hunderte von Unterseiten" and contradicted it.
 * It also carried no word anyone searches for; "Website" and "Chatbot" are
 * what people type, and they say what the visitor ends up with.
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
        <h1 className="reveal text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px] leading-tight [animation-delay:80ms]">
          <div className="mb-1">Verwandle Websites</div>
          <div className="text-gradient_indigo-purple font-extrabold">
            in Chatbots
          </div>
        </h1>

         <p className="reveal max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8 [animation-delay:160ms]">
           Chatte mit hunderten Seiten gleichzeitig. <br />
           {/* Only from sm up: this break sits inside a sentence, and on a phone
               the line has already wrapped there anyway — forcing it a second
               time left a stub of two or three words on its own line. */}
           <strong>CraCha</strong> kämpft sich durch jede Unterseite einer Website{" "}
           <br className="hidden sm:inline" />
           und baut dir daraus einen Chatbot. <br />
           Nie wieder lästiges Geklicke durch einen wilden Website-Dschungel.
         </p>

        <div className="flex justify-center">
          <Link href="/login" prefetch={true}>
            <RainbowButton className="reveal gap-2 [animation-delay:240ms]">
              <span>Jetzt ausprobieren</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
