import type { Metadata } from "next";
import { Suspense } from "react";
import "./home/globals.css";
import { AccountDeletedNotice } from "@/components/account-deleted-notice";
import { siteConfig } from "@/config/site";

/**
 * The fallback for every route that does not set its own.
 *
 * `metadataBase` belongs here rather than in a single layout: without it Next
 * cannot turn a relative Open Graph or canonical path into the absolute URL a
 * crawler needs, and it silently drops the tag instead of failing the build.
 *
 * The title used to be "Intelligente Wissensspeicher durch RAG-Technologie" —
 * three words nobody types into a search box, and none of them naming what the
 * thing is.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "CraCha – Verwandle Websites in Wissensbasen",
    template: "%s | CraCha",
  },
  description: siteConfig.description,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

// Runs before the browser paints anything. React applies the theme only after
// hydration, which is far too late — the page would paint light and snap to
// dark, or in the sign-in card's case paint dark and snap to light.
//
// Two reasons to end up light: the visitor chose it, or this is one of the
// sign-in pages. Those are a single light card by design and have no dark
// version; the layout takes the class off again on client-side navigation,
// where this script does not run a second time.
const applyThemeBeforePaint = `
try {
  var alwaysLight = /^\\/(login|register|reset-password|confirm|auth-code-error|auth\\/)/
  if (alwaysLight.test(location.pathname) || localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark')
  }
} catch (error) {}
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de" suppressHydrationWarning className="dark overflow-x-hidden">
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyThemeBeforePaint }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Suspense fallback={null}>
          <AccountDeletedNotice />
        </Suspense>
      </body>
    </html>
  );
}
