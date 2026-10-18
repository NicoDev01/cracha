import type { Locale } from "./routing";

/**
 * Texts are written next to the component that shows them, German first and
 * English second. `en` has to have exactly the shape of `de` — a missing or
 * misspelt key is a type error, so no string can exist in only one language.
 *
 *   const copy = bilingual({ title: "Preise" }, { title: "Pricing" });
 *   copy[locale].title
 */
export function bilingual<T>(de: T, en: NoInfer<T>): Record<Locale, T> {
  return { de, en };
}

/** Intl tag for number and date formatting. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "de-DE";
}

export function formatEuro(cents: number, locale: Locale, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(cents / 100);
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(intlLocale(locale));
}
