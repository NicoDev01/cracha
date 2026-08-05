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
      <PageBreadcrumb pageTitle="Datenbankverwaltung" />
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <DataDashboard />
      </section>
    </div>
  );
}
