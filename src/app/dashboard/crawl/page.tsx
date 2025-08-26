import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import { CrawlInterface } from "@/components/dashboard/crawl/crawl-interface";
import { ClientOnly } from "@/components/client-only";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Crawling - CraCha RAG-Agent Dashboard",
  description: "Crawlen Sie Websites und erstellen Sie intelligente Wissensspeicher für RAG-basierte Abfragen",
};

export default function CrawlPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Website Crawling" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <ClientOnly fallback={
          <div className="mx-auto w-full max-w-[630px] text-center">
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          </div>
        }>
          <CrawlInterface />
        </ClientOnly>
      </div>
    </div>
  );
}