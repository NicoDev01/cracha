import { notFound } from "next/navigation";

// The middleware rewrites every unknown path into a locale (/foo → /de/foo),
// so it lands here and gets the localized 404 inside the site layout.
export default function CatchAll() {
  notFound();
}
