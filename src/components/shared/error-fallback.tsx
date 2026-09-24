"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/error-reporting";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref: string;
  homeLabel: string;
}

/** What error.tsx shows instead of Next's bare "Application error" screen. */
export function ErrorFallback({ error, retry, homeHref, homeLabel }: ErrorFallbackProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Da ist etwas schiefgelaufen</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Der Fehler wurde automatisch gemeldet. Versuch es noch einmal; hilft das nicht, schreib uns an{" "}
        <a href="mailto:hallo@cracha-app.com" className="underline">hallo@cracha-app.com</a>
        {error.digest ? <> und nenn den Fehlercode <code className="font-mono">{error.digest}</code></> : null}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()} rounded="full">Erneut versuchen</Button>
        <Button asChild variant="outline" rounded="full">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
