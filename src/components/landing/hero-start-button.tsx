"use client";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { ShinyButton } from "@/components/ui/shiny-button";

export function HeroStartButton() {
  // Slot needs a React element created on the client, rather than an RSC child.
  return (
    <ShinyButton asChild label="Kostenlos starten">
      <AppEntryLink signedOutHref="/register">
        <span>Kostenlos starten</span>
      </AppEntryLink>
    </ShinyButton>
  );
}
