import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * Prerendered pages come out of Workers static assets.
 *
 * Without an incremental cache OpenNext has nowhere to look up the HTML that
 * `next build` prerendered, so it rendered every page again on every request
 * — `x-nextjs-cache: MISS` on the landing page, and most of its 0.5–1 s first
 * byte was the Worker building the same HTML it had built at deploy time.
 *
 * The build does write those pages: one `.cache` file per route in
 * `.open-next/cache`. This cache reads them from `cdn-cgi/_next_cache` in the
 * static assets, where `scripts/populate-static-cache.mjs` copies them as part
 * of `build:cf` (`opennextjs-cloudflare deploy` would do the same, but CI
 * deploys the artifact with plain `wrangler deploy`).
 *
 * It is read-only, which fits: every page here is fully prerendered and
 * nothing revalidates. The day a page wants ISR or `revalidateTag`, this has
 * to become the R2 or KV cache — the static-assets cache cannot write.
 *
 * What remains of the first byte is the Worker starting up. The CDN does not
 * absorb it because the Worker answers before the cache does, and the
 * `Vary: rsc, next-router-state-tree, …` header Next sends would keep
 * Cloudflare from caching the response anyway.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  // No `enableCacheInterception`. It answered from the routing layer without
  // Next, but it cannot serve the router's segment prefetches while Next 16.3's
  // default `prefetchInlining` is on: asked for `/_tree`, it returns the whole
  // page payload, the router rejects it and asks again. In production that was
  // a loop of ~20 prefetch requests a second for /, /login and /register on
  // every open landing page (@opennextjs/aws 4.1.0, still so in 4.1.5). Next
  // itself reads the same cache entries and answers segments correctly.
});
