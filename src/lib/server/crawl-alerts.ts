/**
 * Tells the operator when a real crawl fails. The first customer's crawl
 * failed on a Sunday morning and was found only by reading the tables by hand;
 * nothing anywhere said a paying-intent visitor had just hit an error.
 *
 * Mail rather than an error tracker: it reaches the one person who can act,
 * and it goes through the same Resend key and inbox the privacy policy already
 * names. It carries what a diagnosis needs — the job, the knowledge base, the
 * address that was crawled and the crawler's own error — and never who the
 * user is.
 */

export interface CrawlAlertEnv {
  RESEND_API_KEY?: string
}

export interface CrawlFailure {
  reference: string
  databaseId: string | null
  sourceUrl?: string
  error?: string
}

const address = 'hallo@cracha-app.com'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)
}

export async function alertCrawlFailure(
  env: CrawlAlertEnv,
  failure: CrawlFailure,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false
  const lines = [
    `Job: ${failure.reference}`,
    `Wissensbasis: ${failure.databaseId ?? 'unbekannt'}`,
    `Adresse: ${failure.sourceUrl ?? 'unbekannt'}`,
    `Fehler: ${failure.error ?? 'nicht übermittelt'}`,
    '',
    `Modal-Logs: modal app logs cracha-crawler --since 1h --search ${failure.reference}`,
  ]
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'cracha-crawl-alert',
      // Both the crawler's callback and the status poll can report the same
      // failure. Resend keeps the key for 24 hours, so it is one mail.
      'Idempotency-Key': `crawl-failed-${failure.reference}`,
    },
    body: JSON.stringify({
      from: `CraCha <${address}>`,
      to: [address],
      subject: `Crawl fehlgeschlagen: ${failure.sourceUrl ?? failure.databaseId ?? failure.reference}`,
      text: lines.join('\n'),
      html: `<pre>${escapeHtml(lines.join('\n'))}</pre>`,
    }),
  }).catch(() => null)
  if (!response?.ok) {
    console.error(JSON.stringify({ event: 'crawl_alert_failed', reference: failure.reference, status: response?.status ?? null }))
    return false
  }
  return true
}
