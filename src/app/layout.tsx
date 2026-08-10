import type { Metadata } from "next";
import "./home/globals.css";

export const metadata: Metadata = {
  title: "CraCha - Intelligente Wissensspeicher durch RAG-Technologie",
  description: "Verwandle komplexe Websites in intelligente, durchsuchbare Wissensspeicher. CraCha nutzt modernste RAG-Technologie für präzise, kontextuelle Antworten aus Ihren Daten.",
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
      </body>
    </html>
  );
}
