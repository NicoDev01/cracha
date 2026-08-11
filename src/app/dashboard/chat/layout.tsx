import type { Metadata } from "next";

import { noIndex } from "@/lib/seo";

/**
 * The page itself is a client component — it loads the chat through
 * `dynamic(..., { ssr: false })` — so it cannot export metadata. It used to
 * try anyway, with a `next/head` block: that is the Pages Router API and the
 * App Router ignores it entirely, so the tags never reached the document.
 */
export const metadata: Metadata = {
  ...noIndex,
  title: "Chat",
  description: "Stelle Fragen an deine eingelesenen Websites und sieh, aus welcher Seite die Antwort stammt.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
