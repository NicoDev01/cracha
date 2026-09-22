import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'
import * as esbuild from 'esbuild'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

function bundleWorker(): string {
  return esbuild.buildSync({
    entryPoints: [path.resolve(__dirname, '../src/index.ts')],
    bundle: true,
    format: 'esm',
    write: false,
    target: 'es2022',
  }).outputFiles[0].text
}

/** A workerd instance without an AI_SEARCH binding: every index call fails, which
 * is a real interruption after the DO has persisted its operation intent. */
function workerd(script: string, persistence?: string): Miniflare {
  return new Miniflare(convertV4MiniflareOptions({
    modules: true,
    compatibilityDate: '2026-08-04',
    script,
    durableObjects: { COORDINATOR: { className: 'KnowledgeBaseCoordinator', useSQLite: true } },
    kvNamespaces: ['DATABASE_REGISTRY'],
    bindings: { INGEST_SECRET: 'test-ingest', QUERY_SECRET: 'test-query' },
    ...(persistence ? { resourcePersistencePath: persistence } : {}),
  }))
}

describe('Miniflare / workerd runtime Durable Object execution', () => {
  let mf: Miniflare

  beforeAll(async () => {
    // Bundle the REAL worker source code including KnowledgeBaseCoordinator
    const buildResult = esbuild.buildSync({
      entryPoints: [path.resolve(__dirname, '../src/index.ts')],
      bundle: true,
      format: 'esm',
      write: false,
      target: 'es2022',
    })
    const workerScript = buildResult.outputFiles[0].text

    const opts = convertV4MiniflareOptions({
      modules: true,
      compatibilityDate: '2026-08-04',
      script: workerScript,
      durableObjects: {
        COORDINATOR: 'KnowledgeBaseCoordinator',
      },
      kvNamespaces: ['DATABASE_REGISTRY'],
      bindings: {
        INGEST_SECRET: 'test-ingest',
        QUERY_SECRET: 'test-query',
      },
    })

    mf = new Miniflare(opts)
  })

  afterAll(async () => {
    if (mf) {
      await mf.dispose()
    }
  })

  it('runs real KnowledgeBaseCoordinator and endpoints in workerd runtime, persisting across calls', async () => {
    const dbId = 'kb-miniflare-real-1'

    // 1. Initial state is null
    const res1 = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/state`, {
      headers: { Authorization: 'Bearer test-query' },
    })
    expect(res1.status).toBe(200)
    const data1 = (await res1.json()) as { state: any }
    expect(data1.state).toBeNull()

    // 2. Save new database with status 'pending' (proves createDatabase path works without 404)
    const newRecord = {
      id: dbId,
      name: 'Real KB',
      user_id: 'user-1',
      source_url: 'https://example.com',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      pages_count: 0,
      chunks_count: 0,
    }
    const resSaveNew = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/save`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({ database: newRecord }),
    })
    expect(resSaveNew.status).toBe(200)

    // Verify state persisted in DO storage
    const resStateAfterNew = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/state`, {
      headers: { Authorization: 'Bearer test-query' },
    })
    const dataStateAfterNew = (await resStateAfterNew.json()) as { state: any }
    expect(dataStateAfterNew.state.status).toBe('pending')
    expect(dataStateAfterNew.state.generation).toBe(1)

    // 3. Start Job A -> gen 2, status crawling
    const res2 = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/start-job`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 'job-a', record: { ...newRecord, current_job_id: 'job-a' } }),
    })
    expect(res2.status).toBe(200)
    const data2 = (await res2.json()) as { record: any }
    expect(data2.record.status).toBe('crawling')
    expect(data2.record.current_job_id).toBe('job-a')

    // 4. Query state again -> verified persisted in workerd storage
    const res3 = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/state`, {
      headers: { Authorization: 'Bearer test-query' },
    })
    const data3 = (await res3.json()) as { state: any }
    expect(data3.state.generation).toBe(2)
    expect(data3.state.activeJobId).toBe('job-a')

    // 5. Complete Job A -> status active, activeJobId cleared
    const resComplete = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/save`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        database: { ...newRecord, status: 'active', current_job_id: undefined },
        options: { expectedJobId: 'job-a' },
      }),
    })
    expect(resComplete.status).toBe(200)

    const resStateActive = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/state`, {
      headers: { Authorization: 'Bearer test-query' },
    })
    const dataStateActive = (await resStateActive.json()) as { state: any }
    expect(dataStateActive.state.status).toBe('active')
    expect(dataStateActive.state.activeJobId).toBeUndefined()

    // 6. Start Job B -> generation increments, activeJobId is 'job-b'
    const resStartB = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/start-job`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 'job-b' }),
    })
    expect(resStartB.status).toBe(200)

    // 7. Delayed save for old Job A with expectedJobId 'job-a' must be rejected with 409
    const resStaleComplete = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/save`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        database: { ...newRecord, status: 'active', current_job_id: undefined },
        options: { expectedJobId: 'job-a' },
      }),
    })
    expect(resStaleComplete.status).toBe(409)

    const cancelB = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/cancel-job`, {
      method: 'POST', headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: 'job-b' }),
    })
    expect(cancelB.status).toBe(200)

    // 8. Mark deleting -> status deleting
    const resMarkDel = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/save`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        database: { ...newRecord, status: 'deleting' },
      }),
    })
    expect(resMarkDel.status).toBe(200)

    // 9. Any subsequent save attempt rejected with 409
    const resAfterDel = await mf.dispatchFetch(`http://localhost/coordinator/${dbId}/save`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        database: { ...newRecord, status: 'active' },
      }),
    })
    expect(resAfterDel.status).toBe(409)
  })
})

describe('workerd: concurrency and restart of the real coordinator', () => {
  const script = bundleWorker()
  const query = { Authorization: 'Bearer test-query', 'Content-Type': 'application/json' }
  const ingest = { Authorization: 'Bearer test-ingest', 'Content-Type': 'application/json' }
  const base = (id: string) => ({
    id, name: 'KB', user_id: 'user-1', source_url: 'https://example.com', status: 'pending',
    created_at: '2026-09-23T00:00:00Z', updated_at: '2026-09-23T00:00:00Z', document_count: 0, pages_count: 0, chunks_count: 0,
  })
  async function prepareCrawl(mf: Miniflare, id: string, jobId: string) {
    expect((await mf.dispatchFetch(`http://localhost/coordinator/${id}/save`, { method: 'POST', headers: query, body: JSON.stringify({ database: base(id) }) })).status).toBe(200)
    expect((await mf.dispatchFetch(`http://localhost/coordinator/${id}/start-job`, { method: 'POST', headers: query, body: JSON.stringify({ jobId }) })).status).toBe(200)
  }
  const state = async (mf: Miniflare, id: string) => ((await (await mf.dispatchFetch(`http://localhost/coordinator/${id}/state`, { headers: query })).json()) as { state: any }).state

  it('two simultaneous completions of the same job: exactly one transition succeeds', async () => {
    const mf = workerd(script)
    try {
      const id = 'kb-workerd-concurrent'
      await prepareCrawl(mf, id, 'job-a')
      const complete = () => mf.dispatchFetch(`http://localhost/coordinator/${id}/save`, {
        method: 'POST', headers: query,
        body: JSON.stringify({ database: { ...base(id), status: 'active' }, options: { expectedJobId: 'job-a' } }),
      })
      const statuses = (await Promise.all([complete(), complete(), complete()])).map(r => r.status).sort()
      expect(statuses).toEqual([200, 409, 409])
      expect(await state(mf, id)).toMatchObject({ status: 'active' })
    } finally { await mf.dispose() }
  })

  it('keeps an interrupted index operation across a workerd restart until its job ends', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cracha-do-'))
    const id = 'kb-workerd-restart'
    let mf = workerd(script, dir)
    try {
      await prepareCrawl(mf, id, 'job-a')
      const upload = await mf.dispatchFetch('http://localhost/ingest/pages', {
        method: 'POST', headers: ingest,
        body: JSON.stringify({ database_id: id, user_id: 'user-1', job_id: 'job-a', pages: [{ url: 'https://example.com', title: 'P', markdown: '# P', checksum: 'c', crawled_at: 'now' }] }),
      })
      expect(upload.status).toBe(503)
      await mf.dispose()
      mf = workerd(script, dir)

      const recovered = await state(mf, id)
      expect(recovered).toMatchObject({ status: 'crawling', activeJobId: 'job-a' })
      expect(recovered.pending?.jobId).toBe('job-a')
      const startB = () => mf.dispatchFetch(`http://localhost/coordinator/${id}/start-job`, { method: 'POST', headers: query, body: JSON.stringify({ jobId: 'job-b' }) })
      expect((await startB()).status).toBe(503)
      const failed = await mf.dispatchFetch('http://localhost/ingest/failed', {
        method: 'POST', headers: ingest, body: JSON.stringify({ database_id: id, user_id: 'user-1', job_id: 'job-a', error: 'index down' }),
      })
      expect(failed.status).toBe(200)
      const ended = await state(mf, id)
      expect(ended.status).toBe('failed')
      expect(ended.pending).toBeUndefined()
      expect((await startB()).status).toBe(200)
      expect(await state(mf, id)).toMatchObject({ status: 'crawling', activeJobId: 'job-b' })
    } finally {
      await mf.dispose()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
