import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ command: vi.fn(), release: vi.fn(), kvDelete: vi.fn(), fetch: vi.fn() }))

vi.mock('./cloudflare', () => ({
  getWorkerEnv: () => ({
    MODAL_CRAWLER_URL: 'https://crawler.example/',
    CRAWLER_API_SECRET: 'secret',
    DATABASE_REGISTRY: { delete: mocks.kvDelete },
  }),
}))
vi.mock('./credits', () => ({ releaseCrawlCredits: mocks.release }))
vi.mock('./database-registry', () => ({ coordinatorCommand: mocks.command }))

import { cancelCrawlJob } from './crawler-api'

const job = { jobId: 'job-1', databaseId: 'kb-1', holdReference: 'job-1' }

describe('cancelCrawlJob', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ status: 'cancelled' }), { status: 200 }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('cancels at the crawler, retires the job, releases the hold and drops the job record', async () => {
    await expect(cancelCrawlJob(job)).resolves.toEqual({ ok: true })
    expect(mocks.fetch).toHaveBeenCalledWith('https://crawler.example/cancel/job-1', expect.objectContaining({ method: 'POST' }))
    expect(mocks.command).toHaveBeenCalledWith('kb-1', 'cancel-job', { jobId: 'job-1', reason: 'Vom Benutzer abgebrochen.' })
    expect(mocks.release).toHaveBeenCalledWith('job-1')
    expect(mocks.kvDelete).toHaveBeenCalledWith('crawl_job:job-1')
  })

  it('treats an already finished job as a failure unless told otherwise', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ detail: 'finished' }), { status: 409 }))
    await expect(cancelCrawlJob(job)).resolves.toEqual({ ok: false, stage: 'crawler' })
    expect(mocks.release).not.toHaveBeenCalled()

    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ detail: 'finished' }), { status: 409 }))
    await expect(cancelCrawlJob(job, { finishedIsFine: true, reason: 'Konto wird gelöscht.' })).resolves.toEqual({ ok: true })
    expect(mocks.command).toHaveBeenCalledWith('kb-1', 'cancel-job', { jobId: 'job-1', reason: 'Konto wird gelöscht.' })
  })

  it('keeps the hold and the job record when the coordinator cannot retire the job', async () => {
    mocks.command.mockRejectedValue(new Error('Koordination fehlgeschlagen (503).'))
    await expect(cancelCrawlJob(job)).resolves.toEqual({ ok: false, stage: 'settlement' })
    expect(mocks.release).not.toHaveBeenCalled()
    expect(mocks.kvDelete).not.toHaveBeenCalled()
  })

  it('reports an unreachable crawler instead of throwing', async () => {
    mocks.fetch.mockRejectedValue(new TypeError('network'))
    await expect(cancelCrawlJob(job)).resolves.toEqual({ ok: false, stage: 'crawler' })
  })
})
