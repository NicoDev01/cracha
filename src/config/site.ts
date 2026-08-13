import { SiteConfig } from "@/types";

/**
 * The public origin. It used to fall back to the workers.dev hostname, and
 * NEXT_PUBLIC_APP_URL is set nowhere in the repo or the deploy workflow — so
 * every absolute URL built from this pointed at cracha.aimpact-agency.workers.dev
 * while the site lives on cracha-app.com. Canonical links and Open Graph URLs
 * are exactly the places where that is expensive: a crawler follows them.
 */
const site_url = process.env.NEXT_PUBLIC_APP_URL || "https://cracha-app.com";

export const siteConfig: SiteConfig = {
  name: "CraCha",
  description:
    "CraCha kämpft sich durch jede Unterseite einer Website und baut dir daraus einen Chatbot. Du fragst, CraCha antwortet – hunderte Seiten in einem Chat.",
  url: site_url,
  links: {
    twitter: "https://twitter.com/cracha_ai",
    github: "https://github.com/cracha/cracha-rag-agent",
  },
  mailSupport: "support@cracha.ai",
};
