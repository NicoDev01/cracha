import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * The origin served no robots.txt, so Cloudflare answered with its managed
 * content-signals file: a page of comments, no `User-agent`, no rule, and — the
 * part that costs something — no `Sitemap:` line.
 *
 * /dashboard and /auth are disallowed because they need a session; a crawler
 * following them only collects redirects to the login page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth", "/api", "/debug"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
