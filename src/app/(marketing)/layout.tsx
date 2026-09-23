import type { Metadata } from "next";

import { SiteShell } from "@/components/landing/layout/site-shell";
import { JsonLd } from "@/components/landing/json-ld";
import { siteConfig } from "@/config/site";
import { organizationJsonLd, softwareApplicationJsonLd } from "@/lib/marketing/structured-data";

/**
 * The landing page had a title and a description and nothing else. Shared in
 * WhatsApp, Slack or LinkedIn it arrived as a bare URL: no Open Graph tags at
 * all in the delivered HTML, and the one image the config pointed at
 * (/_static/og.jpg) answered 404 — the directory does not exist. The image now
 * comes from src/app/opengraph-image.png, which Next serves and tags itself.
 *
 * `alternates.canonical` matters here specifically because /home permanently
 * redirects to this page, so two paths lead to the same content.
 */
export const metadata: Metadata = {
  // Absolute, because the root layout carries a "%s | CraCha" template and the
  // brand is already the first word here — otherwise the tab reads
  // "CraCha – … | CraCha".
  title: { absolute: "CraCha – Websites mit KI durchsuchen" },
  description: siteConfig.description,
  keywords: [
    "Website mit KI durchsuchen",
    "Fragen an eine Website stellen",
    "KI Wissensdatenbank",
    "Website crawlen KI",
    "RAG Chatbot deutsch",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    siteName: siteConfig.name,
    title: "CraCha – Websites mit KI durchsuchen",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "CraCha – Websites mit KI durchsuchen",
    description: siteConfig.description,
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Site-wide: who runs CraCha and what it costs. Page-specific FAQPage
          markup is rendered by the page that shows the questions. */}
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={softwareApplicationJsonLd} />
      <SiteShell>{children}</SiteShell>
    </>
  );
}
