"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";
import { useAppLocale } from "@/i18n/navigation";

/** Inside the dashboard layout, so the sidebar stays and the rest of the app remains reachable. */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const en = useAppLocale() === "en";
  return <ErrorFallback error={error} retry={retry} homeHref="/dashboard" homeLabel={en ? "Back to the overview" : "Zur Übersicht"} />;
}
