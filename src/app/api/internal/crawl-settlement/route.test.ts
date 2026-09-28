import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  kv: vi.fn(),
  hold: vi.fn(),
  settle: vi.fn(),
  cancel: vi.fn(),
  alert: vi.fn(),
}))
vi.mock('@/lib/server/cloudflare', () => ({
  getWorkerEnv: () => ({ CRAWLER_API_SECRET: 'secret', RESEND_API_KEY: 'key', DATABASE_REGISTRY: { get: mocks.kv } }),
}))
vi.mock('@/lib/server/credits', () => ({
  creditsAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.hold }) }) }) }),
  settleCrawlCredits: mocks.settle,
}))
vi.mock('@/lib/server/database-registry', () => ({ coordinatorCommand: mocks.cancel }))
vi.mock('@/lib/server/crawl-alerts', () => ({ alertCrawlFailure: mocks.alert }))

const { POST } = await import('./route')
const reference = '8cc47585-8aa9-452e-9d51-b0f24696b6fa'

function callback(status: string, indexed_pages = 0) {
  return new NextRequest('https://cracha-app.com/api/internal/crawl-settlement', {
    method: 'POST',
    headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
    body: JSON.stringify({ hold_reference: reference, status, indexed_pages }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.kv.mockImplementation(async (key: string) => (
    key === `crawl_job:${reference}`
      ? { database_id: 'simba-website-912f59e3' }
      : { source_url: 'https://www.simba.de/', last_error: '409 Conflict' }
  ))
  mocks.hold.mockResolvedValue({ data: { user_id: 'user', database_id: 'simba-website-912f59e3' }, error: null })
})

it('reports a failed crawl with its address and error', async () => {
  const response = await POST(callback('failed'))

  expect(response.status).toBe(200)
  expect(mocks.alert).toHaveBeenCalledWith(expect.anything(), {
    reference,
    databaseId: 'simba-website-912f59e3',
    sourceUrl: 'https://www.simba.de/',
    error: '409 Conflict',
  })
  expect(mocks.settle).toHaveBeenCalledWith(reference, 0)
})

it('still reports a failure the status poll already settled', async () => {
  mocks.hold.mockResolvedValue({ data: null, error: null })

  await POST(callback('failed'))

  expect(mocks.alert).toHaveBeenCalledTimes(1)
  expect(mocks.settle).not.toHaveBeenCalled()
})

it('does not report completed or cancelled crawls', async () => {
  await POST(callback('completed', 20))
  await POST(callback('cancelled'))

  expect(mocks.alert).not.toHaveBeenCalled()
})

it('settles even when the report cannot be sent', async () => {
  mocks.kv.mockRejectedValue(new Error('KV down'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await POST(callback('failed'))

  expect(response.status).toBe(200)
  expect(mocks.settle).toHaveBeenCalledWith(reference, 0)
})
