"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} homeHref="/" homeLabel="Zur Startseite" />;
}
