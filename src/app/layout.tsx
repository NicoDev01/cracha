import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

/**
 * Every page lives under app/[locale], whose layout renders <html> with the
 * right `lang`. This one only exists because app/not-found.tsx and the
 * metadata routes need a root above it, so it passes children through.
 *
 * `metadataBase` belongs here rather than in a single layout: without it Next
 * cannot turn a relative Open Graph or canonical path into the absolute URL a
 * crawler needs, and it silently drops the tag instead of failing the build.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
