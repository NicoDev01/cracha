import { defaultLocale, locales, pathnames, type Locale } from "./routing";

type InternalPath = keyof typeof pathnames;

function splitHref(href: string): [string, string] {
  const index = href.search(/[?#]/);
  return index === -1 ? [href, ""] : [href.slice(0, index), href.slice(index)];
}

/** Whether an href points at a page of this site that has a locale. */
function isLocalizable(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/") && href !== "/api";
}

/**
 * Turns an internal (German) path into the one the address bar shows for a
 * locale: "/preise" → "/en/pricing", "/dashboard/chat?id=1" → "/en/dashboard/chat?id=1".
 * Anything that is not a page of this site (other hosts, /api, anchors) is
 * returned unchanged.
 */
export function localizePath(href: string, locale: Locale): string {
  if (!isLocalizable(href)) return href;
  const [path, rest] = splitHref(href);
  // Already carries a language ("/en/dashboard", e.g. an auth return target).
  if (locales.some((other) => other !== defaultLocale && (path === `/${other}` || path.startsWith(`/${other}/`)))) return href;
  const translated = (pathnames as Record<string, Record<Locale, string>>)[path]?.[locale] ?? path;
  if (locale === defaultLocale) return `${translated}${rest}`;
  return `${translated === "/" ? `/${locale}` : `/${locale}${translated}`}${rest}`;
}

/**
 * The reverse: what the browser shows ("/en/pricing") back to the locale and
 * the internal path ("/preise"). Used to keep active-link checks and the
 * language switcher independent of the prefix.
 */
export function delocalizePath(pathname: string): { locale: Locale; path: string } {
  const [path, rest] = splitHref(pathname);
  const prefixed = locales.find((locale) => locale !== defaultLocale && (path === `/${locale}` || path.startsWith(`/${locale}/`)));
  if (!prefixed) return { locale: defaultLocale, path: `${path}${rest}` };
  const external = path.slice(prefixed.length + 1) || "/";
  const internal = (Object.keys(pathnames) as InternalPath[]).find((key) => pathnames[key][prefixed] === external) ?? external;
  return { locale: prefixed, path: `${internal}${rest}` };
}

/** The same page in another language, for the switcher and hreflang. */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localizePath(delocalizePath(pathname).path, target);
}

/** Absolute alternates for metadata: one URL per language plus x-default. */
export function languageAlternates(internalPath: string): Record<string, string> {
  return {
    de: localizePath(internalPath, "de"),
    en: localizePath(internalPath, "en"),
    "x-default": localizePath(internalPath, defaultLocale),
  };
}
