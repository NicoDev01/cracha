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
      url: `${siteConfig.url}/`,
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
