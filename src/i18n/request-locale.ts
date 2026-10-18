import { delocalizePath } from "./paths";
import { defaultLocale, type Locale } from "./routing";

/**
 * The language of an API request. API routes have no locale in their path, so
 * they read where the call came from: the dashboard page in the Referer
 * ("/en/dashboard" → en), else the NEXT_LOCALE cookie, else the browser
 * language. Same-origin fetches send the full Referer under the site's
 * strict-origin-when-cross-origin policy.
 */
export function localeFromRequest(request: Request): Locale {
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.host === new URL(request.url).host) return delocalizePath(url.pathname).locale;
    } catch {
      // A malformed Referer just falls through to the next signal.
    }
  }
  const cookie = /(?:^|;\s*)NEXT_LOCALE=(de|en)\b/.exec(request.headers.get("cookie") ?? "")?.[1];
  if (cookie === "de" || cookie === "en") return cookie;
  const language = request.headers.get("accept-language")?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (language.startsWith("de")) return "de";
  return language ? "en" : defaultLocale;
}

/** Picks the German or English text for the request's language. */
export function say(locale: Locale, de: string, en: string): string {
  return locale === "en" ? en : de;
}
