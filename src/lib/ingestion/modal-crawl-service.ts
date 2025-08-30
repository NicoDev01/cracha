import { CrawlConfig, CrawlResult, CrawlStatus } from './crawl-service'

export class ModalCrawlService {
  private static instance: ModalCrawlService
  private baseUrl: string

  private constructor() {
    this.baseUrl = process.env.MODAL_CRAWL_SERVICE_URL || 'https://nico-gt91--cracha-ingestion-orchestrator-secrets-fastapi-app.modal.run'
  }

  public static getInstance(): ModalCrawlService {
    if (!ModalCrawlService.instance) {
      ModalCrawlService.instance = new ModalCrawlService()
    }
    return ModalCrawlService.instance
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    try {
      console.log('🚀 Executing crawl via Modal Service:', this.baseUrl)
      
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          tenant_id: config.tenant_id,
          user_id: config.user_id,
          type: config.type || 'single',
          embedding_model: config.embedding_model || 'gemini-768',
          max_depth: config.max_depth || 1,
          limit: config.limit || 10,
          force: config.force !== false,
          cleanup: config.cleanup !== false,
          exclude_social_media: config.exclude_social_media !== false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Modal Service API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json() as {
        success: boolean;
        job_id: string;
        message?: string;
        status?: string;
      }
      
      console.log('✅ Crawl job queued successfully:', result)
      
      return {
        success: result.success,
        job_id: result.job_id,
        message: result.message || 'Crawl job sent to Modal Service successfully',
        status: result.status || 'queued'
      }

    } catch (error) {
      console.error('❌ Modal Service crawl failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        job_id: `error_${Date.now()}`
      }
    }
  }

  async getJobStatus(jobId: string): Promise<CrawlStatus> {
    try {
      console.log('📊 Getting job status from Modal Service:', jobId)
      
      const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Status API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json() as {
        success: boolean;
        job_id: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        created_at?: string;
        updated_at?: string;
        completed_at?: string;
        error?: string;
        result?: unknown;
      }
      
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

      return await response.json() as { status: string; service: string; timestamp: string }

    } catch (error) {
      console.error('❌ Health check failed:', error)
      throw error
    }
  }
}