import { defineRouting } from "next-intl/routing";

export const locales = ["de", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";

/**
 * German keeps the URLs it always had (/, /preise …); English lives under /en
 * with English slugs. Internal paths — the folders under app/[locale] — are
 * the German ones, so `pathnames` maps an internal path to what each locale
 * shows in the address bar. Paths not listed here are the same in both.
 *
 * Detection follows the browser language, not the visitor's location: a
 * German in New York wants German, an English speaker in Berlin English.
 * next-intl reads Accept-Language only for unprefixed requests without a
 * NEXT_LOCALE cookie; the switcher sets that cookie, after which nothing is
 * redirected again. Search engines send no Accept-Language and see each
 * version at its own URL, linked by hreflang.
 */
export const pathnames = {
  "/preise": { de: "/preise", en: "/pricing" },
  "/beispiele": { de: "/beispiele", en: "/examples" },
  "/website-mit-ki-durchsuchen": { de: "/website-mit-ki-durchsuchen", en: "/search-a-website-with-ai" },
  "/dokumentation-durchsuchen": { de: "/dokumentation-durchsuchen", en: "/search-documentation" },
  "/kundenwebsite-durchsuchen": { de: "/kundenwebsite-durchsuchen", en: "/search-client-websites" },
  "/impressum": { de: "/impressum", en: "/legal-notice" },
  "/datenschutz": { de: "/datenschutz", en: "/privacy" },
  "/nutzungsbedingungen": { de: "/nutzungsbedingungen", en: "/terms" },
  "/widerrufsbelehrung": { de: "/widerrufsbelehrung", en: "/withdrawal" },
} as const satisfies Record<string, Record<Locale, string>>;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
  pathnames: {
    "/": "/",
    ...pathnames,
  },
});
