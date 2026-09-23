import { siteConfig } from "@/config/site";
import { CREDIT_PACKAGES } from "@/lib/credit-tariff";
import type { FaqItem } from "@/lib/marketing/faq";

/**
 * schema.org objects for the public pages. Everything here is derived from
 * data the pages already render — the tariff, the site config, the FAQ arrays —
 * so the markup cannot promise something the visible page does not say.
 */

const organizationId = `${siteConfig.url}/#organization`;

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/images/logo/logo_120.png`,
  email: siteConfig.mailSupport,
};

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "de",
  description: siteConfig.description,
  publisher: { "@id": organizationId },
  offers: CREDIT_PACKAGES.map((pack) => ({
    "@type": "Offer",
    name: `${pack.label}: ${pack.credits.toLocaleString("de-DE")} Credits`,
    price: (pack.priceCents / 100).toFixed(2),
    priceCurrency: "EUR",
    url: `${siteConfig.url}/#fragen`,
  })),
};

export function faqPageJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * JSON.stringify does not escape `<`, so a string containing `</script>` would
 * end the tag early. The Next.js JSON-LD guide recommends this replacement.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
