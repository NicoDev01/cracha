import { bilingual } from "@/i18n/copy";
import { SiteConfig } from "@/types";

/**
 * The public origin. It used to fall back to the workers.dev hostname, and
 * NEXT_PUBLIC_APP_URL is set nowhere in the repo or the deploy workflow — so
 * every absolute URL built from this pointed at cracha.aimpact-agency.workers.dev
 * while the site lives on cracha-app.com. Canonical links and Open Graph URLs
 * are exactly the places where that is expensive: a crawler follows them.
 */
const site_url = process.env.NEXT_PUBLIC_APP_URL || "https://cracha-app.com";

export const marketingNavLinks = bilingual(
  [
    { title: "Nutzung", href: "/#how-to-use" },
    { title: "Beispiele", href: "/beispiele" },
    { title: "Warum CraCha?", href: "/#why-cracha" },
    { title: "Preise", href: "/preise" },
    { title: "Anleitung", href: "/website-mit-ki-durchsuchen" },
    { title: "Blog", href: "/blog" },
  ],
  [
    { title: "How it works", href: "/#how-to-use" },
    { title: "Examples", href: "/beispiele" },
    { title: "Why CraCha?", href: "/#why-cracha" },
    { title: "Pricing", href: "/preise" },
    { title: "Guide", href: "/website-mit-ki-durchsuchen" },
    { title: "Blog", href: "/blog" },
  ],
);

export const siteTitle = bilingual(
  "CraCha – Website mit KI durchsuchen, Unterseite für Unterseite",
  "CraCha – Search a website with AI, subpage by subpage",
);

// About 150 characters: Google cuts the search snippet off beyond that.
export const siteDescription = bilingual(
  "Frag nicht das Internet, frag die Website: CraCha liest Websites bis in die letzte Unterseite und beantwortet deine Fragen mit Quelle. 100 Credits gratis.",
  "Don't ask the internet. Ask the website: CraCha reads a website down to the last subpage and answers your questions with sources. 100 free credits.",
);

export const siteConfig: SiteConfig = {
  name: "CraCha",
  description: siteDescription.de,
  url: site_url,
  links: {
    twitter: "https://twitter.com/cracha_ai",
    github: "https://github.com/cracha/cracha-rag-agent",
  },
  mailSupport: "hallo@cracha-app.com",
};
