import PageBreadcrumb from "@/components/dashboard/common/PageBreadCrumb";
import { DataDashboard } from '@/components/dashboard/data/data-dashboard';
import { Metadata } from "next";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndex,
  title: "Wissensbasen",
  description: "Verwalte deine Wissensbasen, sieh den Status und lies Websites neu ein.",
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
