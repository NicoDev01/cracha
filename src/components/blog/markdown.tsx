import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a blog body. Runs at build time (the article pages are prerendered),
 * so none of this reaches the browser as JavaScript.
 *
 * Headings start at h2: the page's h1 is the post title.
 */
const components: Components = {
  h2: ({ children }) => <h2 className="mt-12 scroll-mt-24 text-2xl font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-xl font-semibold">{children}</h3>,
  p: ({ children }) => <p className="mt-4 leading-7 text-muted-foreground">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7 text-muted-foreground">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-foreground/10 px-1 py-0.5 text-sm">{children}</code>,
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b bg-muted/40 p-3 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b p-3 align-top leading-6 text-muted-foreground">{children}</td>,
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className="text-foreground underline underline-offset-4">{children}</Link>
    ) : (
      <a href={href} className="text-foreground underline underline-offset-4" target="_blank" rel="noopener noreferrer">{children}</a>
    ),
};

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
}
