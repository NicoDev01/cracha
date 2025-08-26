import { CrawlConfig, CrawlResult, CrawlStatus } from './crawl-service'

export class CloudflareWorkerService {
  private static instance: CloudflareWorkerService
  private baseUrl: string

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_INGESTION_API_URL || 'https://cracha-ingestion-worker.your-subdomain.workers.dev'
  }

  public static getInstance(): CloudflareWorkerService {
    if (!CloudflareWorkerService.instance) {
      CloudflareWorkerService.instance = new CloudflareWorkerService()
    }
    return CloudflareWorkerService.instance
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    try {
      console.log('🚀 Executing crawl via Cloudflare Worker:', this.baseUrl)
      
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          tenant_id: config.tenant_id,
          user_id: config.user_id,
          type: config.type,
          embedding_model: config.embedding_model,
          max_depth: config.max_depth,
          limit: config.limit,
          include_patterns: config.include_patterns,
          exclude_domains: config.exclude_domains,
          include_domains: config.include_domains,
          url_filter: config.url_filter,
          exclude_external: config.exclude_external,
          generate_summaries: config.generate_summaries,
          ultra_fast: config.ultra_fast,
          max_concurrent: config.max_concurrent,
          force: config.force,
          cleanup: config.cleanup,
          exclude_social_media: config.exclude_social_media
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloudflare Worker API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      console.log('✅ Crawl job queued successfully:', result)
      
      return {
        success: result.success,
        job_id: result.job_id,
        message: result.message,
        status: result.status
      }

    } catch (error) {
      console.error('❌ Cloudflare Worker crawl failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        job_id: `error_${Date.now()}`
      }
    }
  }

  async getJobStatus(jobId: string): Promise<CrawlStatus> {
    try {
      console.log('📊 Getting job status:', jobId)
      
      const response = await fetch(`${this.baseUrl}/crawl/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Status API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      return {
        success: result.success,
        job_id: result.job_id,
        status: result.status,
        created_at: result.created_at,
        updated_at: result.updated_at,
        completed_at: result.completed_at,
        error: result.error,
        result: result.result
      }

    } catch (error) {
      console.error('❌ Status check failed:', error)
      
      return {
        success: false,
        job_id: jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async healthCheck(): Promise<{ status: string; service: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      return await response.json()

    } catch (error) {
      console.error('❌ Health check failed:', error)
      throw error
    }
  }
}