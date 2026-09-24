import { crachaVsChatgptPerplexity } from "./cracha-vs-chatgpt-perplexity";
import { crachaVsNotebooklm } from "./cracha-vs-notebooklm";

/**
 * The blog. A post is one file in this folder: metadata plus a Markdown body.
 * To publish another one, add the file and list it here — the index page, the
 * article route, the sitemap and the session-free paths all read this array.
 *
 * Dates are plain ISO days and mean what they say: `updated` is the day the
 * content last changed, and it is what the sitemap reports as lastmod.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  published: `${number}-${number}-${number}`;
  updated?: `${number}-${number}-${number}`;
  keywords: string[];
  /** Markdown with GitHub tables. Rendered at build time. */
  body: string;
}

export const blogAuthor = "Nicolas Guerrero Tello";

export const blogPosts: readonly BlogPost[] = [crachaVsNotebooklm, crachaVsChatgptPerplexity].sort((a, b) =>
  (b.updated ?? b.published).localeCompare(a.updated ?? a.published),
);

export function findPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
