import { siteConfig } from "@/config/site";
import { blogAuthor, type BlogPost } from "@/content/blog";
import { intlLocale } from "@/i18n/copy";
import { localizePath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";

export function formatBlogDate(isoDay: string, locale: Locale): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
}

/** BlogPosting markup built from the same fields the article page shows. */
export function blogPostingJsonLd(post: BlogPost, locale: Locale) {
  const url = `${siteConfig.url}${localizePath(`/blog/${post.slug}`, locale)}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    inLanguage: locale,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: blogAuthor },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };
}
