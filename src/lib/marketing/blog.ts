import { siteConfig } from "@/config/site";
import { blogAuthor, type BlogPost } from "@/content/blog";

export function formatBlogDate(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
}

/** BlogPosting markup built from the same fields the article page shows. */
export function blogPostingJsonLd(post: BlogPost) {
  const url = `${siteConfig.url}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    inLanguage: "de",
    url,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: blogAuthor },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };
}
