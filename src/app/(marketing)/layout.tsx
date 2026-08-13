import type { Metadata } from "next";

import { SiteShell } from "@/components/landing/layout/site-shell";
import { siteConfig } from "@/config/site";

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
  title: { absolute: "CraCha – verwandle Websites in Chatbots" },
  description: siteConfig.description,
  keywords: [
    "Website in Chatbot verwandeln",
    "Chatbot für eigene Website",
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
    title: "CraCha – verwandle Websites in Chatbots",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "CraCha – verwandle Websites in Chatbots",
    description: siteConfig.description,
  },
};

/**
 * Tells a search engine what kind of thing this page is about. Static, so it
 * costs a few hundred bytes of HTML and no runtime.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "de",
  description: siteConfig.description,
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteShell>{children}</SiteShell>
    </>
  );
}
