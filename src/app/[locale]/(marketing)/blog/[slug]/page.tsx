import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { Markdown } from "@/components/blog/markdown";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { JsonLd } from "@/components/landing/json-ld";
import { blogAuthor, blogPosts, findPost } from "@/content/blog";
import { bilingual } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { blogPostingJsonLd, formatBlogDate } from "@/lib/marketing/blog";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

const copy = bilingual(
  {
    all: "Alle Artikel",
    updated: "aktualisiert am",
    aboutLabel: "Über den Autor",
    about: "entwickelt und betreibt CraCha. Fragen oder Korrekturen zu diesem Artikel an",
    ctaHeading: "Probier es mit deiner eigenen Website",
    ctaText: "100 Start-Credits gratis, keine Kreditkarte. Gib eine Start-Adresse ein und stell deine erste Frage.",
    cta: "Kostenlos starten",
    pricing: "Preise ansehen",
    more: "Weitere Artikel",
  },
  {
    all: "All articles",
    updated: "updated on",
    aboutLabel: "About the author",
    about: "builds and runs CraCha. Questions or corrections about this article to",
    ctaHeading: "Try it with your own website",
    ctaText: "100 free credits, no credit card. Enter a start address and ask your first question.",
    cta: "Start for free",
    pricing: "See pricing",
    more: "More articles",
  },
);

// Every post is prerendered; an unknown slug is a 404, not a render on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => blogPosts[locale].map((post) => ({ locale, slug: post.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const post = findPost(slug, locale);
  if (!post) return {};
  // The preview image comes from opengraph-image.tsx in this folder.
  const metadata = marketingPageMetadata({ path: `/blog/${post.slug}`, locale, title: post.title, description: post.description, keywords: post.keywords, ownImage: true });
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      authors: [blogAuthor],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  setRequestLocale(locale);
  const post = findPost(slug, locale);
  if (!post) notFound();
  const t = copy[locale];
  const others = blogPosts[locale].filter((other) => other.slug !== post.slug).slice(0, 3);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <JsonLd data={blogPostingJsonLd(post, locale)} />
      <header>
        <Link href="/blog" className="text-sm text-muted-foreground underline">{t.all}</Link>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.description}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {blogAuthor} ·{" "}
          <time dateTime={post.published}>{formatBlogDate(post.published, locale)}</time>
          {post.updated ? <> · {t.updated} <time dateTime={post.updated}>{formatBlogDate(post.updated, locale)}</time></> : null}
        </p>
      </header>

      <div className="mt-6">
        <Markdown source={post.body} />
      </div>

      <aside aria-label={t.aboutLabel} className="mt-14 border-t pt-6 text-sm leading-6 text-muted-foreground">
        <p>
          <strong className="text-foreground">{blogAuthor}</strong> {t.about}{" "}
          <a href="mailto:hallo@cracha-app.com" className="underline underline-offset-4">hallo@cracha-app.com</a>.
        </p>
      </aside>

      <div className="mt-14 rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">{t.ctaHeading}</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">{t.ctaText}</p>
        <div className="flex flex-wrap items-center gap-4">
          <AppEntryLink
            signedOutHref="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {t.cta}
          </AppEntryLink>
          <Link href="/preise" className="underline underline-offset-4">{t.pricing}</Link>
        </div>
      </div>

      {others.length > 0 ? (
        <nav aria-label={t.more} className="mt-14">
          <h2 className="text-lg font-semibold">{t.more}</h2>
          <ul className="mt-4 space-y-3">
            {others.map((other) => (
              <li key={other.slug}>
                <Link href={`/blog/${other.slug}`} className="underline underline-offset-4">{other.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </article>
  );
}
