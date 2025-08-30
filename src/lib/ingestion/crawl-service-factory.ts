import { CrawlConfig, CrawlResult, CrawlStatus } from './crawl-service'

// Dynamic imports to avoid client-side loading of Node.js modules
async function loadMockService() {
  const { MockCrawlService } = await import('./mock-crawl-service')
  return MockCrawlService.getInstance()
}

async function loadQueueService() {
  const { QueueCrawlService } = await import('./queue-crawl-service')
  return QueueCrawlService.getInstance()
}

async function loadPythonVenvService() {
  const { PythonVenvService } = await import('./python-venv-service')
  return new PythonVenvService()
}

async function loadCloudflareWorkerService() {
  const { CloudflareWorkerService } = await import('./cloudflare-worker-service')
  return CloudflareWorkerService.getInstance()
}

async function loadModalService() {
  const { ModalCrawlService } = await import('./modal-crawl-service')
  return ModalCrawlService.getInstance()
}

async function loadSimpleCrawlService() {
  const { SimpleCrawlService } = await import('./simple-crawl-service')
  return SimpleCrawlService.getInstance()
}

export interface ICrawlService {
  executeCrawl(config: CrawlConfig): Promise<CrawlResult>
  getJobStatus?(jobId: string): Promise<CrawlStatus>
  healthCheck?(): Promise<{ status: string; service: string; timestamp: string }>
}

export class CrawlServiceFactory {
  private static instance: CrawlServiceFactory
  private service: ICrawlService | null = null

  private constructor() {
    // Don't initialize service in constructor to avoid client-side issues
  }

  public static getInstance(): CrawlServiceFactory {
    if (!CrawlServiceFactory.instance) {
      CrawlServiceFactory.instance = new CrawlServiceFactory()
    }
    return CrawlServiceFactory.instance
  }

  private async createService(): Promise<ICrawlService> {
    // Check environment variables to determine which service to use
    const useMock = process.env.USE_MOCK_CRAWL === 'true'
    const useModal = process.env.USE_MODAL_CRAWL === 'true'
    const useCloudflareWorker = process.env.USE_CLOUDFLARE_WORKER === 'true'
    const usePythonVenv = process.env.USE_PYTHON_VENV === 'true'
    const useQueue = process.env.USE_QUEUE_CRAWL === 'true'

    console.log('🔧 Crawl Service Configuration:')
    console.log(`  USE_MOCK_CRAWL: ${useMock}`)
    console.log(`  USE_MODAL_CRAWL: ${useModal}`)
    console.log(`  USE_QUEUE_CRAWL: ${useQueue}`)
    console.log(`  USE_PYTHON_VENV: ${usePythonVenv}`)
    console.log(`  USE_CLOUDFLARE_WORKER: ${useCloudflareWorker}`)

    if (useMock) {
      console.log('📝 Using Mock Crawl Service for UI testing')
      return await loadMockService()
    }

    if (useModal) {
      console.log('🚀 Using Modal.com Ingestion Service (production)')
      return await loadModalService()
    }

    if (useQueue) {
      console.log('🚀 Using Simple Job Queue Service (production-ready)')
      return await loadQueueService()
    }

    if (usePythonVenv) {
      console.log('🐍 Using Python venv Service (integrated)')
      return await loadPythonVenvService()
    }

    if (useCloudflareWorker) {
      console.log('☁️ Using Cloudflare Worker → Modal.com main.py API')
      return await loadCloudflareWorkerService()
    }

    console.log('🐧 Using Simple WSL Service (fallback)')
    return await loadSimpleCrawlService()
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

  // Get service type for UI display
  getServiceType(): string {
    const useMock = process.env.USE_MOCK_CRAWL === 'true'
    const useModal = process.env.USE_MODAL_CRAWL === 'true'
    const useCloudflareWorker = process.env.USE_CLOUDFLARE_WORKER === 'true'
    const usePythonVenv = process.env.USE_PYTHON_VENV === 'true'
    const useQueue = process.env.USE_QUEUE_CRAWL === 'true'

    if (useMock) return 'Mock Service'
    if (useModal) return 'Modal.com Ingestion Service'
    if (useQueue) return 'Simple Job Queue (production)'
    if (usePythonVenv) return 'Python venv (integrated)'
    if (useCloudflareWorker) return 'Cloudflare Worker → Modal.com'
    return 'WSL Service'
  }
}