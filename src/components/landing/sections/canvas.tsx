"use client";

import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import ImaginationCanvas from "@/components/ui/ImaginationCanvas";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { Icons } from "@/components/shared/icons";

export default function CanvasSection() {
  return (
    <section id="canvas-section" className="scroll-mt-24">
      {/* Desktop Version mit Canvas */}
      <div className="hidden md:block pb-16 pt-37 sm:pb-24 overflow-hidden">
        <MaxWidthWrapper>
          <div className="relative h-[42vh] w-full overflow-hidden">
            <ImaginationCanvas />
          </div>
          <div className="flex flex-col items-center gap-7 text-center">
            <h2 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">
              Verwandle Websites <br /> in{" "}
              <span className="text-gradient_indigo-purple">Wissensbasen</span>
            </h2>
            <AppEntryLink prefetch={true} signedOutHref="/register">
              <RainbowButton className="gap-2">
                <span>Jetzt loslegen</span>
                <Icons.arrowRight className="size-4" />
              </RainbowButton>
            </AppEntryLink>
          </div>
        </MaxWidthWrapper>
      </div>

      {/* Mobile Version nur mit Text und Button */}
      <div className="block md:hidden pb-16 pt-8 px-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto">
          <h2 className="font-heading text-2xl leading-tight text-foreground">
            Verwandle Websites <br /> in{" "}
            <span className="text-gradient_indigo-purple">Wissensbasen</span>
          </h2>
          <AppEntryLink prefetch={true} signedOutHref="/register">
            <RainbowButton className="gap-2">
              <span>Jetzt loslegen</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </AppEntryLink>
        </div>
      </div>
    </section>
  );
}
