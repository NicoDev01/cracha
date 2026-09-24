import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/blog/markdown";
import { AppEntryLink } from "@/components/landing/app-entry-link";
import { JsonLd } from "@/components/landing/json-ld";
import { blogAuthor, blogPosts, findPost } from "@/content/blog";
import { blogPostingJsonLd, formatBlogDate } from "@/lib/marketing/blog";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

// Every post is prerendered; an unknown slug is a 404, not a render on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return {};
  // The preview image comes from opengraph-image.tsx in this folder.
  const metadata = marketingPageMetadata({ path: `/blog/${post.slug}`, title: post.title, description: post.description, keywords: post.keywords, ownImage: true });
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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const others = blogPosts.filter((other) => other.slug !== post.slug).slice(0, 3);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <JsonLd data={blogPostingJsonLd(post)} />
      <header>
        <Link href="/blog" className="text-sm text-muted-foreground underline">Alle Artikel</Link>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.description}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {blogAuthor} ·{" "}
          <time dateTime={post.published}>{formatBlogDate(post.published)}</time>
          {post.updated ? <> · aktualisiert am <time dateTime={post.updated}>{formatBlogDate(post.updated)}</time></> : null}
        </p>
      </header>

      <div className="mt-6">
        <Markdown source={post.body} />
      </div>

      <aside aria-label="Über den Autor" className="mt-14 border-t pt-6 text-sm leading-6 text-muted-foreground">
        <p>
          <strong className="text-foreground">{blogAuthor}</strong> entwickelt und betreibt CraCha. Fragen oder
          Korrekturen zu diesem Artikel an{" "}
          <a href="mailto:hallo@cracha-app.com" className="underline underline-offset-4">hallo@cracha-app.com</a>.
        </p>
      </aside>

      <div className="mt-14 rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Probier es mit deiner eigenen Website</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">
          100 Start-Credits gratis, keine Kreditkarte. Gib eine Start-Adresse ein und stell deine erste Frage.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <AppEntryLink
            signedOutHref="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Kostenlos starten
          </AppEntryLink>
          <Link href="/preise" className="underline underline-offset-4">Preise ansehen</Link>
        </div>
      </div>

      {others.length > 0 ? (
        <nav aria-label="Weitere Artikel" className="mt-14">
          <h2 className="text-lg font-semibold">Weitere Artikel</h2>
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
