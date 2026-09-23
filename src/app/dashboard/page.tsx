import { Metadata } from "next";
import { noIndex } from "@/lib/seo";

import { DashboardOverview } from "@/components/dashboard/overview/dashboard-overview";

export const metadata: Metadata = {
  ...noIndex,
  title: "Übersicht",
  description: "Guthaben, Wissensbasen und laufende Einlesevorgänge",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
