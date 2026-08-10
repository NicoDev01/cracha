import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * No incremental cache on purpose.
 *
 * The obvious reading of `x-nextjs-cache: MISS` on every request is that a
 * cache is missing, but every page here is fully prerendered and nothing
 * revalidates, so OpenNext writes no cache entries at all — the build produces
 * an empty `cdn-cgi/_next_cache`. A cache override would be a no-op today and a
 * trap the day a page wants ISR, because the static-assets cache cannot write.
 *
 * The ~500 ms first byte is the Worker itself, and the reason the CDN does not
 * absorb it is the `Vary: rsc, next-router-state-tree, …` header Next sends for
 * React Server Components: Cloudflare declines to cache a response that varies
 * on anything but Accept-Encoding. Fixing that needs a Cache Rule with a custom
 * cache key on the zone, which lives in the dashboard, not in this file.
 */
export default defineCloudflareConfig();
