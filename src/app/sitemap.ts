import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * https://cracha-app.com/sitemap.xml answered 404 — there was none. Only the
 * public pages belong in here; everything under /dashboard needs a session and
 * everything under /auth is a handshake, so a crawler reaching either learns
 * nothing and wastes the site's crawl budget on redirects.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      // No trailing slash, because that is the exact string the canonical link
      // and og:url carry. The two forms are the same address to a crawler, but
      // Search Console matches some of its reports on the literal text, and a
      // home page listed one way and declared the other shows up there as
      // "no referring sitemaps found".
      url: siteConfig.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...["impressum", "datenschutz", "nutzungsbedingungen"].map((path) => ({
      url: `${siteConfig.url}/${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
