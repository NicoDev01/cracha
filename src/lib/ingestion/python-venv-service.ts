import { CrawlConfig, CrawlResult, CrawlStatus } from './crawl-service'

export class PythonVenvService {
  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // Client-side: use current origin
      return window.location.origin
    }
    // Server-side: use localhost for development
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    try {
      console.log('🐍 Executing crawl via Python venv')
      
      const baseUrl = this.getBaseUrl()
      const response = await fetch(`${baseUrl}/api/admin/crawl-python`, {
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
        throw new Error(`Python API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json() as {
        success: boolean;
        job_id: string;
        message: string;
        output: string;
        duration: string;
      }
      
      console.log('✅ Python crawl completed:', result)
      
      return {
        success: result.success,
        job_id: result.job_id,
        message: result.message,
        output: result.output,
        duration: result.duration
      }

    } catch (error) {
      console.error('❌ Python venv crawl failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        job_id: `error_${Date.now()}`
      }
    }
  }

  async healthCheck(): Promise<{ status: string; service: string; timestamp: string }> {
    return {
      status: 'healthy',
      service: 'python-venv',
      timestamp: new Date().toISOString()
    }
  }
}