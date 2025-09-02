"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import { RainbowButton } from "@/components/landing/ui/rainbow-button";


export default function HeroLanding() {

const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section className="space-y-8 py-12 sm:py-20 lg:py-16 overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
        <h1
          className={cn(
            "text-balance font-urban text-2xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px] transition-all duration-1500 ease-out leading-tight",
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <div className="mb-3">Die Abkürzung durch</div>
          <div className="text-gradient_indigo-purple font-extrabold">
            hunderte Websites
          </div>
        </h1>

        <p
          className={cn(
            "max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8 transition-all duration-1000 ease-out delay-300",
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <strong>Ein Klick</strong> verwandelt komplette Websites in Ihren individuellen Experten. Während andere Tools nur einzelne Seiten sehen, erfassen wir den <strong>gesamten Kontext</strong> für präzise, quellenbasierte Antworten aus hunderten von Unterseiten.
        </p>

        <div className="flex justify-center">
          <Link href="/login" prefetch={true}>
            <RainbowButton
              className={cn(
                "gap-2 transition-all duration-1500 ease-out delay-1000",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <span>jetzt Starten</span>
              <Icons.arrowRight className="size-4" />
            </RainbowButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
