"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useAppLocale } from "@/i18n/navigation";
import { switchLocalePath } from "@/i18n/paths";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const names: Record<Locale, string> = { de: "Deutsch", en: "English" };

/**
 * DE | EN. Leads to the same page in the other language (/preise ↔
 * /en/pricing) and stores the choice in NEXT_LOCALE, so the browser-language
 * redirect never overrides it again. A full navigation rather than a router
 * push, so every client store starts over in the new language.
 */
function Switcher({ className }: { className?: string }) {
  const current = useAppLocale();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const query = searchParams?.toString();

  const choose = (locale: Locale) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.assign(event.currentTarget.href);
  };

  return (
    <div role="group" aria-label={current === "en" ? "Language" : "Sprache"} className={cn("flex items-center gap-1 text-sm font-medium", className)}>
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden="true" className="opacity-40">|</span>}
          <a
            href={`${switchLocalePath(pathname, locale)}${query ? `?${query}` : ""}`}
            hrefLang={locale}
            lang={locale}
            aria-label={names[locale]}
            aria-current={locale === current ? "true" : undefined}
            onClick={choose(locale)}
            className={cn(
              "rounded px-1.5 py-1 uppercase transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2",
              locale === current ? "opacity-100" : "opacity-60",
            )}
          >
            {locale}
          </a>
        </span>
      ))}
    </div>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <Switcher className={className} />
    </Suspense>
  );
}
