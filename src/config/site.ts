import { SidebarNavItem, SiteConfig } from "@/types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL || "https://cracha.pages.dev";

export const siteConfig: SiteConfig = {
  name: "CraCha",
  description:
    "Verwandle komplexe Websites in intelligente, durchsuchbare Wissensspeicher mit modernster RAG-Technologie. CraCha macht Wissensmanagement einfach und effizient.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    twitter: "https://twitter.com/cracha_ai",
    github: "https://github.com/cracha/cracha-rag-agent",
  },
  mailSupport: "support@cracha.ai",
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Unternehmen",
    items: [
      { title: "Über uns", href: "/about" },
      { title: "Kontakt", href: "/contact" },
      { title: "AGB", href: "/terms" },
      { title: "Datenschutz", href: "/privacy" },
    ],
  },
  {
    title: "Produkt",
    items: [
      { title: "Features", href: "/#features" },
      { title: "Preise", href: "/pricing" },
      { title: "API", href: "/api-docs" },
      { title: "Status", href: "/status" },
    ],
  },
  {
    title: "Ressourcen",
    items: [
      { title: "Dokumentation", href: "/docs" },
      { title: "Tutorials", href: "/tutorials" },
      { title: "Blog", href: "/blog" },
      { title: "Support", href: "/support" },
    ],
  },
];
