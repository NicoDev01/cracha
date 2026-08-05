'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '@/lib/api/request'

export type CrawlStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type CrawlPhase = 'queued' | 'crawling' | 'indexing' | 'completed' | 'failed' | 'cancelled'

export interface CrawlProgress {
  stage: CrawlPhase
  current: number
  total: number
  percent: number
  pages_count?: number
  skipped_count?: number
  chunks_count?: number
  url?: string
}

interface CrawlApiResponse {
  success: boolean
  job_id?: string
  status?: string
  error?: string
}

interface CrawlStatusResponse {
  success: boolean
  job_id?: string
  status?: string
  phase?: CrawlPhase
  error?: string
  progress?: CrawlProgress
  result?: {
    pages_count?: number
    chunks_count?: number
    skipped_count?: number
    indexed_pages?: number
    indexing_pending?: number
    indexing_complete?: boolean
  }
}

export interface CrawlJob {
  id: string
  remote_job_id?: string
  tenant_id: string
  name: string
  status: CrawlStatus
  phase: CrawlPhase
  url: string
  type: 'single' | 'recursive' | 'sitemap'
  pages_crawled: number
  chunks_created: number
  pages_skipped: number
  indexed_pages?: number
  indexing_pending?: number
  indexing_complete?: boolean
  progress?: CrawlProgress
  created_at: string
  updated_at: string
  completed_at?: string
  error?: string
}

export interface CrawlConfig {
  url: string
  tenant_id: string
  name: string
  user_id: string
  type: 'single' | 'recursive' | 'sitemap'
  max_depth: number
  limit: number
  include_patterns?: string
  exclude_domains?: string
  respect_robots_txt: boolean
}

interface CrawlState {
  currentJob: CrawlJob | null
  isRunning: boolean
  statusError: string | null
  jobs: CrawlJob[]
  startCrawl: (config: CrawlConfig) => Promise<void>
  cancelCrawl: () => Promise<void>
  resumeCurrentCrawl: () => void
  pollJobStatus: (localJobId: string, remoteJobId: string) => void
  deleteJob: (jobId: string) => void
}

const activeStatuses = new Set<CrawlStatus>(['pending', 'queued', 'running', 'processing'])
const legacyIndexingError = 'Die frühere Indexierung wurde nicht vollständig bestätigt. Bitte starte den Crawl erneut.'
let pollTimer: ReturnType<typeof setTimeout> | null = null
let polledRemoteJobId: string | null = null

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
  polledRemoteJobId = null
}

function phaseFromStatus(status?: string): CrawlPhase {
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'queued' || status === 'pending') return 'queued'
  return 'crawling'
}

function statusFromResponse(status?: string, phase?: CrawlPhase): CrawlStatus {
  if (status === 'completed' || phase === 'completed') return 'completed'
  if (status === 'failed' || phase === 'failed') return 'failed'
  if (status === 'cancelled' || phase === 'cancelled') return 'cancelled'
  if (phase === 'indexing' || status === 'processing') return 'processing'
  if (status === 'queued' || status === 'pending' || phase === 'queued') return 'queued'
  return 'running'
}

function replaceJob(jobs: CrawlJob[], updatedJob: CrawlJob) {
  return jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job))
}

function migrateJob(value: unknown): CrawlJob | null {
  if (!value || typeof value !== 'object') return null
  const job = value as Partial<CrawlJob> & {
    progress?: CrawlProgress & { pages_crawled?: number; chunks_created?: number }
  }
  if (!job.id || !job.tenant_id || !job.url || !job.type || !job.created_at) return null
  const incompleteLegacyJob = job.status === 'completed' && job.indexing_complete === false
  const status = incompleteLegacyJob ? 'failed' : (job.status ?? 'failed')
  const phase = incompleteLegacyJob ? 'failed' : (job.phase ?? phaseFromStatus(status))
  return {
    id: job.id,
    remote_job_id: job.remote_job_id,
    tenant_id: job.tenant_id,
    name: job.name || job.tenant_id,
    status,
    phase,
    url: job.url,
    type: job.type,
    pages_crawled: job.pages_crawled ?? job.progress?.pages_crawled ?? 0,
    chunks_created: job.chunks_created ?? job.progress?.chunks_created ?? 0,
    pages_skipped: job.pages_skipped ?? 0,
    indexed_pages: job.indexed_pages,
    indexing_pending: job.indexing_pending,
    indexing_complete: job.indexing_complete,
    progress: job.progress,
    created_at: job.created_at,
    updated_at: job.updated_at ?? job.created_at,
    completed_at: job.completed_at,
    error: incompleteLegacyJob
      ? legacyIndexingError
      : job.error,
  }
}

export const useCrawlStore = create<CrawlState>()(
  persist(
    (set, get) => ({
      currentJob: null,
      isRunning: false,
      statusError: null,
      jobs: [],

      startCrawl: async (config) => {
        if (get().isRunning) throw new Error('Es läuft bereits ein Crawl.')

        stopPolling()
        const now = new Date().toISOString()
        const localJobId = `crawl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        const newJob: CrawlJob = {
          id: localJobId,
          tenant_id: config.tenant_id,
          name: config.name,
          status: 'pending',
          phase: 'queued',
          url: config.url,
          type: config.type,
          pages_crawled: 0,
          chunks_created: 0,
          pages_skipped: 0,
          progress: { stage: 'queued', current: 0, total: 0, percent: 0 },
          created_at: now,
          updated_at: now,
        }

        set((state) => ({
          currentJob: newJob,
          isRunning: true,
          statusError: null,
          jobs: [newJob, ...state.jobs.filter((job) => job.id !== localJobId)],
        }))

        try {
          const response = await apiFetch('/api/admin/crawl-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...config, database_name: config.name }),
          })
          const result = (await response.json().catch(() => ({}))) as CrawlApiResponse
          if (!response.ok || !result.success || !result.job_id) {
            throw new Error(result.error || `Crawl konnte nicht gestartet werden (${response.status}).`)
          }

          const queuedJob: CrawlJob = {
            ...newJob,
            remote_job_id: result.job_id,
            status: statusFromResponse(result.status, 'queued'),
            updated_at: new Date().toISOString(),
          }
          set((state) => ({
            currentJob: queuedJob,
            jobs: replaceJob(state.jobs, queuedJob),
          }))
          get().pollJobStatus(localJobId, result.job_id)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Crawl konnte nicht gestartet werden.'
          const failedJob: CrawlJob = {
            ...newJob,
            status: 'failed',
            phase: 'failed',
            error: message,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          }
          set((state) => ({
            currentJob: failedJob,
            isRunning: false,
            statusError: message,
            jobs: replaceJob(state.jobs, failedJob),
          }))
          throw error
        }
      },

      pollJobStatus: (localJobId, remoteJobId) => {
        if (polledRemoteJobId === remoteJobId) return
        stopPolling()
        polledRemoteJobId = remoteJobId

        const poll = async () => {
          if (polledRemoteJobId !== remoteJobId) return
          try {
            const response = await apiFetch(`/api/admin/crawl-queue/status/${remoteJobId}`)
            const result = (await response.json().catch(() => ({}))) as CrawlStatusResponse
            if (polledRemoteJobId !== remoteJobId) return
            if (!response.ok) throw new Error(result.error || `Statusabfrage fehlgeschlagen (${response.status}).`)

            const current = get().jobs.find((job) => job.id === localJobId) ?? get().currentJob
            if (!current) {
              stopPolling()
              return
            }

            const phase = result.phase ?? phaseFromStatus(result.status)
            const status = statusFromResponse(result.status, phase)
            const terminal = !activeStatuses.has(status)
            const updatedJob: CrawlJob = {
              ...current,
              status,
              phase,
              pages_crawled: result.result?.pages_count ?? current.pages_crawled,
              chunks_created: result.result?.chunks_count ?? current.chunks_created,
              pages_skipped: result.result?.skipped_count ?? current.pages_skipped,
              indexed_pages: result.result?.indexed_pages ?? current.indexed_pages,
              indexing_pending: result.result?.indexing_pending ?? current.indexing_pending,
              indexing_complete: result.result?.indexing_complete ?? current.indexing_complete,
              progress: result.progress ?? current.progress,
              error: result.error,
              updated_at: new Date().toISOString(),
              completed_at: terminal ? new Date().toISOString() : undefined,
            }

            set((state) => ({
              currentJob: updatedJob,
              isRunning: !terminal,
              statusError: null,
              jobs: replaceJob(state.jobs, updatedJob),
            }))

            if (terminal) {
              stopPolling()
              return
            }
          } catch (error) {
            if (polledRemoteJobId === remoteJobId) {
              set({ statusError: error instanceof Error ? error.message : 'Status konnte nicht aktualisiert werden.' })
            }
          }

          if (polledRemoteJobId === remoteJobId) pollTimer = setTimeout(poll, 5000)
        }

        void poll()
      },

      resumeCurrentCrawl: () => {
        const job = get().currentJob
        if (job?.status === 'failed' && job.error === legacyIndexingError) {
          void (async () => {
            try {
              const response = await apiFetch('/api/databases')
              if (!response.ok) return
              const body = await response.json() as {
                databases?: Array<{
                  id: string
                  status?: string
                  pages_count?: number
                  chunks_count?: number
                }>
              }
              const database = body.databases?.find((entry) => entry.id === job.tenant_id)
              if (database?.status !== 'active' || !database.chunks_count) return

              const reconciled: CrawlJob = {
                ...job,
                status: 'completed',
                phase: 'completed',
                pages_crawled: database.pages_count ?? job.pages_crawled,
                chunks_created: database.chunks_count,
                indexed_pages: database.pages_count ?? job.pages_crawled,
                indexing_pending: 0,
                indexing_complete: true,
                progress: {
                  stage: 'completed',
                  current: database.pages_count ?? job.pages_crawled,
                  total: database.pages_count ?? job.pages_crawled,
                  percent: 100,
                  chunks_count: database.chunks_count,
                },
                error: undefined,
                updated_at: new Date().toISOString(),
              }
              set((state) => ({
                currentJob: reconciled,
                isRunning: false,
                statusError: null,
                jobs: replaceJob(state.jobs, reconciled),
              }))
            } catch {
              // The database list has its own retry flow; keep the local job unchanged.
            }
          })()
          return
        }
        if (!job?.remote_job_id || !activeStatuses.has(job.status)) return
        set({ isRunning: true })
        get().pollJobStatus(job.id, job.remote_job_id)
      },

      cancelCrawl: async () => {
        const currentJob = get().currentJob
        if (!currentJob?.remote_job_id || !get().isRunning) return

        const response = await apiFetch(`/api/admin/crawl-queue/cancel/${currentJob.remote_job_id}`, {
          method: 'POST',
        })
        const result = (await response.json().catch(() => ({}))) as CrawlApiResponse
        if (!response.ok || !result.success) {
          const message = result.error || `Crawl konnte nicht abgebrochen werden (${response.status}).`
          set({ statusError: message })
          throw new Error(message)
        }

        stopPolling()
        const cancelledJob: CrawlJob = {
          ...currentJob,
          status: 'cancelled',
          phase: 'cancelled',
          error: undefined,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }
        set((state) => ({
          currentJob: cancelledJob,
          isRunning: false,
          statusError: null,
          jobs: replaceJob(state.jobs, cancelledJob),
        }))
      },

      deleteJob: (jobId) => {
        const isCurrent = get().currentJob?.id === jobId
        if (isCurrent && get().isRunning) return
        if (isCurrent) stopPolling()
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== jobId),
          currentJob: isCurrent ? null : state.currentJob,
          statusError: isCurrent ? null : state.statusError,
        }))
      },
    }),
    {
      name: 'crawl-store',
      version: 3,
      migrate: (persisted) => {
        const previous = (persisted ?? {}) as { jobs?: unknown[]; currentJob?: unknown }
        const jobs = (previous.jobs ?? []).map(migrateJob).filter((job): job is CrawlJob => Boolean(job))
        return {
          ...previous,
          jobs,
          currentJob: migrateJob(previous.currentJob),
        }
      },
      partialize: (state) => ({ jobs: state.jobs, currentJob: state.currentJob }),
    },
  ),
)
