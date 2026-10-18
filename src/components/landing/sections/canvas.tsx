import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { Icons } from "@/components/shared/icons";
import { bilingual } from "@/i18n/copy";
import { getAppLocale } from "@/i18n/server";

const copy = bilingual(
  { heading: "Welche Website willst du ", accent: "fragen?", cta: "Kostenlos starten" },
  { heading: "Which website do you want to ", accent: "ask?", cta: "Start for free" },
);

export default async function CanvasSection() {
  const t = copy[await getAppLocale()];
  return (
    <section id="canvas-section" className="scroll-mt-24 pb-16 pt-8 md:pb-24">
      <MaxWidthWrapper>
        <div className="flex flex-col items-center gap-6 text-center md:gap-7">
          <h2 className="font-heading text-2xl leading-tight text-foreground sm:text-3xl md:text-5xl">
            {t.heading}<span className="text-orange-600 dark:text-orange-400">{t.accent}</span>
          </h2>
          <AppEntryLink prefetch={true} signedOutHref="/register">
            <RainbowButton className="gap-2">
              <span>{t.cta}</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </AppEntryLink>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
