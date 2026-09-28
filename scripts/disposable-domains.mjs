// Prints SQL that refreshes public.disposable_email_domains from the
// community-maintained list (CC0): https://github.com/disposable-email-domains/disposable-email-domains
// Usage: node scripts/disposable-domains.mjs > refresh.sql, then run it in the
// Supabase SQL editor. Existing rows stay, so hand-added domains survive.
const source = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf'
const response = await fetch(source)
if (!response.ok) throw new Error(`List download failed: ${response.status}`)
const domains = [...new Set((await response.text()).split('\n')
  .map((line) => line.trim().toLowerCase())
  .filter((line) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(line)))].sort()
if (domains.length < 1000) throw new Error(`Suspiciously short list: ${domains.length}`)
process.stdout.write(`insert into public.disposable_email_domains(domain) select unnest(array[\n${domains.map((d) => `'${d}'`).join(',\n')}\n]) on conflict do nothing;\n`)
