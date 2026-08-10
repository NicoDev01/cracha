import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/landing/layout/site-shell";

export const metadata: Metadata = {
  title: "CraCha - Intelligente Wissensspeicher durch RAG-Technologie",
  description: "Verwandle komplexe Websites in intelligente, durchsuchbare Wissensspeicher. CraCha nutzt modernste RAG-Technologie für präzise, kontextuelle Antworten aus Ihren Daten.",
};

interface HomeLayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: HomeLayoutProps) {
  return <SiteShell>{children}</SiteShell>;
}
