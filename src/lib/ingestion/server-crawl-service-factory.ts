import 'server-only'
import { CrawlConfig, CrawlResult, CrawlStatus } from './crawl-service'

export interface ICrawlService {
  executeCrawl(config: CrawlConfig): Promise<CrawlResult>
  getJobStatus?(jobId: string): Promise<CrawlStatus>
  healthCheck?(): Promise<{ status: string; service: string; timestamp: string }>
}

export class ServerCrawlServiceFactory {
  private static instance: ServerCrawlServiceFactory
  private service: ICrawlService | null = null

  private constructor() {}

  public static getInstance(): ServerCrawlServiceFactory {
    if (!ServerCrawlServiceFactory.instance) {
      ServerCrawlServiceFactory.instance = new ServerCrawlServiceFactory()
    }
    return ServerCrawlServiceFactory.instance
  }

  private async createService(): Promise<ICrawlService> {
    // Check environment variables to determine which service to use
    const useMock = process.env.USE_MOCK_CRAWL === 'true'
    const useCloudflareWorker = process.env.USE_CLOUDFLARE_WORKER === 'true'
    const usePythonVenv = process.env.USE_PYTHON_VENV === 'true'
    const useQueue = process.env.USE_QUEUE_CRAWL === 'true'

    console.log('🔧 Server Crawl Service Configuration:')
    console.log(`  USE_MOCK_CRAWL: ${useMock}`)
    console.log(`  USE_QUEUE_CRAWL: ${useQueue}`)
    console.log(`  USE_PYTHON_VENV: ${usePythonVenv}`)
    console.log(`  USE_CLOUDFLARE_WORKER: ${useCloudflareWorker}`)

    if (useMock) {
      console.log('📝 Using Mock Crawl Service for UI testing')
      const { MockCrawlService } = await import('./mock-crawl-service')
      return MockCrawlService.getInstance()
    }

    if (useQueue) {
      console.log('🚀 Using Simple Job Queue Service (production-ready)')
      const { QueueCrawlService } = await import('./queue-crawl-service')
      return QueueCrawlService.getInstance()
    }

    if (usePythonVenv) {
      console.log('🐍 Using Python venv Service (integrated)')
      const { PythonVenvService } = await import('./python-venv-service')
      return new PythonVenvService()
    }

    if (useCloudflareWorker) {
      console.log('☁️ Using Cloudflare Worker → Modal.com main.py API')
      const { CloudflareWorkerService } = await import('./cloudflare-worker-service')
      return CloudflareWorkerService.getInstance()
    }

    console.log('🐧 Using Simple WSL Service (fallback)')
    const { SimpleCrawlService } = await import('./simple-crawl-service')
    return SimpleCrawlService.getInstance()
  }

  public async getService(): Promise<ICrawlService> {
    if (!this.service) {
      this.service = await this.createService()
    }
    return this.service
  }

  // Convenience methods
  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    const service = await this.getService()
    return service.executeCrawl(config)
  }

  async getJobStatus(jobId: string): Promise<CrawlStatus | null> {
    const service = await this.getService()
    if (service.getJobStatus) {
      return service.getJobStatus(jobId)
    }
    return null
  }

  async healthCheck(): Promise<{ status: string; service: string; timestamp: string } | null> {
    const service = await this.getService()
    if (service.healthCheck) {
      return service.healthCheck()
    }
    return null
  }

  // Get service type for logging
  getServiceType(): string {
    const useMock = process.env.USE_MOCK_CRAWL === 'true'
    const useCloudflareWorker = process.env.USE_CLOUDFLARE_WORKER === 'true'
    const usePythonVenv = process.env.USE_PYTHON_VENV === 'true'
    const useQueue = process.env.USE_QUEUE_CRAWL === 'true'

    if (useMock) return 'Mock Service'
    if (useQueue) return 'Simple Job Queue (production)'
    if (usePythonVenv) return 'Python venv (integrated)'
    if (useCloudflareWorker) return 'Cloudflare Worker → Modal.com'
    return 'WSL Service'
  }
}