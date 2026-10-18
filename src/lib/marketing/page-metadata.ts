import type { Metadata } from "next";

import socialImage from "@/app/[locale]/(marketing)/opengraph-image.png";
import { languageAlternates, localizePath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";

/**
 * Metadata for a marketing subpage. A page that sets `openGraph` replaces the
 * parent's openGraph object wholesale (Next merges metadata shallowly), so the
 * share image is named here explicitly instead of relying on the segment's
 * opengraph-image file. A page with an opengraph-image of its own passes
 * `ownImage`: an image named here would outrank that file.
 *
 * `path` is the internal (German) path; canonical and Open Graph URL are the
 * localized one, and `alternates.languages` links both versions (hreflang).
 */
export function marketingPageMetadata({
  path,
  locale,
  title,
  description,
  keywords,
  ownImage = false,
}: {
  path: `/${string}`;
  locale: Locale;
  title: string;
  description: string;
  keywords?: string[];
  ownImage?: boolean;
}): Metadata {
  const url = localizePath(path, locale);
  const image = { url: socialImage.src, width: socialImage.width, height: socialImage.height, alt: "CraCha" };
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: { title, description, type: "website", locale: locale === "en" ? "en_US" : "de_DE", url, siteName: "CraCha", ...(ownImage ? {} : { images: [image] }) },
    twitter: { card: "summary_large_image", title, description, ...(ownImage ? {} : { images: [socialImage.src] }) },
  };
}
