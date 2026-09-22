import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import { createTestCoordinatorNamespace } from './coordinator-fixture'
import type { DatabaseRecord, Env } from '../src/types'

function gate() { let open!: () => void; const wait = new Promise<void>(r => { open = r }); return { wait, open } }
function setup(status: DatabaseRecord['status'] = 'crawling') {
  const record: DatabaseRecord = { id: 'kb', user_id: 'user', name: 'KB', source_url: 'https://example.com', created_at: '', updated_at: '', status, current_job_id: status === 'crawling' ? 'a' : undefined, document_count: 0, pages_count: 0, chunks_count: 0 }
  const store = new Map([['kb', JSON.stringify(record)]])
  const items = { list: vi.fn(async () => ({ result: [] as { id: string; key: string }[], result_info: { total_count: 0 } })), upload: vi.fn(async () => {}), delete: vi.fn(async () => {}) }
  const env = {
    DATABASE_REGISTRY: {
      get: vi.fn(async (key: string, type?: string) => { const value = store.get(key); return value === undefined ? null : type === 'json' ? JSON.parse(value) : value }),
      put: vi.fn(async (key: string, value: string) => { store.set(key, value) }),
      delete: vi.fn(async (key: string) => { store.delete(key) }),
      list: vi.fn(async () => ({ keys: [], list_complete: true })),
    },
    INGEST_SECRET: 'i', QUERY_SECRET: 'q',
    AI_SEARCH: { get: () => ({ info: async () => ({}), update: async () => ({}), items }), list: async () => ({ result: [] }), delete: vi.fn(async () => {}) },
  } as unknown as Env
  const runtime = createTestCoordinatorNamespace(env)
  const call = (path: string, body?: unknown, method = 'POST', target = worker) => target.fetch(new Request(`https://test${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${path.startsWith('/ingest') ? 'i' : 'q'}` }, body: body === undefined ? undefined : JSON.stringify(body),
  }), env)
  const complete = (target = worker) => call('/ingest/complete', { database_id: 'kb', user_id: 'user', job_id: 'a', active_keys: [], pages_count: 1 }, 'POST', target)
  const state = async () => (await (await call('/coordinator/kb/state', undefined, 'GET')).json()) as { state: { status: string; activeJobId?: string; pending?: unknown } }
  return { env, store, items, runtime, call, complete, state }
}

describe('whole-operation durable serialization', () => {
  it('holds Job B until all of A, including its KV projection, has committed', async () => {
    const f = setup(); const entered = gate(); const resume = gate()
    const put = f.env.DATABASE_REGISTRY.put.bind(f.env.DATABASE_REGISTRY)
    vi.mocked(f.env.DATABASE_REGISTRY.put).mockImplementationOnce(async (key, value) => { entered.open(); await resume.wait; await put(key, value) })
    const a = f.complete(); await entered.wait
    vi.resetModules(); const bWorker = (await import('../src/index')).default
    let finishedB = false
    const b = f.call('/coordinator/kb/start-job', { jobId: 'b' }, 'POST', bWorker).then(r => { finishedB = true; return r })
    await new Promise(r => setTimeout(r, 15)); expect(finishedB).toBe(false)
    resume.open(); expect((await a).status).toBe(200); expect((await b).status).toBe(200)
    expect((await f.state()).state.activeJobId).toBe('b')
    expect(JSON.parse(f.store.get('kb')!).current_job_id).toBe('b')
  })
  it('serializes two complete callbacks: exactly one succeeds', async () => {
    const f = setup()
    expect((await Promise.all([f.complete(), f.complete()])).map(r => r.status).sort()).toEqual([200, 409])
  })
  it('DELETE waits for an admitted index deletion and no old writer runs afterwards', async () => {
    const f = setup(); const entered = gate(); const resume = gate()
    f.items.list.mockResolvedValue({ result: [{ id: 'old', key: 'old' }], result_info: { total_count: 1 } })
    f.items.delete.mockImplementationOnce(async () => { entered.open(); await resume.wait })
    const a = f.complete(); await entered.wait
    const del = f.call('/databases/kb?user_id=user', undefined, 'DELETE')
    resume.open(); expect((await a).status).toBe(200); expect((await del).status).toBe(200)
    expect(f.store.has('kb')).toBe(false); expect((await f.complete()).status).toBe(404)
  })
  it('cancel waits for an admitted upload before clearing its generation', async () => {
    const f = setup(); const entered = gate(); const resume = gate()
    f.items.upload.mockImplementationOnce(async () => { entered.open(); await resume.wait })
    const upload = f.call('/ingest/pages', { database_id: 'kb', user_id: 'user', job_id: 'a', pages: [{ url: 'https://example.com', title: 'Page', markdown: '# Page', checksum: 'x', crawled_at: 'now' }] })
    await entered.wait
    const cancel = f.call('/coordinator/kb/cancel-job', { jobId: 'a' })
    resume.open(); expect((await upload).status).toBe(202); expect((await cancel).status).toBe(200)
    expect((await f.state()).state.status).toBe('failed')
    expect((await f.complete()).status).toBe(409)
  })
  it('recovers a committed projection after restart, without importing stale KV', async () => {
    const f = setup()
    vi.mocked(f.env.DATABASE_REGISTRY.put).mockRejectedValueOnce(new Error('KV down'))
    expect((await f.complete()).status).toBe(503)
    f.runtime.restart()
    expect((await f.complete()).status).toBe(200)
    expect(JSON.parse(f.store.get('kb')!).status).toBe('active')
  })
  it('keeps an interrupted external operation durable and blocks a different job', async () => {
    const f = setup()
    f.items.list.mockRejectedValueOnce(new Error('index down'))
    expect((await f.complete()).status).toBe(503)
    f.runtime.restart()
    expect((await f.call('/coordinator/kb/start-job', { jobId: 'b' })).status).toBe(503)
    expect((await f.complete()).status).toBe(200)
    expect((await f.call('/coordinator/kb/start-job', { jobId: 'b' })).status).toBe(200)
  })
  it('retries partial deletion after restart; never reports success on failed cleanup', async () => {
    const f = setup('active')
    vi.mocked(f.env.DATABASE_REGISTRY.delete).mockRejectedValueOnce(new Error('KV down'))
    expect((await f.call('/databases/kb?user_id=user', undefined, 'DELETE')).status).toBe(503)
    f.runtime.restart()
    expect((await f.call('/databases/kb?user_id=user', undefined, 'DELETE')).status).toBe(200)
    expect(f.store.has('kb')).toBe(false)
  })
  it('rejects a missing production binding rather than using a local fake', async () => {
    const f = setup(); f.env.COORDINATOR = undefined
    expect((await f.complete()).status).toBe(503)
  })
  it('metadata patches cannot restore an old lifecycle or replace the owner', async () => {
    const f = setup()
    expect((await f.call('/coordinator/kb/update-metadata', { user_id: 'user', name: 'New', status: 'active', current_job_id: 'old' })).status).toBe(200)
    expect((await f.state()).state.activeJobId).toBe('a')
    expect((await f.call('/coordinator/kb/update-metadata', { user_id: 'foreign', name: 'No' })).status).toBe(403)
  })
})

describe('review round 5 regressions', () => {
  it('Job B started by another Worker instance during A\'s index operation runs after A and stays active', async () => {
    // Review 5 repro: A had passed every guard, B started, then A's stale commit
    // wiped B from the DO. Now A's whole operation owns the DO queue.
    const f = setup(); const entered = gate(); const resume = gate()
    f.items.list.mockResolvedValue({ result: [{ id: 'old', key: 'old' }], result_info: { total_count: 1 } })
    f.items.delete.mockImplementationOnce(async () => { entered.open(); await resume.wait })
    vi.resetModules(); const aWorker = (await import('../src/index')).default
    vi.resetModules(); const bWorker = (await import('../src/index')).default
    const a = f.complete(aWorker); await entered.wait
    let finishedB = false
    const b = f.call('/coordinator/kb/start-job', { jobId: 'b' }, 'POST', bWorker).then(r => { finishedB = true; return r })
    await new Promise(r => setTimeout(r, 15)); expect(finishedB).toBe(false)
    resume.open()
    expect((await a).status).toBe(200); expect((await b).status).toBe(200)
    const { state } = await f.state()
    expect(state.status).toBe('crawling'); expect(state.activeJobId).toBe('b')
    expect(JSON.parse(f.store.get('kb')!)).toMatchObject({ status: 'crawling', current_job_id: 'b' })
    // A late duplicate of A's completion can no longer touch B.
    expect((await f.complete(aWorker)).status).toBe(409)
    expect((await f.state()).state.activeJobId).toBe('b')
  })

  it('a failed durable commit is reported as failure and leaves the prior state', async () => {
    const f = setup()
    f.runtime.faults.beforePut = (_key, value) => {
      if ((value as { status?: string }).status === 'active') throw new Error('storage failure')
    }
    expect((await f.complete()).status).toBe(503)
    f.runtime.faults.beforePut = undefined
    expect((await f.state()).state).toMatchObject({ status: 'crawling', activeJobId: 'a' })
    expect(JSON.parse(f.store.get('kb')!).status).toBe('crawling')
  })

  it('an interrupted crawl operation is ended by its own failure callback, then a new job may start', async () => {
    const f = setup()
    f.items.list.mockRejectedValueOnce(new Error('index down'))
    expect((await f.complete()).status).toBe(503)
    f.runtime.restart()
    expect((await f.call('/coordinator/kb/start-job', { jobId: 'b' })).status).toBe(503)
    // Chat keeps resolving ownership while the operation is open.
    expect((await f.call('/coordinator/kb/owned', { user_id: 'user' })).status).toBe(200)
    // A cancel for a different job neither succeeds in changing state nor clears the open operation.
    expect(await (await f.call('/coordinator/kb/cancel-job', { jobId: 'other' })).json()).toMatchObject({ status: 'ignored' })
    expect((await f.call('/coordinator/kb/start-job', { jobId: 'b' })).status).toBe(503)
    expect((await f.call('/ingest/failed', { database_id: 'kb', user_id: 'user', job_id: 'a', error: 'index down' })).status).toBe(200)
    expect((await f.state()).state).toMatchObject({ status: 'failed' })
    expect((await f.state()).state.pending).toBeUndefined()
    expect((await f.call('/coordinator/kb/start-job', { jobId: 'b' })).status).toBe(200)
  })

  it('an interrupted deletion can only be finished by retrying it', async () => {
    const f = setup('active')
    vi.mocked(f.env.DATABASE_REGISTRY.delete).mockRejectedValueOnce(new Error('KV down'))
    expect((await f.call('/databases/kb?user_id=user', undefined, 'DELETE')).status).toBe(503)
    expect((await f.call('/coordinator/kb/owned', { user_id: 'user' })).status).toBe(503)
    expect((await f.call('/coordinator/kb/start-job', { jobId: 'b' })).status).toBe(503)
    expect((await f.call('/databases/kb?user_id=user', undefined, 'DELETE')).status).toBe(200)
    expect((await f.state()).state.status).toBe('deleted')
  })
})
