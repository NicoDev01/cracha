import { expect, it, vi } from 'vitest'

import { alertCrawlFailure } from './crawl-alerts'

const failure = {
  reference: '8cc47585-8aa9-452e-9d51-b0f24696b6fa',
  databaseId: 'simba-website-912f59e3',
  sourceUrl: 'https://www.simba.de/',
  error: "Client error '409 Conflict' for url '<https://example/ingest/status>'",
}

it('mails the operator what a diagnosis needs, once per job', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))

  expect(await alertCrawlFailure({ RESEND_API_KEY: 'key' }, failure, fetchImpl)).toBe(true)

  const [url, init] = fetchImpl.mock.calls[0]
  expect(url).toBe('https://api.resend.com/emails')
  expect(init.headers['Idempotency-Key']).toBe(`crawl-failed-${failure.reference}`)
  const body = JSON.parse(init.body)
  expect(body.to).toEqual(['hallo@cracha-app.com'])
  expect(body.subject).toBe('Crawl fehlgeschlagen: https://www.simba.de/')
  expect(body.text).toContain('simba-website-912f59e3')
  expect(body.text).toContain('409 Conflict')
  // Crawler errors are not trusted markup.
  expect(body.html).not.toContain('<https://')
})

it('does nothing without a mail key', async () => {
  const fetchImpl = vi.fn()

  expect(await alertCrawlFailure({}, failure, fetchImpl)).toBe(false)
  expect(fetchImpl).not.toHaveBeenCalled()
})

it('reports a failed send instead of throwing', async () => {
  const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  expect(await alertCrawlFailure({ RESEND_API_KEY: 'key' }, failure, fetchImpl)).toBe(false)
})
