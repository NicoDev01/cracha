"use client";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { ShinyButton } from "@/components/ui/shiny-button";
import { useAppLocale } from "@/i18n/navigation";

const label = { de: "Kostenlos starten", en: "Start for free" } as const;

export function HeroStartButton() {
  const text = label[useAppLocale()];
  // Slot needs a React element created on the client, rather than an RSC child.
  return (
    <ShinyButton asChild label={text}>
      <AppEntryLink signedOutHref="/register">
        <span>{text}</span>
      </AppEntryLink>
    </ShinyButton>
  );
}
