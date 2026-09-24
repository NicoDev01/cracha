import { blogPosts } from "@/content/blog";

/**
 * The public, prerendered pages besides "/" and the blog articles, which come
 * from src/content/blog. The sitemap lists them, and the
 * middleware leaves them alone: nothing on them reads the session on the
 * server, so verifying it there only delayed the first byte — for a signed-in
 * visitor by a round trip to Supabase.
 */
export const publicPagePaths = [
  "beispiele",
  "website-mit-ki-durchsuchen",
  "kundenwebsite-durchsuchen",
  "dokumentation-durchsuchen",
  "preise",
  "blog",
  "impressum",
  "datenschutz",
  "nutzungsbedingungen",
  "widerrufsbelehrung",
] as const;

const sessionFreePaths = new Set<string>([
  "/",
  ...publicPagePaths.map((path) => `/${path}`),
  ...blogPosts.map((post) => `/blog/${post.slug}`),
  "/robots.txt",
  "/sitemap.xml",
]);

export function isSessionFreePath(pathname: string): boolean {
  return sessionFreePaths.has(pathname);
}
