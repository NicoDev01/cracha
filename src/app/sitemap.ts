import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Do not claim a new content modification date on every build.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url },
    ...["website-mit-ki-durchsuchen", "impressum", "datenschutz", "nutzungsbedingungen"].map((path) => ({
      url: `${siteConfig.url}/${path}`,
    })),
  ];
}
