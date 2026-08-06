import { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard/overview/dashboard-overview";

export const metadata: Metadata = {
  title: "Dashboard - CraCha RAG-Agent",
  description: "Status der Wissensbasen und der laufenden Crawls",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
