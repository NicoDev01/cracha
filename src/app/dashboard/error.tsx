"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

/** Inside the dashboard layout, so the sidebar stays and the rest of the app remains reachable. */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} homeHref="/dashboard" homeLabel="Zur Übersicht" />;
}
