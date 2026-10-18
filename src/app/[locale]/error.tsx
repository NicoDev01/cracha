"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";
import { useAppLocale } from "@/i18n/navigation";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const en = useAppLocale() === "en";
  return <ErrorFallback error={error} retry={retry} homeHref="/" homeLabel={en ? "Back to the home page" : "Zur Startseite"} />;
}
