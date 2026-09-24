"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/error-reporting";

/**
 * Replaces the root layout when that itself fails, so no stylesheet, font or
 * theme is available here — hence the inline styles.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#f5f5f5" }}>
        <title>Fehler | CraCha</title>
        <main role="alert" style={{ maxWidth: 560, margin: "0 auto", padding: "96px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>Da ist etwas schiefgelaufen</h1>
          <p style={{ lineHeight: 1.7, color: "#a3a3a3" }}>
            Der Fehler wurde automatisch gemeldet. Versuch es noch einmal; hilft das nicht, schreib uns an{" "}
            <a href="mailto:hallo@cracha-app.com" style={{ color: "inherit" }}>hallo@cracha-app.com</a>.
          </p>
          <p style={{ marginTop: 32 }}>
            <button
              onClick={() => retry()}
              style={{ padding: "10px 20px", borderRadius: 999, border: 0, background: "#f5f5f5", color: "#0a0a0a", fontSize: 14, cursor: "pointer" }}
            >
              Erneut versuchen
            </button>{" "}
            {/* A full page load on purpose: the client router is what just failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ marginLeft: 12, color: "inherit" }}>Zur Startseite</a>
          </p>
        </main>
      </body>
    </html>
  );
}
