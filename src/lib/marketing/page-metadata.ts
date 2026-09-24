import type { Metadata } from "next";

import socialImage from "@/app/(marketing)/opengraph-image.png";

/**
 * Metadata for a marketing subpage. A page that sets `openGraph` replaces the
 * parent's openGraph object wholesale (Next merges metadata shallowly), so the
 * share image is named here explicitly instead of relying on the segment's
 * opengraph-image file. A page with an opengraph-image of its own passes
 * `ownImage`: an image named here would outrank that file.
 */
export function marketingPageMetadata({
  path,
  title,
  description,
  keywords,
  ownImage = false,
}: {
  path: `/${string}`;
  title: string;
  description: string;
  keywords?: string[];
  ownImage?: boolean;
}): Metadata {
  const image = { url: socialImage.src, width: socialImage.width, height: socialImage.height, alt: "CraCha" };
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: { title, description, type: "website", locale: "de_DE", url: path, siteName: "CraCha", ...(ownImage ? {} : { images: [image] }) },
    twitter: { card: "summary_large_image", title, description, ...(ownImage ? {} : { images: [socialImage.src] }) },
  };
}
