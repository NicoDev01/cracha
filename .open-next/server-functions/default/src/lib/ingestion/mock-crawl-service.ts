import { CrawlConfig, CrawlResult } from './crawl-service'

export class MockCrawlService {
  private static instance: MockCrawlService
  
  public static getInstance(): MockCrawlService {
    if (!MockCrawlService.instance) {
      MockCrawlService.instance = new MockCrawlService()
    }
    return MockCrawlService.instance
  }

  async executeCrawl(config: CrawlConfig): Promise<CrawlResult> {
    const startTime = Date.now()
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log('🎭 Mock Crawl Service - Simulating crawl for:', config.url)

    // Simulate crawl processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    const duration = Date.now() - startTime

    // Mock successful crawl result
    const mockOutput = `
🚀 Starting crawl and ingest for tenant: ${config.tenant_id}
🌐 URL: ${config.url}
📊 Type: ${config.type}

📄 Created 25 chunks from 1 pages
✅ Created 25 chunks from crawl
💰 Estimated cost: $0.000210 (${config.embedding_model})
🔮 Creating embeddings with ${config.embedding_model}...
🔮 Processing 25 texts...
✅ Successfully uploaded 25 vectors to Vectorize
✅ Database ${config.tenant_id} registered in registry
✅ Crawl and ingest completed successfully!

📊 Final Statistics:
- Pages crawled: 1
- Chunks created: 25
- Total cost: $0.000210
- Duration: ${duration}ms
    `.trim()

    return {
      success: true,
      job_id: jobId,
      message: 'Mock crawl completed successfully',
      output: mockOutput,
      duration: `${duration}ms`
    }
  }
}