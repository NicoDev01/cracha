import type { Metadata } from "next"
import { noIndex } from "@/lib/seo";

import { ClientOnly } from "@/components/client-only"
import { CrawlInterface } from "@/components/dashboard/crawl/crawl-interface"

export const metadata: Metadata = {
  ...noIndex,
  title: "Website einlesen",
  description: "Websites einlesen und als durchsuchbare Wissensbasis bereitstellen.",
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
