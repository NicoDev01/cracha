import Link from "next/link";

import { blogPosts } from "@/content/blog";
import { formatBlogDate } from "@/lib/marketing/blog";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

export const metadata = marketingPageMetadata({
  path: "/blog",
  title: "Blog: Websites mit KI durchsuchen",
  description:
    "Vergleiche, Anleitungen und Praxistipps: wie du Websites, Dokumentationen und Hilfe-Center mit KI durchsuchst und wann welches Werkzeug passt.",
});

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <header>
        <Link href="/" className="text-sm text-muted-foreground underline">CraCha kennenlernen</Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Vergleiche, Anleitungen und Praxistipps rund um Websites, die du mit KI durchsuchen willst.
        </p>
      </header>
      <ul className="mt-12 space-y-6">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <article className="rounded-2xl border p-6 transition-colors hover:bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <time dateTime={post.updated ?? post.published}>{formatBlogDate(post.updated ?? post.published)}</time>
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                <Link href={`/blog/${post.slug}`} className="hover:underline">{post.title}</Link>
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">{post.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
