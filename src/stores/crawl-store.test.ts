import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/lib/api/request', () => ({ apiFetch: mocks.fetch }))
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) })
const { useCrawlStore } = await import('./crawl-store')

const failedJob = {
  id: 'crawl_1', remote_job_id: 'job-1', tenant_id: 'simba-website-912f59e3', name: 'Simba Website',
  status: 'failed' as const, phase: 'failed' as const, url: 'https://www.simba.de/', type: 'recursive' as const,
  pages_crawled: 20, chunks_created: 55, pages_skipped: 0, page_limit: 20,
  created_at: '2026-09-28T06:03:51.000Z', updated_at: '2026-09-28T06:05:32.000Z', error: 'Fehlgeschlagen',
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  memory.clear()
  useCrawlStore.setState({ currentJob: failedJob, jobs: [failedJob], isRunning: false, statusError: null, quotaNotice: null })
})

afterEach(() => {
  useCrawlStore.getState().deleteJob(useCrawlStore.getState().currentJob?.id ?? '')
  vi.useRealTimers()
})

it('retries a failed knowledge base through the re-crawl route and follows the new job', async () => {
  mocks.fetch.mockResolvedValueOnce(reply({ success: true, job_id: 'job-2', status: 'queued', page_limit: 20 }, 202))
  mocks.fetch.mockResolvedValue(reply({ success: true, status: 'running', phase: 'crawling' }, 202))

  await useCrawlStore.getState().retryCrawl()

  expect(mocks.fetch.mock.calls[0][0]).toBe('/api/admin/databases/simba-website-912f59e3/recrawl')
  expect(mocks.fetch.mock.calls[0][1]).toMatchObject({ method: 'POST' })
  const { currentJob, isRunning, jobs } = useCrawlStore.getState()
  expect(isRunning).toBe(true)
  expect(currentJob).toMatchObject({ remote_job_id: 'job-2', tenant_id: 'simba-website-912f59e3', url: 'https://www.simba.de/', status: 'queued' })
  // The failed attempt stays in the history next to the retry.
  expect(jobs.map((job) => job.remote_job_id)).toEqual(['job-2', 'job-1'])
  expect(String(mocks.fetch.mock.calls[1][0])).toBe('/api/admin/crawl-queue/status/job-2')
})

it('shows why a retry could not start', async () => {
  mocks.fetch.mockResolvedValueOnce(reply({ success: false, error: 'Dein Guthaben reicht nicht.' }, 402))

  await expect(useCrawlStore.getState().retryCrawl()).rejects.toThrow('Dein Guthaben reicht nicht.')
  expect(useCrawlStore.getState()).toMatchObject({ isRunning: false, currentJob: { status: 'failed', error: 'Dein Guthaben reicht nicht.' } })
})

it('refuses a retry for a crawl that never got a knowledge base', async () => {
  useCrawlStore.setState({ currentJob: { ...failedJob, tenant_id: '' } })

  await expect(useCrawlStore.getState().retryCrawl()).rejects.toThrow()
  expect(mocks.fetch).not.toHaveBeenCalled()
})
