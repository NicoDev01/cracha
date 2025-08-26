import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import { DataDashboard } from '@/components/dashboard/data/data-dashboard';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenbank-Verwaltung - CraCha RAG-Agent Dashboard",
  description: "Verwalten Sie Ihre Datenbanken, überwachen Sie den Status und führen Sie Re-Crawls durch",
};

export default function DataPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Datenbank-Verwaltung" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Ihre Wissensspeicher
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Verwalten Sie Ihre gecrawlten Datenbanken, überwachen Sie den Status und führen Sie Re-Crawls durch
          </p>
        </div>
        
        <div className="mt-8">
          <DataDashboard />
        </div>
      </div>
    </div>
  );
}