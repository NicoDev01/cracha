import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), remove: vi.fn(), release: vi.fn(), owned: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock('@/lib/server/credits', () => ({ releaseCrawlCredits: mocks.release }))
vi.mock('@/lib/server/database-registry', () => ({ coordinatorCommand: mocks.save }))
vi.mock('@/lib/server/cloudflare', () => ({ getWorkerEnv: () => ({ DATABASE_REGISTRY: { get: mocks.get, delete: mocks.remove }, MODAL_CRAWLER_URL: 'https://crawler.example', CRAWLER_API_SECRET: 'test' }) }))
import { POST } from './route'

const invoke = () => POST(new NextRequest('https://example.com'), { params: Promise.resolve({ jobId: 'job' }) })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ id: 'user' })
  mocks.get.mockResolvedValue({ user_id: 'user', database_id: 'kb', hold_reference: 'hold' })
  mocks.owned.mockResolvedValue(null)
  mocks.release.mockResolvedValue(undefined)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'cancelled' })))
})
afterEach(() => vi.unstubAllGlobals())
it('releases the hold before removing a successfully cancelled job', async () => {
  expect((await invoke()).status).toBe(200)
  expect(mocks.release).toHaveBeenCalledExactlyOnceWith('hold')
  expect(mocks.release.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0])
})
it('never refunds a foreign job', async () => {
  mocks.get.mockResolvedValue({ user_id: 'other', hold_reference: 'hold' })
  expect((await invoke()).status).toBe(404)
  expect(mocks.release).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})
it('does not release or delete if cancellation failed', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 409 }))
  expect((await invoke()).status).toBe(502)
  expect(mocks.release).not.toHaveBeenCalled()
  expect(mocks.remove).not.toHaveBeenCalled()
})
it('keeps the job retryable if the credit database is unavailable', async () => {
  mocks.release.mockRejectedValue(new Error('offline'))
  expect((await invoke()).status).toBe(503)
  expect(mocks.remove).not.toHaveBeenCalled()
})
it('releases the hold, marks db failed, and cleans up when modal returns 404 (ghost job)', async () => {
  mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user', status: 'pending' })
  vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }))
  const response = await invoke()
  expect(response.status).toBe(200)
  expect(mocks.release).toHaveBeenCalledExactlyOnceWith('hold')
  expect(mocks.save).toHaveBeenCalledWith('kb', 'cancel-job', { jobId: 'job', reason: 'Crawl-Auftrag wurde im Crawler nicht gefunden und storniert.' })
  expect(mocks.remove).toHaveBeenCalledWith('crawl_job:job')
})
it('does not set database to failed if current_job_id belongs to a newer job (Job B)', async () => {
  mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user', status: 'crawling', current_job_id: 'newer-job-b' })
  const response = await invoke()
  expect(response.status).toBe(200)
  expect(mocks.release).toHaveBeenCalledExactlyOnceWith('hold')
  expect(mocks.save).toHaveBeenCalledWith('kb', 'cancel-job', expect.objectContaining({ jobId: 'job' }))
  expect(mocks.remove).toHaveBeenCalledWith('crawl_job:job')
})
it('does not update database if database status is deleting, but still releases hold and cleans job', async () => {
  mocks.owned.mockResolvedValue({ id: 'kb', user_id: 'user', status: 'deleting' })
  const response = await invoke()
  expect(response.status).toBe(200)
  expect(mocks.release).toHaveBeenCalledExactlyOnceWith('hold')
  expect(mocks.save).toHaveBeenCalledWith('kb', 'cancel-job', expect.objectContaining({ jobId: 'job' }))
  expect(mocks.remove).toHaveBeenCalledWith('crawl_job:job')
})

it('keeps the hold and job record when coordinator cancellation fails', async () => {
  mocks.save.mockRejectedValue(new Error('DO unavailable'))
  expect((await invoke()).status).toBe(503)
  expect(mocks.release).not.toHaveBeenCalled()
  expect(mocks.remove).not.toHaveBeenCalled()
})
