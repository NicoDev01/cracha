import type { Metadata } from "next"
import { noIndex } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

import { ClientOnly } from "@/components/client-only"
import { CrawlInterface } from "@/components/dashboard/crawl/crawl-interface"

const meta = {
  de: { title: "Crawling", description: "Websites crawlen und als durchsuchbare Wissensbasis bereitstellen." },
  en: { title: "Crawling", description: "Crawl websites and make them available as a searchable knowledge base." },
} as const

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/crawl">): Promise<Metadata> {
  return { ...noIndex, ...meta[(await params).locale as Locale] }
}

export default function CrawlPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <ClientOnly fallback={
        <div className="flex h-full items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
        </div>
      }>
        <CrawlInterface />
      </ClientOnly>
    </div>
  )
}
