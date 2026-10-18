import { DataDashboard } from '@/components/dashboard/data/data-dashboard';
import { Metadata } from "next";
import { noIndex } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

const meta = {
  de: { title: "Wissensbasen", description: "Verwalte deine Wissensbasen, sieh den Status und lies Websites neu ein." },
  en: { title: "Knowledge bases", description: "Manage your knowledge bases, see their status and read websites again." },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/data">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] }
}

export default async function DataPage({ params }: PageProps<"/[locale]/dashboard/data">) {
  const locale = (await params).locale as Locale
  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">{meta[locale].title}</h1>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <DataDashboard />
      </section>
    </div>
  );
}
