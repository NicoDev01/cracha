import { Metadata } from "next";
import { noIndex } from "@/lib/seo";

import { DashboardOverview } from "@/components/dashboard/overview/dashboard-overview";

export const metadata: Metadata = {
  ...noIndex,
  title: "Dashboard",
  description: "Status der Wissensbasen und der laufenden Crawls",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
