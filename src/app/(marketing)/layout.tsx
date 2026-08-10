import type { Metadata } from "next";

import { SiteShell } from "@/components/landing/layout/site-shell";

export const metadata: Metadata = {
  title: "CraCha – Websites in durchsuchbare Wissensbasen verwandeln",
  description:
    "CraCha liest eine komplette Website ein und beantwortet Fragen dazu mit Quellenangabe. Statt hunderte Unterseiten zu durchsuchen, fragst du einmal.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
