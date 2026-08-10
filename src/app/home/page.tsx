import { permanentRedirect } from "next/navigation";

/**
 * The landing page moved to "/". This stays so existing links keep working, and
 * it redirects on the server: the old page did it from a useEffect, which meant
 * anything that does not run JavaScript never got past the loading screen.
 */
export default function HomePage() {
  permanentRedirect("/");
}
