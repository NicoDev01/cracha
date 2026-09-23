import type { Metadata } from "next";

import socialImage from "@/app/(marketing)/opengraph-image.png";

/**
 * Metadata for a marketing subpage. A page that sets `openGraph` replaces the
 * parent's openGraph object wholesale (Next merges metadata shallowly), so the
 * share image is named here explicitly instead of relying on the segment's
 * opengraph-image file.
 */
export function marketingPageMetadata({
  path,
  title,
  description,
  keywords,
}: {
  path: `/${string}`;
  title: string;
  description: string;
  keywords?: string[];
}): Metadata {
  const image = { url: socialImage.src, width: socialImage.width, height: socialImage.height, alt: "CraCha" };
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: { title, description, type: "website", locale: "de_DE", url: path, siteName: "CraCha", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage.src] },
  };
}
