"use client";

import NextLink from "next/link";
import { usePathname, useRouter as useNextRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { forwardRef, useMemo, type ComponentProps } from "react";

import { delocalizePath, localizePath } from "./paths";
import { defaultLocale, type Locale } from "./routing";

/**
 * The page's language. Outside the [locale] layout's provider — a component
 * rendered on its own in a test, say — it is the default language rather than
 * an exception.
 */
export function useAppLocale(): Locale {
  try {
    return useLocale() as Locale;
  } catch {
    return defaultLocale;
  }
}

/**
 * next/link that keeps the visitor in their language: href="/preise" renders
 * as /en/pricing on an English page. Hrefs are always written as the internal
 * German path, the same way the folders under app/[locale] are named.
 */
export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function Link({ href, ...props }, ref) {
  const locale = useAppLocale();
  const localized = typeof href === "string" ? localizePath(href, locale) : href;
  return <NextLink ref={ref} href={localized} {...props} />;
});

/** useRouter whose push/replace/prefetch take internal paths. */
export function useRouter() {
  const router = useNextRouter();
  const locale = useAppLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizePath(href, locale), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizePath(href, locale), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizePath(href, locale), options),
    }),
    [router, locale],
  );
}

/** The current path without the language prefix: "/en/dashboard" → "/dashboard". */
export function useInternalPathname(): string {
  return delocalizePath(usePathname() ?? "/").path;
}
