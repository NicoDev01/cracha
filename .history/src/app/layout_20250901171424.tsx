import type { Metadata } from "next";
import "./home/globals.css";

export const metadata: Metadata = {
  title: "CraCha - Intelligente Wissensspeicher durch RAG-Technologie",
  description: "Verwandle komplexe Websites in intelligente, durchsuchbare Wissensspeicher. CraCha nutzt modernste RAG-Technologie für präzise, kontextuelle Antworten aus Ihren Daten.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
