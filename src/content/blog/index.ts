import { crachaVsChatgptPerplexity } from "./cracha-vs-chatgpt-perplexity";
import { crachaVsNotebooklm } from "./cracha-vs-notebooklm";
import type { Locale } from "@/i18n/routing";

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

const byDate = (posts: BlogPost[]) =>
  posts.sort((a, b) => (b.updated ?? b.published).localeCompare(a.updated ?? a.published));

/** Every post exists in both languages under the same slug. */
export const blogPosts: Record<Locale, readonly BlogPost[]> = {
  de: byDate([crachaVsNotebooklm.de, crachaVsChatgptPerplexity.de]),
  en: byDate([crachaVsNotebooklm.en, crachaVsChatgptPerplexity.en]),
};

export function findPost(slug: string, locale: Locale): BlogPost | undefined {
  return blogPosts[locale].find((post) => post.slug === slug);
}
