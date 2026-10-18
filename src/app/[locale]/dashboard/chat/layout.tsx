import type { Metadata } from "next";

import { noIndex } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

/**
 * The page itself is a client component — it loads the chat through
 * `dynamic(..., { ssr: false })` — so it cannot export metadata. It used to
 * try anyway, with a `next/head` block: that is the Pages Router API and the
 * App Router ignores it entirely, so the tags never reached the document.
 */
const meta = {
  de: { title: "Chat", description: "Stelle Fragen an deine eingelesenen Websites und sieh, aus welcher Seite die Antwort stammt." },
  en: { title: "Chat", description: "Ask questions about the websites you read and see which page each answer comes from." },
} as const;

export async function generateMetadata({ params }: LayoutProps<"/[locale]/dashboard/chat">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] };
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
