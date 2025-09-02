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
    <section className="space-y-6 py-12 sm:py-20 lg:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
        <h1
          className={cn(
            "text-balance font-urban text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[66px] transition-all duration-1500 ease-out",
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          Vom Website-Dschungel zum{" "}
          <span className="text-gradient_indigo-purple font-extrabold">
            smarten Chatbot
          </span>
        </h1>

        <p
          className={cn(
            "max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8 transition-all duration-1000 ease-out delay-300",
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          CraCha scannt selbst die tiefsten und unübersichtlichsten Websites mit nur einem Klick – und erschafft daraus einen intelligenten Chatbot, der ausschließlich mit Ihren Daten antwortet. Präzise Antworten statt endloser Klicks.
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
