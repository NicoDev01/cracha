import { defaultLocale, locales, type Locale } from "./routing";

/**
 * The page's language outside React — in stores and plain helpers that cannot
 * call a hook. The [locale] layout writes it into <html lang>.
 */
export function currentLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const lang = document.documentElement.lang;
  return (locales as readonly string[]).includes(lang) ? (lang as Locale) : defaultLocale;
}

/** The German or English text for the page's language, for code outside React. */
export function pick(de: string, en: string): string {
  return currentLocale() === "en" ? en : de;
}
