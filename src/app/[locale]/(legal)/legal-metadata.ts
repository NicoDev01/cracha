import type { Metadata } from "next";

import { languageAlternates, localizePath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";

export function legalMetadata(path: `/${string}`, locale: Locale, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: localizePath(path, locale), languages: languageAlternates(path) },
  };
}
