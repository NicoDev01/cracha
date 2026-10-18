import { setRequestLocale } from "next-intl/server";

import { blogPosts } from "@/content/blog";
import { bilingual } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatBlogDate } from "@/lib/marketing/blog";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

const copy = bilingual(
  {
    title: "Blog: Websites mit KI durchsuchen",
    description: "Vergleiche, Anleitungen und Praxistipps: wie du Websites, Dokumentationen und Hilfe-Center mit KI durchsuchst und wann welches Werkzeug passt.",
    back: "CraCha kennenlernen",
    intro: "Vergleiche, Anleitungen und Praxistipps rund um Websites, die du mit KI durchsuchen willst.",
  },
  {
    title: "Blog: searching websites with AI",
    description: "Comparisons, guides and practical tips: how to search websites, documentation and help centers with AI, and which tool fits when.",
    back: "Discover CraCha",
    intro: "Comparisons, guides and practical tips for websites you want to search with AI.",
  },
);

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">) {
  const locale = (await params).locale as Locale;
  return marketingPageMetadata({ path: "/blog", locale, title: copy[locale].title, description: copy[locale].description });
}

export default async function BlogIndexPage({ params }: PageProps<"/[locale]/blog">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = copy[locale];
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <header>
        <Link href="/" className="text-sm text-muted-foreground underline">{t.back}</Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t.intro}</p>
      </header>
      <ul className="mt-12 space-y-6">
        {blogPosts[locale].map((post) => (
          <li key={post.slug}>
            <article className="rounded-2xl border p-6 transition-colors hover:bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <time dateTime={post.updated ?? post.published}>{formatBlogDate(post.updated ?? post.published, locale)}</time>
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
