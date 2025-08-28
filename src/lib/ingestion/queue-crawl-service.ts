import { CrawlConfig, CrawlResult, CrawlStatus } from './crawl-service'

export class QueueCrawlService {
  private static instance: QueueCrawlService

  public static getInstance(): QueueCrawlService {
    if (!QueueCrawlService.instance) {
      QueueCrawlService.instance = new QueueCrawlService()
    }
    return QueueCrawlService.instance
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    try {
      console.log('🚀 Queueing crawl job via Bull Queue')
      
      const baseUrl = this.getBaseUrl()
      const response = await fetch(`${baseUrl}/api/admin/crawl-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Queue API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json() as {
        success: boolean;
        job_id: string;
        message: string;
        status: string;
      }
      
      console.log('✅ Crawl job queued successfully:', result)
      
      return {
        success: result.success,
        job_id: result.job_id,
        message: result.message,
        status: result.status // 'queued'
      }

    } catch (error) {
      console.error('❌ Queue crawl failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        job_id: `error_${Date.now()}`
      }
    }
  }

  async getJobStatus(jobId: string): Promise<CrawlStatus> {
    try {
      console.log('📊 Getting queue job status:', jobId)
      
      const baseUrl = this.getBaseUrl()
      const response = await fetch(`${baseUrl}/api/admin/crawl-queue/status/${jobId}`, {
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
        job: {
          job_id: string;
          status: 'pending' | 'running' | 'completed' | 'failed';
          progress?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string;
          error?: string;
          result?: unknown;
        };
      }
      
      return {
        success: result.success,
        job_id: result.job.job_id,
        status: result.job.status,
        progress: result.job.progress,
        created_at: result.job.created_at,
        updated_at: result.job.updated_at,
        completed_at: result.job.completed_at,
        error: result.job.error,
        result: result.job.result
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
    return {
      status: 'healthy',
      service: 'bull-queue',
      timestamp: new Date().toISOString()
    }
  }
}