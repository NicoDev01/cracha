import type { MetadataRoute } from "next";
import { publicPagePaths } from "@/config/public-pages";
import { siteConfig } from "@/config/site";
import { blogPosts } from "@/content/blog";
import { localizePath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";

/**
 * Every public page in both languages, each entry naming its counterpart
 * (hreflang), so a search engine pairs /preise with /en/pricing.
 */
function entries(internalPath: string, lastModified?: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${siteConfig.url}${localizePath(internalPath, locale)}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${siteConfig.url}${localizePath(internalPath, locale)}`,
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  }));
}

// Do not claim a new content modification date on every build.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entries("/"),
    ...publicPagePaths.flatMap((path) => entries(`/${path}`)),
    // A post's date is the day its content changed, so it can be reported.
    ...blogPosts.de.flatMap((post) => entries(`/blog/${post.slug}`, post.updated ?? post.published)),
  ];
}
