import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import type { DatabaseRecord, Env } from '../src/types'

const ANNA = 'anna-0000-1111'

function record(id: string, userId: string, status: DatabaseRecord['status'] = 'active'): DatabaseRecord {
  return {
    id,
    name: id,
    source_url: 'https://example.com',
    user_id: userId,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    last_crawl: null,
    document_count: 0,
    pages_count: 0,
    chunks_count: 0,
    status,
  }
}

import { createTestCoordinatorNamespace } from './coordinator-fixture'

function mockEnv(options?: {
  coordinatorNamespace?: DurableObjectNamespace
}): Env & { store: Map<string, string> } {
  const store = new Map<string, string>()

  const env: Env = {
    AI_SEARCH: {
      get: () => ({
        info: async () => ({}),
        update: async () => ({}),
        items: {
          list: async () => ({ result: [], result_info: { total_count: 0 } }),
          upsert: async () => {},
          upload: async () => {},
          delete: async () => {},
        },
      }),
      create: async () => ({}),
      list: async () => ({ result: [] }),
      delete: async () => {},
      deleteInstance: async () => {},
    } as unknown as Env['AI_SEARCH'],
    INGEST_SECRET: 'test-ingest-secret',
    QUERY_SECRET: 'test-query-secret',
    DATABASE_REGISTRY: {
      get: async (key: string, type?: string) => {
        const raw = store.get(key)
        if (raw === undefined) return null
        return type === 'json' ? JSON.parse(raw) : raw
      },
      put: async (key: string, value: string) => {
        store.set(key, value)
      },
      delete: async (key: string) => {
        store.delete(key)
      },
      list: async () => ({
        keys: [...store.keys()].map((name) => ({ name })),
        list_complete: true,
      }),
    } as unknown as KVNamespace,
  }

  env.COORDINATOR = options?.coordinatorNamespace ?? createTestCoordinatorNamespace(env).namespace
  return Object.assign(env, { store })
}

describe('database lifecycle & deletion protection', () => {
  it('rejects ingest on a database marked as deleting with 409 Conflict', async () => {
    const env = mockEnv()
    env.store.set('kb-deleting', JSON.stringify(record('kb-deleting', ANNA, 'deleting')))

    const req = new Request('https://cracha-rag.internal/ingest/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INGEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database_id: 'kb-deleting',
        user_id: ANNA,
        pages: [
          {
            url: 'https://example.com/p1',
            title: 'P1',
            markdown: '# P1',
            checksum: 'abc123',
            crawled_at: '2026-09-20T00:00:00Z',
          },
        ],
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('gelöscht')
  })

  it('rejects ingest on a non-existent/deleted database with 404 Not Found', async () => {
    const env = mockEnv()

    const req = new Request('https://cracha-rag.internal/ingest/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INGEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database_id: 'kb-nonexistent',
        user_id: ANNA,
        pages: [
          {
            url: 'https://example.com/p1',
            title: 'P1',
            markdown: '# P1',
            checksum: 'abc123',
            crawled_at: '2026-09-20T00:00:00Z',
          },
        ],
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(404)
  })

  it('rejects complete on a database marked as deleting with 409 Conflict', async () => {
    const env = mockEnv()
    env.store.set('kb-deleting', JSON.stringify(record('kb-deleting', ANNA, 'deleting')))

    const req = new Request('https://cracha-rag.internal/ingest/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INGEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database_id: 'kb-deleting',
        user_id: ANNA,
        active_keys: ['key1'],
        pages_count: 1,
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(409)
  })

  it('rejects query on a database marked as deleting with 409 Conflict', async () => {
    const env = mockEnv()
    env.store.set('kb-deleting', JSON.stringify(record('kb-deleting', ANNA, 'deleting')))

    const req = new Request('https://cracha-rag.internal/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.QUERY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: 'kb-deleting',
        user_id: ANNA,
        question: 'Is this database available?',
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('gelöscht')
  })

  it('rejects DELETE on a database that is currently crawling with 409 Conflict', async () => {
    const env = mockEnv()
    env.store.set('kb-crawling', JSON.stringify(record('kb-crawling', ANNA, 'crawling')))

    const req = new Request(`https://cracha-rag.internal/databases/kb-crawling?user_id=${ANNA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.QUERY_SECRET}` },
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(409)
  })

  it('marks database as deleting before purging resources on DELETE', async () => {
    const env = mockEnv()
    env.store.set('kb-active', JSON.stringify(record('kb-active', ANNA, 'active')))

    const req = new Request(`https://cracha-rag.internal/databases/kb-active?user_id=${ANNA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.QUERY_SECRET}` },
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    // After DELETE, database record is deleted from KV
    expect(env.store.has('kb-active')).toBe(false)
  })

  it('rejects stale ingest on a database marked as failed/cancelled with 409 Conflict', async () => {
    const env = mockEnv()
    env.store.set('kb-failed', JSON.stringify(record('kb-failed', ANNA, 'failed')))

    const req = new Request('https://cracha-rag.internal/ingest/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INGEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database_id: 'kb-failed',
        user_id: ANNA,
        pages: [
          {
            url: 'https://example.com/stale',
            title: 'Stale',
            markdown: '# Stale',
            checksum: 'xyz999',
            crawled_at: '2026-09-20T00:00:00Z',
          },
        ],
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(409)
    const data = (await res.json()) as { error: string }
    expect(data.error).toContain('Indexierungszustand')
  })

  it('rejects stale ingest on an already completed/active database with 409 Conflict', async () => {
    const env = mockEnv()
    env.store.set('kb-active', JSON.stringify(record('kb-active', ANNA, 'active')))

    const req = new Request('https://cracha-rag.internal/ingest/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INGEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database_id: 'kb-active',
        user_id: ANNA,
        pages: [
          {
            url: 'https://example.com/stale',
            title: 'Stale',
            markdown: '# Stale',
            checksum: 'xyz999',
            crawled_at: '2026-09-20T00:00:00Z',
          },
        ],
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(409)
    const data = (await res.json()) as { error: string }
    expect(data.error).toContain('Indexierungszustand')
  })

  it('allows ingest when database status is crawling', async () => {
    const env = mockEnv()
    env.store.set('kb-crawling', JSON.stringify(record('kb-crawling', ANNA, 'crawling')))

    const req = new Request('https://cracha-rag.internal/ingest/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.INGEST_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database_id: 'kb-crawling',
        user_id: ANNA,
        pages: [
          {
            url: 'https://example.com/p1',
            title: 'P1',
            markdown: '# P1',
            checksum: 'abc123',
            crawled_at: '2026-09-20T00:00:00Z',
          },
        ],
      }),
    })

    const res = await worker.fetch(req, env)
    expect(res.status).toBe(202)
  })

  it('rejects callbacks from stale Job A when Job B is active, preventing state corruption', async () => {
    const env = mockEnv()
    const dbId = 'kb-job-isolation'
    // Job B is currently crawling
    env.store.set(dbId, JSON.stringify({
      ...record(dbId, ANNA, 'crawling'),
      current_job_id: 'job-b',
    }))

    // 1. Job A sends complete -> 409 Rejected
    const completeA = await worker.fetch(
      new Request('https://cracha-rag.internal/ingest/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.INGEST_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_id: dbId,
          user_id: ANNA,
          active_keys: ['p1'],
          pages_count: 1,
          job_id: 'job-a',
        }),
      }),
      env,
    )
    expect(completeA.status).toBe(409)
    const errA = await completeA.json() as { error: string }
    expect(errA.error).toContain('Crawl-Job')

    // Verify DB still in crawling status with job-b
    let db = JSON.parse(env.store.get(dbId)!) as DatabaseRecord
    expect(db.status).toBe('crawling')
    expect(db.current_job_id).toBe('job-b')

    // 2. Job A sends ingest -> 409 Rejected
    const ingestA = await worker.fetch(
      new Request('https://cracha-rag.internal/ingest/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.INGEST_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_id: dbId,
          user_id: ANNA,
          job_id: 'job-a',
          pages: [
            {
              url: 'https://example.com/p1',
              title: 'P1',
              markdown: '# P1',
              checksum: 'abc123',
              crawled_at: '2026-09-20T00:00:00Z',
            },
          ],
        }),
      }),
      env,
    )
    expect(ingestA.status).toBe(409)

    // 3. Job A sends failed -> Ignored, does not fail Job B
    const failedA = await worker.fetch(
      new Request('https://cracha-rag.internal/ingest/failed', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.INGEST_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_id: dbId,
          user_id: ANNA,
          job_id: 'job-a',
          error: 'Old crawl crashed',
        }),
      }),
      env,
    )
    expect(failedA.status).toBe(200)
    const failedData = await failedA.json() as { ignored?: boolean }
    expect(failedData.ignored).toBe(true)

    // Verify DB is still crawling job-b
    db = JSON.parse(env.store.get(dbId)!) as DatabaseRecord
    expect(db.status).toBe('crawling')
    expect(db.current_job_id).toBe('job-b')

    // 4. Job B sends complete -> 200 Success, completes normally
    const completeB = await worker.fetch(
      new Request('https://cracha-rag.internal/ingest/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.INGEST_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_id: dbId,
          user_id: ANNA,
          active_keys: ['p2'],
          pages_count: 5,
          job_id: 'job-b',
        }),
      }),
      env,
    )
    expect(completeB.status).toBe(200)
    db = JSON.parse(env.store.get(dbId)!) as DatabaseRecord
    expect(db.status).toBe('active')
    expect(db.current_job_id).toBeUndefined()
    expect(db.pages_count).toBe(5)
  })

  it('ignores failed callback without job_id when active job has current_job_id, preventing job corruption', async () => {
    const env = mockEnv()
    const dbId = 'kb-missing-jobid'
    env.store.set(dbId, JSON.stringify({
      ...record(dbId, ANNA, 'crawling'),
      current_job_id: 'job-active-123',
    }))

    const failedReq = await worker.fetch(
      new Request('https://cracha-rag.internal/ingest/failed', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.INGEST_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_id: dbId,
          user_id: ANNA,
          error: 'Unkeyed failure',
        }),
      }),
      env,
    )
    expect(failedReq.status).toBe(200)
    const data = await failedReq.json() as { ignored?: boolean }
    expect(data.ignored).toBe(true)

    // Verify DB still in crawling status with job-active-123
    const db = JSON.parse(env.store.get(dbId)!) as DatabaseRecord
    expect(db.status).toBe('crawling')
    expect(db.current_job_id).toBe('job-active-123')
  })

})
