// Public, read-only deployment check. Never starts a crawl or a paid chat.
import { createRequire } from 'node:module';

// Next answers an RSC request whose `_rsc` value does not match its router
// headers with a redirect to the right value. Behind the language rewrite an
// empty value gets lost on the way, so a made-up or empty hash loops forever —
// the real router always sends a state tree, so ask the way it does.
const { computeCacheBustingSearchParam } = createRequire(import.meta.url)('next/dist/shared/lib/router/utils/cache-busting-search-param.js');
const origin = process.argv[2] || 'http://localhost:3000';
const expected = process.argv[3];

async function check() {
  const response = await fetch(new URL('/api/version', origin), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const version = await response.json();
  if (!response.ok || !version.release || (expected && version.release !== expected)) throw new Error('Wrong release is serving the public domain');
  for (const path of ['/', '/beispiele', '/register', '/widerrufsbelehrung', '/nutzungsbedingungen', '/en', '/en/pricing']) {
    const response = await fetch(new URL(path, origin), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const html = await response.text();
    if (!response.ok || !html.includes('<title>')) throw new Error(`Page unavailable: ${path}`);
    if (path === '/' && (!html.includes('Frag nicht das Internet') || !html.includes('kein Abo'))) throw new Error('Landing page does not show the current headline and pricing FAQ');
    if (path === '/en' && (!html.includes('<html lang="en"') || !html.includes('Ask ') || !html.includes('no subscription'))) throw new Error('English landing page is missing or not in English');
    if (path === '/' && !/hreflang="en"/i.test(html)) throw new Error('Landing page does not link its English version (hreflang)');
  }
  // A router prefetch asks for one segment. Answered with the whole page
  // payload instead, the router rejects it and asks again, forever — which is
  // what OpenNext's cache interception did (open-next.config.ts).
  const prefetchHeaders = { rsc: '1', 'next-router-prefetch': '1', 'next-router-segment-prefetch': '/_tree' };
  const stateTree = encodeURIComponent(JSON.stringify(['', { children: ['__PAGE__', {}] }, null, null, true]));
  const fullHeaders = { rsc: '1', 'next-router-state-tree': stateTree };
  const segmentHash = await computeCacheBustingSearchParam('1', '/_tree', undefined, undefined);
  const fullHash = await computeCacheBustingSearchParam(undefined, undefined, stateTree, undefined);
  const segmentResponse = await fetch(new URL(`/login?_rsc=${segmentHash}`, origin), { headers: prefetchHeaders, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const fullResponse = await fetch(new URL(`/login?_rsc=${fullHash}`, origin), { headers: fullHeaders, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!segmentResponse.ok || !fullResponse.ok) throw new Error(`Prefetch unavailable: segment ${segmentResponse.status}, full ${fullResponse.status}`);
  const [segment, full] = await Promise.all([segmentResponse.text(), fullResponse.text()]);
  if (!segment.includes('"tree"') || segment.length >= full.length) throw new Error('Segment prefetch answered with the full page payload');
  return version.release;
}

// Right after a deploy the edge can still serve the previous release for a
// short while, so a failure is only final once it persists.
for (let attempt = 1; ; attempt++) {
  try {
    console.log(`RELEASE SMOKE PASSED (${await check()})`);
    break;
  } catch (error) {
    if (attempt === 6) throw error;
    console.log(`Attempt ${attempt}: ${error.message}; retrying in 15 s`);
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
}
