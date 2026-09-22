import { executeOperation } from './operations'
import { assertText, HttpError } from './http'
import type { DatabaseRecord, Env } from './types'

export interface KnowledgeBaseCoordinatorState {
  id: string
  userId: string
  status: DatabaseRecord['status'] | 'deleted'
  generation: number
  activeJobId?: string
  lastRecord?: DatabaseRecord
  /** An operation whose external effects may be incomplete. `jobId` is the crawl
   * job it ran for, if any. */
  pending?: { fingerprint: string; jobId?: string }
  projection?: { fingerprint: string; body: string; status: number }
}
type SaveOptions = { expectedJobId?: string; expectedGeneration?: number }
type Pending = NonNullable<KnowledgeBaseCoordinatorState['pending']>

/** Requests that may run while another operation's external effects are uncertain.
 * Reading state is always safe. For an interrupted crawl operation, the crawl's
 * own failure/cancel ends the job (the next crawl reconciles the index) and
 * ownership reads keep chat working. Everything else, including a new job, must
 * wait for an identical retry to finish the interrupted operation. */
function mayRunBeside(pending: Pending, request: Request): boolean {
  const path = new URL(request.url).pathname
  if (request.method === 'GET' && path.endsWith('/state')) return true
  if (!pending.jobId || request.method !== 'POST') return false
  return path === '/ingest/failed' || /^\/coordinator\/[^/]+\/(cancel-job|owned)$/.test(path)
}

/** An interrupted operation stays open until an identical retry finishes it, its
 * crawl job is no longer active, or the knowledge base is gone. */
function stillOpen(pending: Pending, next: KnowledgeBaseCoordinatorState): boolean {
  if (next.status === 'deleted') return false
  if (pending.jobId) return next.status === 'crawling' && next.activeJobId === pending.jobId
  return true
}

/** One full operation, including external I/O and projection, owns this queue.
 * No check/commit RPC pair and no production in-memory fallback. */
export class KnowledgeBaseCoordinator {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private ctx: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const work = this.queue.then(() => this.execute(request))
    // A failed operation must release the queue, but its durable journal remains.
    this.queue = work.catch(() => undefined)
    try { return await work } catch (error) {
      const status = error instanceof HttpError ? error.status : 503
      return Response.json({ error: error instanceof HttpError ? error.message : 'Koordination fehlgeschlagen; bitte erneut versuchen.' }, { status })
    }
  }

  private async project(state: KnowledgeBaseCoordinatorState): Promise<void> {
    if (state.status === 'deleted') await this.env.DATABASE_REGISTRY.delete(state.id)
    else if (state.lastRecord) {
      await this.env.DATABASE_REGISTRY.put(state.id, JSON.stringify(state.lastRecord))
      if (state.userId) await this.env.DATABASE_REGISTRY.put(`owner:${state.userId}:${state.id}`, '1')
    }
  }

  private async execute(request: Request): Promise<Response> {
    const databaseId = assertText(request.headers.get('X-Knowledge-Base-ID'), 'database_id', 160)
    if (!this.ctx.id.equals(this.env.COORDINATOR!.idFromName(databaseId))) {
      throw new HttpError(400, 'Database ID mismatch.')
    }
    const bytes = new TextEncoder().encode(request.method + new URL(request.url).pathname + new URL(request.url).search + await request.clone().text())
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    const fingerprint = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
    let state = await this.ctx.storage.get<KnowledgeBaseCoordinatorState>('state')
    if (!state) {
      const record = await this.env.DATABASE_REGISTRY.get<DatabaseRecord>(databaseId, 'json')
      if (record) state = { id: databaseId, userId: record.user_id, status: record.status, generation: 1, activeJobId: record.current_job_id, lastRecord: record }
    }
    // State and projection intent were committed together. A restart never imports
    // an older KV projection over the authoritative record.
    if (state?.projection) {
      const result = state.projection
      await this.project(state)
      state = { ...state, projection: undefined }
      await this.ctx.storage.put('state', state)
      if (result.fingerprint === fingerprint) return new Response(result.body, { status: result.status, headers: { 'Content-Type': 'application/json' } })
    }
    const resuming = state?.pending?.fingerprint === fingerprint
    const beside = state?.pending && !resuming ? state.pending : undefined
    if (beside && !mayRunBeside(beside, request)) {
      throw new HttpError(503, 'Ein Indexvorgang ist unvollständig. Den ursprünglichen Vorgang erneut ausführen.')
    }
    const operation = new MutationContext(databaseId, state, this.env, async () => {
      // Keep the pre-operation snapshot until all external effects finish. Only
      // an identical retry can resume an uncertain operation, never another job.
      if (beside) throw new HttpError(503, 'Ein Indexvorgang ist unvollständig. Den ursprünglichen Vorgang erneut ausführen.')
      const journal = state ?? { id: databaseId, userId: '', status: 'pending' as const, generation: 0 }
      await this.ctx.storage.put('state', { ...journal, pending: { fingerprint, jobId: journal.activeJobId } })
    })
    const response = await executeOperation(request, this.env, operation)
    if (operation.changed || operation.external) {
      const next = operation.state!
      const result = { fingerprint, body: await response.clone().text(), status: response.status }
      // A request admitted beside an interrupted operation keeps that operation
      // open unless it ended the job or the knowledge base.
      const pending = beside && stillOpen(beside, next) ? beside : undefined
      const committed = { ...next, pending, projection: result }
      await this.ctx.storage.put('state', committed)
      await this.project(committed)
      await this.ctx.storage.put('state', { ...committed, projection: undefined })
    }
    return response
  }
}

/** Only constructed inside the DO queue. Draft writes are committed once, at
 * the end of the full operation, never via remotely callable commit methods. */
export class MutationContext {
  changed = false
  external = false
  state: KnowledgeBaseCoordinatorState | undefined
  constructor(readonly id: string, state: KnowledgeBaseCoordinatorState | undefined, private env: Env, private journal: () => Promise<void>) {
    this.state = state ? structuredClone(state) : undefined
  }
  async beginExternal(): Promise<void> {
    if (!this.external) { await this.journal(); this.external = true }
  }
  async getState(): Promise<KnowledgeBaseCoordinatorState | null> { return this.state ?? null }
  async owned(databaseId: string, userId: string): Promise<DatabaseRecord> {
    if (databaseId !== this.id) throw new HttpError(400, 'Database ID mismatch.')
    const record = this.state?.lastRecord
    if (!record || this.state?.status === 'deleted') throw new HttpError(404, 'Wissensbasis nicht gefunden.')
    if (!record.user_id) {
      const own = await this.env.DATABASE_REGISTRY.get(`owner:${userId}:${this.id}`)
      const legacy = own === null ? await this.env.DATABASE_REGISTRY.get<{ databases?: string[] }>(`user_index:${userId}`, 'json') : null
      if (own === null && !legacy?.databases?.includes(this.id)) throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
      this.setRecord({ ...record, user_id: userId })
    }
    if (this.state!.lastRecord!.user_id !== userId) throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
    return structuredClone(this.state!.lastRecord!)
  }
  async assertActive(jobId?: string): Promise<void> {
    if (!this.state || this.state.status === 'deleted') throw new HttpError(404, 'Wissensbasis nicht gefunden.')
    if (this.state.status === 'deleting') throw new HttpError(409, 'Die Wissensbasis wird derzeit gelöscht.')
    if (this.state.status !== 'crawling') throw new HttpError(409, 'Wissensbasis befindet sich nicht im Indexierungszustand.')
    if (this.state.activeJobId && this.state.activeJobId !== jobId) throw new HttpError(409, 'Callback gehört nicht zum aktiven Crawl-Job.')
  }
  private setRecord(record: DatabaseRecord): void {
    const changedGeneration = record.status !== this.state?.status || record.current_job_id !== this.state?.activeJobId
    this.state = { id: this.id, userId: record.user_id, status: record.status, generation: (this.state?.generation ?? 0) + (changedGeneration ? 1 : 0), activeJobId: record.status === 'crawling' ? record.current_job_id : undefined, lastRecord: structuredClone(record) }
    this.changed = true
  }
  async save(record: DatabaseRecord, options?: SaveOptions): Promise<void> {
    if (!record || record.id !== this.id) throw new HttpError(400, 'Database ID mismatch.')
    assertText(record.user_id, 'user_id', 160)
    if (this.state?.userId && this.state.userId !== record.user_id) throw new HttpError(403, 'Kein Zugriff auf diese Wissensbasis.')
    if (this.state?.status === 'deleted' || (this.state?.status === 'deleting' && record.status !== 'deleting')) throw new HttpError(409, 'Die Wissensbasis wird derzeit gelöscht.')
    if (options?.expectedJobId && this.state?.activeJobId !== options.expectedJobId) throw new HttpError(409, 'Callback gehört nicht zum aktiven Crawl-Job.')
    if (options?.expectedGeneration !== undefined && this.state?.generation !== options.expectedGeneration) throw new HttpError(409, 'Job-Generation ist veraltet.')
    if (!this.state && record.status !== 'pending') throw new HttpError(404, 'Wissensbasis nicht gefunden.')
    if (record.status === 'crawling' && !record.current_job_id && this.state?.status !== 'crawling') throw new HttpError(400, 'job_id ist erforderlich.')
    if (this.state?.status === 'crawling' && record.status === 'crawling' && this.state.activeJobId !== record.current_job_id) throw new HttpError(409, 'Ein Crawl läuft bereits.')
    this.setRecord(record)
  }
  async externalSave(record: DatabaseRecord, options?: SaveOptions): Promise<void> {
    if (this.state?.lastRecord && record.status === 'active' && !options?.expectedJobId) {
      // Legacy adoption is the sole unkeyed active write; retain authoritative fields.
      if (!this.state.userId) { await this.owned(this.id, record.user_id); return }
      throw new HttpError(409, 'Für Metadaten update-metadata verwenden.')
    }
    if (record.status === 'failed' && !options?.expectedJobId) throw new HttpError(409, 'Job-ID für Statusänderung erforderlich.')
    if (record.status === 'deleting' && this.state?.status === 'crawling') throw new HttpError(409, 'Ein Crawl läuft bereits.')
    if (this.state?.lastRecord && record.status === 'pending') throw new HttpError(409, 'Wissensbasis existiert bereits.')
    await this.save(record, options)
  }
  async startJob(params: { jobId: string; record?: Partial<DatabaseRecord> }): Promise<DatabaseRecord> {
    const jobId = assertText(params.jobId, 'job_id', 160)
    const current = this.state?.lastRecord
    if (!current) throw new HttpError(404, 'Wissensbasis nicht gefunden.')
    await this.save({ ...current, ...params.record, id: this.id, user_id: current.user_id, status: 'crawling', current_job_id: jobId, updated_at: new Date().toISOString(), last_error: undefined })
    return this.state!.lastRecord!
  }
  async cancelJob(params: { jobId: string; reason?: string }): Promise<{ success: boolean; status: string }> {
    const jobId = assertText(params.jobId, 'job_id', 160)
    if (this.state?.status !== 'crawling' || this.state.activeJobId !== jobId) return { success: true, status: 'ignored' }
    await this.save({ ...this.state.lastRecord!, status: 'failed', current_job_id: undefined, last_error: params.reason ?? 'Vom Benutzer abgebrochen.', updated_at: new Date().toISOString() }, { expectedJobId: jobId })
    return { success: true, status: 'failed' }
  }
  async markDeleting(): Promise<void> {
    if (this.state?.status === 'deleted') return
    this.state = { id: this.id, userId: this.state?.userId ?? '', status: 'deleting', generation: (this.state?.generation ?? 0) + 1, lastRecord: this.state?.lastRecord ? { ...this.state.lastRecord, status: 'deleting', current_job_id: undefined } : undefined }
    this.changed = true
  }
  async markDeleted(): Promise<void> {
    this.state = { id: this.id, userId: this.state?.userId ?? '', status: 'deleted', generation: (this.state?.generation ?? 0) + 1 }
    this.changed = true
  }
  async updateMetadata(body: Record<string, unknown>): Promise<DatabaseRecord> {
    const current = await this.owned(this.id, assertText(body.user_id, 'user_id', 160))
    if (this.state?.status === 'deleting') throw new HttpError(409, 'Die Wissensbasis wird derzeit gelöscht.')
    this.setRecord({ ...current, name: typeof body.name === 'string' ? body.name.trim().slice(0, 120) || current.name : current.name, description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : current.description, updated_at: new Date().toISOString() })
    return this.state!.lastRecord!
  }
}

export function forwardOperation(env: Env, databaseId: string, request: Request): Promise<Response> {
  if (!env.COORDINATOR) throw new HttpError(503, 'COORDINATOR-Binding fehlt.')
  const headers = new Headers(request.headers)
  headers.set('X-Knowledge-Base-ID', databaseId)
  return env.COORDINATOR.get(env.COORDINATOR.idFromName(databaseId)).fetch(new Request(request, { headers }))
}
