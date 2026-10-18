import { Metadata } from "next";
import { noIndex } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

import { DashboardOverview } from "@/components/dashboard/overview/dashboard-overview";

const meta = {
  de: { title: "Übersicht", description: "Guthaben, Wissensbasen und laufende Einlesevorgänge" },
  en: { title: "Overview", description: "Balance, knowledge bases and running crawls" },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] }
}

export default function DashboardPage() {
  return <DashboardOverview />;
}
