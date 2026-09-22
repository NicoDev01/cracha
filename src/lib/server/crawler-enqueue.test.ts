import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ state: vi.fn(), hold: vi.fn(), release: vi.fn(), bind: vi.fn(), create: vi.fn(), save: vi.fn(), owned: vi.fn(), put: vi.fn(), fetch: vi.fn() }))
vi.mock('./cloudflare', () => ({ getWorkerEnv: () => ({ MODAL_CRAWLER_URL: 'https://crawler.example', CRAWLER_API_SECRET: 'test', DATABASE_REGISTRY: { put: mocks.put } }) }))
vi.mock('./credits', async original => ({ ...await original<typeof import('./credits')>(), getCreditState: mocks.state, holdCrawlCredits: mocks.hold, releaseCrawlCredits: mocks.release, bindCrawlHold: mocks.bind }))
vi.mock('./database-registry', async original => ({ ...await original<typeof import('./database-registry')>(), createDatabase: mocks.create, saveDatabase: mocks.save, getOwnedDatabase: mocks.owned }))
import { enqueueCrawl } from './crawler-api'
const input = { url: 'https://example.com', database_name: 'Test', limit: 20 }
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal('fetch', mocks.fetch)
  mocks.state.mockResolvedValue({ balance: 100, databases: 0, maxDatabases: 25 })
  mocks.hold.mockResolvedValue(true)
  mocks.create.mockResolvedValue({ id: 'db', user_id: 'user', name: 'Test' })
  mocks.fetch.mockImplementation(async (url: string, init?: RequestInit) => url.endsWith('/health')
    ? Response.json({ billing_protocol: 1, settlement_configured: true })
    : Response.json({ success: true, job_id: JSON.parse(init?.body as string).hold_reference, status: 'queued' }))
})
afterEach(() => vi.unstubAllGlobals())
it('binds a reservation and uses its stable ID for dispatch', async () => {
  const result = await enqueueCrawl(input, 'user')
  expect(mocks.hold).toHaveBeenCalledWith('user', 20, result.job_id)
  expect(mocks.bind).toHaveBeenCalledWith(result.job_id, 'db')
  expect(mocks.put).toHaveBeenCalledWith(`crawl_job:${result.job_id}`, expect.any(String), expect.any(Object))
})
it('refuses an old or unconfigured crawler before reserving money', async () => {
  mocks.fetch.mockResolvedValue(Response.json({ status: 'healthy' }))
  await expect(enqueueCrawl(input, 'user')).rejects.toThrow('Guthabenabrechnung')
  expect(mocks.hold).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled()
})
it('does not create a database when the atomic reservation is refused', async () => {
  mocks.hold.mockResolvedValue(false)
  await expect(enqueueCrawl(input, 'user')).rejects.toThrow()
  expect(mocks.create).not.toHaveBeenCalled()
})
it('retains uncertain dispatch until actual job reconciliation', async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ billing_protocol: 1, settlement_configured: true })).mockRejectedValueOnce(new Error('connection lost'))
  const result = await enqueueCrawl(input, 'user')
  expect(result.job_id).toMatch(/^[a-f\d-]{36}$/)
  expect(mocks.release).not.toHaveBeenCalled()
})
it('releases a definite validation rejection', async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ billing_protocol: 1, settlement_configured: true })).mockResolvedValueOnce(Response.json({ detail: 'invalid' }, { status: 422 }))
  await expect(enqueueCrawl(input, 'user')).rejects.toThrow('invalid')
  expect(mocks.release).toHaveBeenCalledOnce()
})
it('releases preparation failures before dispatch', async () => {
  mocks.save.mockRejectedValue(new Error('registry unavailable'))
  await expect(enqueueCrawl(input, 'user')).rejects.toThrow('registry unavailable')
  expect(mocks.release).toHaveBeenCalledOnce()
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
})
it('rejects recrawl when database is marked as deleting', async () => {
  mocks.owned.mockResolvedValue({ id: 'db-del', user_id: 'user', name: 'Del', status: 'deleting' })
  await expect(enqueueCrawl({ ...input, database_id: 'db-del' }, 'user')).rejects.toThrow('gelöscht')
  expect(mocks.hold).not.toHaveBeenCalled()
})
it('rejects recrawl when database is already crawling', async () => {
  mocks.owned.mockResolvedValue({ id: 'db-run', user_id: 'user', name: 'Run', status: 'crawling' })
  await expect(enqueueCrawl({ ...input, database_id: 'db-run' }, 'user')).rejects.toThrow('bereits indexiert')
  expect(mocks.hold).not.toHaveBeenCalled()
})
