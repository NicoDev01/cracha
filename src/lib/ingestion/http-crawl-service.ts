import { CrawlConfig, CrawlResult } from './crawl-service'

export class HttpCrawlService {
  private static instance: HttpCrawlService
  private baseUrl: string

  constructor() {
    // This could be a separate Python FastAPI service running on localhost
    this.baseUrl = process.env.PYTHON_INGESTION_URL || 'http://localhost:8000'
  }

  public static getInstance(): HttpCrawlService {
    if (!HttpCrawlService.instance) {
      HttpCrawlService.instance = new HttpCrawlService()
    }
    return HttpCrawlService.instance
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    const startTime = Date.now()
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      console.log(`Making HTTP request to ${this.baseUrl}/crawl`)
      
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          job_id: jobId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const duration = Date.now() - startTime

      return {
        success: result.success || true,
        job_id: result.job_id || jobId,
        message: result.message || 'Crawl completed successfully',
        output: result.output || JSON.stringify(result),
        duration: `${duration}ms`
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('HTTP Crawl execution failed:', error)

      return {
        success: false,
        job_id: jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      })
      return response.ok
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }
}