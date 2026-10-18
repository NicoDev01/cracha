import type { Metadata } from "next";

import { SiteShell } from "@/components/landing/layout/site-shell";
import { JsonLd } from "@/components/landing/json-ld";
import { siteConfig, siteDescription, siteTitle } from "@/config/site";
import { bilingual } from "@/i18n/copy";
import { languageAlternates, localizePath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";
import { shareImage } from "@/lib/marketing/page-metadata";
import { organizationJsonLd, softwareApplicationJsonLd } from "@/lib/marketing/structured-data";

const keywords = bilingual(
  [
    "Website mit KI durchsuchen",
    "ganze Website durchsuchen",
    "Fragen an eine Website stellen",
    "Unterseiten durchsuchen",
    "Website crawlen KI",
    "Dokumentation mit KI durchsuchen",
  ],
  [
    "search a website with AI",
    "chat with a website",
    "ask questions about a website",
    "AI website search",
    "crawl website AI",
    "search documentation with AI",
  ],
);

/**
 * The landing page had a title and a description and nothing else. Shared in
 * WhatsApp, Slack or LinkedIn it arrived as a bare URL: no Open Graph tags at
 * all in the delivered HTML, and the one image the config pointed at
 * (/_static/og.jpg) answered 404 — the directory does not exist. The image is
 * the language's own, from public/og.
 *
 * `alternates.canonical` matters here specifically because /home permanently
 * redirects to this page, so two paths lead to the same content.
 */
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const url = localizePath("/", locale);
  return {
    // Absolute, because the root layout carries a "%s | CraCha" template and the
    // brand is already the first word here — otherwise the tab reads
    // "CraCha – … | CraCha".
    title: { absolute: siteTitle[locale] },
    description: siteDescription[locale],
    keywords: keywords[locale],
    alternates: { canonical: url, languages: languageAlternates("/") },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "de_DE",
      url,
      siteName: siteConfig.name,
      title: siteTitle[locale],
      description: siteDescription[locale],
      images: [shareImage(locale)],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle[locale],
      description: siteDescription[locale],
      images: [shareImage(locale).url],
    },
  };
}

export default async function MarketingLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  return (
    <>
      {/* Site-wide: who runs CraCha and what it costs. Page-specific FAQPage
          markup is rendered by the page that shows the questions. */}
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={softwareApplicationJsonLd(locale)} />
      <SiteShell>{children}</SiteShell>
    </>
  );
}
