'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CrawlApiResponse {
  success: boolean
  job_id?: string
  error?: string
  message?: string
}

interface JobStatusData {
  status: string
  config?: {
    tenant_id?: string
    url?: string
  }
  result?: {
    chunks?: number
    duration?: string
  }
  error?: string
  progress?: number
  total_chunks?: number
  processed_chunks?: number
}

interface CrawlStatusResponse {
  success: boolean
  job?: JobStatusData
  error?: string
}

// Helper function to safely convert status string to valid CrawlJob status
function normalizeStatus(status: string): CrawlJob['status'] {
  const validStatuses: CrawlJob['status'][] = ['pending', 'queued', 'running', 'processing', 'completed', 'failed']
  return validStatuses.includes(status as CrawlJob['status'])
    ? (status as CrawlJob['status'])
    : 'pending'
}

export interface CrawlJob {
  id: string
  remote_job_id?: string
  tenant_id: string
  status: 'pending' | 'queued' | 'running' | 'processing' | 'completed' | 'failed'
  url: string
  type: 'single' | 'recursive' | 'sitemap'
  progress?: {
    pages_crawled: number
    chunks_created: number
  }
  created_at: string
  completed_at?: string
  error?: string
}

export interface CrawlConfig {
  url: string
  tenant_id: string
  user_id: string
  type: 'single' | 'recursive' | 'sitemap'
  max_depth: number
  limit: number
  include_patterns?: string
  exclude_domains?: string
  respect_robots_txt: boolean
}

interface CrawlState {
  // Current job state
  currentJob: CrawlJob | null
  isRunning: boolean
  progress: number
  logs: string[]

  // Jobs history
  jobs: CrawlJob[]

  // Actions
  startCrawl: (config: CrawlConfig) => Promise<void>
  cancelCrawl: () => Promise<void>
  clearLogs: () => void
  loadJobs: () => Promise<void>
  deleteJob: (jobId: string) => Promise<void>

  // Internal
  setCurrentJob: (job: CrawlJob | null) => void
  setProgress: (progress: number) => void
  addLog: (log: string) => void
  pollJobStatus: (localJobId: string, remoteJobId: string) => Promise<void>
}

export const useCrawlStore = create<CrawlState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentJob: null,
      isRunning: false,
      progress: 0,
      logs: [],
      jobs: [],

      // Start crawl action
      startCrawl: async (config: CrawlConfig) => {
        const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

        const newJob: CrawlJob = {
          id: jobId,
          tenant_id: config.tenant_id,
          status: 'pending',
          url: config.url,
          type: config.type,
          created_at: new Date().toISOString(),
          progress: {
            pages_crawled: 0,
            chunks_created: 0
          }
        }

        // Set current job and start running
        set({
          currentJob: newJob,
          isRunning: true,
          progress: 0,
          logs: [`🚀 Starting crawl for ${config.tenant_id}...`]
        })

        // Add to jobs history
        set(state => ({
          jobs: [newJob, ...state.jobs]
        }))

        try {
          // Use the queue API by default (most production-ready)
          const apiEndpoint = '/api/admin/crawl-queue'

          get().addLog(`🔧 Starting crawl job...`)

          // Call the crawl API
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
          })

          if (!response.ok) {
            throw new Error(`Crawl API error: ${response.status}`)
          }

          const result = await response.json() as CrawlApiResponse

          if (result.success) {
            const remoteJobId = result.job_id || jobId
            const queuedJob = { ...newJob, remote_job_id: remoteJobId, status: 'queued' as const }
            set({ currentJob: queuedJob })
            set(state => ({ jobs: state.jobs.map(job => job.id === jobId ? queuedJob : job) }))
            get().pollJobStatus(jobId, remoteJobId)
          } else {
            throw new Error(result.error || 'Crawl failed')
          }

        } catch (error) {
          console.error('Crawl start failed:', error)

          const failedJob = {
            ...newJob,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          }

          set({
            currentJob: failedJob,
            isRunning: false,
            progress: 0
          })

          // Update in jobs history
          set(state => ({
            jobs: state.jobs.map(job =>
              job.id === jobId ? failedJob : job
            )
          }))

          get().addLog(`❌ Crawl failed: ${failedJob.error}`)
          throw error
        }
      },

      // Poll job status (internal method) - add to interface
      pollJobStatus: async (localJobId: string, remoteJobId: string) => {
        let pollCount = 0
        const maxPolls = 900 // 30 minutes max (900 * 2 seconds)

        const pollInterval = setInterval(async () => {
          pollCount++

          // Timeout after max polls
          if (pollCount > maxPolls) {
            clearInterval(pollInterval)
            set({ isRunning: false, progress: 0 })
            get().addLog('⏰ Crawl timeout after 30 minutes')
            return
          }
          try {
            // Use the queue status endpoint
            const statusEndpoint = `/api/admin/crawl-queue/status/${remoteJobId}`

            const response = await fetch(statusEndpoint)

            if (!response.ok) {
              throw new Error(`Status API error: ${response.status}`)
            }

            const statusData = await response.json() as CrawlStatusResponse

            // Handle both response formats: { job: {...} } or direct job data
            const jobStatus: JobStatusData = statusData.job || (statusData as unknown as JobStatusData)

            // Update current job
            const updatedJob: CrawlJob = {
              id: localJobId,
              remote_job_id: remoteJobId,
              tenant_id: jobStatus.config?.tenant_id || get().currentJob?.tenant_id || '',
              status: normalizeStatus(jobStatus.status),
              url: jobStatus.config?.url || get().currentJob?.url || '',
              type: get().currentJob?.type || 'single',
              created_at: get().currentJob?.created_at || new Date().toISOString(),
              progress: {
                pages_crawled: jobStatus.result?.chunks || 0,
                chunks_created: jobStatus.result?.chunks || 0
              }
            }

            if (jobStatus.status === 'completed') {
              updatedJob.completed_at = new Date().toISOString()
              clearInterval(pollInterval)
              set({ currentJob: updatedJob, isRunning: false, progress: 100 })
              set(state => ({ jobs: state.jobs.map(job => job.id === localJobId ? updatedJob : job) }))
              get().addLog('✅ Crawl completed successfully!')

              // Show result details if available
              if (jobStatus.result?.chunks) {
                const duration = jobStatus.result.duration || 'unknown time'
                get().addLog(`📊 Created ${jobStatus.result.chunks} chunks in ${duration}`)
              }

              return // Stop polling
            } else if (jobStatus.status === 'failed') {
              updatedJob.error = jobStatus.error || 'Unknown error'
              updatedJob.completed_at = new Date().toISOString()
              clearInterval(pollInterval)
              set({ currentJob: updatedJob, isRunning: false, progress: 0 })
              set(state => ({ jobs: state.jobs.map(job => job.id === localJobId ? updatedJob : job) }))
              get().addLog(`❌ Crawl failed: ${updatedJob.error}`)

              return // Stop polling
            } else if (jobStatus.status === 'running') {
              // Update progress based on job progress
              const progress = jobStatus.progress || 0
              set({ progress })
              get().addLog(`🔄 Processing... ${progress}%`)
            } else if (jobStatus.status === 'queued') {
              get().addLog('⏳ Job queued, waiting to start...')
            } else if (jobStatus.status === 'processing') {
              const totalChunks = jobStatus.total_chunks || 0
              const processedChunks = jobStatus.processed_chunks || 0
              const progress = totalChunks > 0
                ? (processedChunks / totalChunks) * 100
                : 0
              set({ progress })
              get().addLog(`📊 Processing: ${processedChunks}/${totalChunks} chunks`)
            }

            set({ currentJob: updatedJob })

            // Update in jobs history
            set(state => ({
              jobs: state.jobs.map(job =>
                job.id === localJobId ? updatedJob : job
              )
            }))

          } catch (error) {
            console.error('Status polling error:', error)
            get().addLog(`⚠️ Status update failed: ${error}`)
          }
        }, 2000) // Poll every 2 seconds

        // Stop polling after 30 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          if (get().isRunning) {
            set({ isRunning: false })
            get().addLog('⏰ Polling timeout - check job status manually')
          }
        }, 30 * 60 * 1000)
      },

      // Cancel crawl
      cancelCrawl: async () => {
        const { currentJob } = get()
        if (!currentJob || !get().isRunning) return

        try {
          const response = await fetch(`/api/admin/crawl-queue/cancel/${currentJob.remote_job_id ?? currentJob.id}`, {
            method: 'POST'
          })
          if (!response.ok) throw new Error(`Cancel API error: ${response.status}`)

          const cancelledJob = {
            ...currentJob,
            status: 'failed' as const,
            error: 'Cancelled by user',
            completed_at: new Date().toISOString()
          }

          set({
            currentJob: cancelledJob,
            isRunning: false,
            progress: 0
          })

          // Update in jobs history
          set(state => ({
            jobs: state.jobs.map(job =>
              job.id === currentJob.id ? cancelledJob : job
            )
          }))

          get().addLog('🛑 Crawl cancelled by user')

        } catch (error) {
          console.error('Cancel crawl failed:', error)
          get().addLog(`⚠️ Cancel failed: ${error}`)
        }
      },

      // Clear logs
      clearLogs: () => {
        set({ logs: [] })
      },

      // Load jobs history
      loadJobs: async () => {
        try {
          // In a real implementation, this would fetch from an API
          // For now, we use the persisted state
          console.log('Jobs loaded from persisted state')
        } catch (error) {
          console.error('Load jobs failed:', error)
        }
      },

      // Delete job
      deleteJob: async (jobId: string) => {
        try {
          // Remove from local state
          set(state => ({
            jobs: state.jobs.filter(job => job.id !== jobId)
          }))

          // If it's the current job, clear it
          if (get().currentJob?.id === jobId) {
            set({ currentJob: null, isRunning: false, progress: 0, logs: [] })
          }

        } catch (error) {
          console.error('Delete job failed:', error)
        }
      },

      // Internal setters
      setCurrentJob: (job: CrawlJob | null) => {
        set({ currentJob: job })
      },

      setProgress: (progress: number) => {
        set({ progress })
      },

      addLog: (log: string) => {
        set(state => ({
          logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${log}`]
        }))
      },

    }),
    {
      name: 'crawl-store',
      partialize: (state) => ({
        jobs: state.jobs,
        currentJob: state.currentJob,
      }),
    }
  )
)
