import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { Icons } from "@/components/shared/icons";

export default function CanvasSection() {
  return (
    <section id="canvas-section" className="scroll-mt-24 pb-16 pt-8 md:pb-24">
      <MaxWidthWrapper>
        <div className="flex flex-col items-center gap-6 text-center md:gap-7">
          <h2 className="font-heading text-2xl leading-tight text-foreground sm:text-3xl md:text-5xl">
            Verwandle Websites <br /> in{" "}
            <span className="text-orange-600 dark:text-orange-400">Wissensbasen</span>
          </h2>
          <AppEntryLink prefetch={true} signedOutHref="/register">
            <RainbowButton className="gap-2">
              <span>Jetzt loslegen</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </AppEntryLink>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
