import type { Metadata } from "next"

/**
 * Keeps a page out of the index.
 *
 * The sign-in, registration and password pages were all inheriting the root
 * layout's metadata, so /login, /register, /auth-code-error and the landing
 * page went out under one identical title — four URLs competing for the same
 * query with three of them offering a form and nothing else.
 *
 * robots.txt is not enough on its own for the dashboard either: it stops a
 * crawler from fetching the page, not from listing the URL it found in a link
 * somewhere. `noindex` is the part that actually keeps it out, and a crawler
 * has to be allowed to read the page to see it — which is why the disallow in
 * robots.ts covers the API and the dashboard, while these pages carry the tag.
 */
export const noIndex: Metadata = {
  robots: { index: false, follow: false },
}
