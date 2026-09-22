// Public, read-only deployment check. Never starts a crawl or a paid chat.
const origin = process.argv[2] || 'http://localhost:3000';
const expected = process.argv[3];
for (const path of ['/', '/register', '/widerrufsbelehrung', '/nutzungsbedingungen']) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  if (!response.ok || !html.includes('<title>')) throw new Error(`Page unavailable: ${path}`);
  if (path === '/' && (!html.includes('1.250') || !html.includes('25,00') || !html.includes('kein Abonnement'))) throw new Error('Landing page does not contain the current credit tariff');
}
const response = await fetch(new URL('/api/version', origin), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
const version = await response.json();
if (!response.ok || !version.release || (expected && version.release !== expected)) throw new Error('Wrong release is serving the public domain');
console.log(`RELEASE SMOKE PASSED (${version.release})`);
