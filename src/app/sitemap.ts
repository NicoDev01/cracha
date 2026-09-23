import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Do not claim a new content modification date on every build.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url },
    ...["website-mit-ki-durchsuchen", "kundenwebsite-durchsuchen", "dokumentation-durchsuchen", "impressum", "datenschutz", "nutzungsbedingungen", "widerrufsbelehrung"].map((path) => ({
      url: `${siteConfig.url}/${path}`,
    })),
  ];
}
