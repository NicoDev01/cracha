import Link from "next/link";

import "./globals.css";

/**
 * Only reached by requests the middleware does not route into a language —
 * normally none. Every page lives under app/[locale], which has its own,
 * localized 404 inside the site layout.
 */
export default function RootNotFound() {
  return (
    <html lang="de">
      <body className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">404</h1>
          <p className="mt-3">Diese Seite gibt es nicht. · This page doesn&apos;t exist.</p>
          <Link href="/" className="mt-6 inline-block underline underline-offset-4">CraCha</Link>
        </div>
      </body>
    </html>
  );
}
