import type { MetadataRoute } from "next";
import { publicPagePaths } from "@/config/public-pages";
import { siteConfig } from "@/config/site";
import { blogPosts } from "@/content/blog";

// Do not claim a new content modification date on every build.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url },
    ...publicPagePaths.map((path) => ({
      url: `${siteConfig.url}/${path}`,
    })),
    // A post's date is the day its content changed, so it can be reported.
    ...blogPosts.map((post) => ({
      url: `${siteConfig.url}/blog/${post.slug}`,
      lastModified: post.updated ?? post.published,
    })),
  ];
}
