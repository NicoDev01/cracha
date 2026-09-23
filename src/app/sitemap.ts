import type { MetadataRoute } from "next";
import { publicPagePaths } from "@/config/public-pages";
import { siteConfig } from "@/config/site";

// Do not claim a new content modification date on every build.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url },
    ...publicPagePaths.map((path) => ({
      url: `${siteConfig.url}/${path}`,
    })),
  ];
}
