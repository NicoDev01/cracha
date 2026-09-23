// Public, read-only deployment check. Never starts a crawl or a paid chat.
const origin = process.argv[2] || 'http://localhost:3000';
const expected = process.argv[3];

async function check() {
  const response = await fetch(new URL('/api/version', origin), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const version = await response.json();
  if (!response.ok || !version.release || (expected && version.release !== expected)) throw new Error('Wrong release is serving the public domain');
  for (const path of ['/', '/beispiele', '/register', '/widerrufsbelehrung', '/nutzungsbedingungen']) {
    const response = await fetch(new URL(path, origin), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const html = await response.text();
    if (!response.ok || !html.includes('<title>')) throw new Error(`Page unavailable: ${path}`);
    if (path === '/' && (!html.includes('Verwandle jede Website') || !html.includes('kein Abo'))) throw new Error('Landing page does not show the current headline and pricing FAQ');
  }
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
