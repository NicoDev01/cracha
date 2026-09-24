import { ImageResponse } from "next/og";

import { blogAuthor, blogPosts, findPost } from "@/content/blog";

/**
 * One preview image per article, rendered at build time. Shared in LinkedIn or
 * Slack, every post used to arrive with the landing page's image, so two
 * different articles looked like the same link.
 *
 * No custom font: next/og brings Geist, which covers German, and reading a font
 * file here would need the file system at request time on the Worker.
 */
export const alt = "Artikel im CraCha-Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug);
  const title = post?.title ?? "CraCha Blog";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f5f5f5",
          backgroundColor: "#000",
          backgroundImage: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120, 180, 255, 0.35), transparent 70%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#a3a3a3" }}>CraCha · Blog</div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 60 : 70, lineHeight: 1.15, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#a3a3a3" }}>
          <span>{blogAuthor}</span>
          <span>cracha-app.com</span>
        </div>
      </div>
    ),
    size,
  );
}
