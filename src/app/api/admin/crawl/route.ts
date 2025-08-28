import { NextRequest, NextResponse } from 'next/server'
import { ServerCrawlServiceFactory } from '@/lib/ingestion/server-crawl-service-factory'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json() as Record<string, unknown>
    
    // Validate required fields
    if (!config.url || !config.tenant_id || !config.user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: url, tenant_id, user_id' },
        { status: 400 }
      )
    }

    // Process array parameters
    const processedConfig = {
      ...config,
      include_patterns: config.include_patterns ? 
        String(config.include_patterns).split('\n').filter((p: string) => p.trim()) : undefined,
      exclude_domains: config.exclude_domains ? 
        String(config.exclude_domains).split('\n').filter((d: string) => d.trim()) : undefined,
      include_domains: config.include_domains ? 
        String(config.include_domains).split(' ').filter((d: string) => d.trim()) : undefined,
      
      // Set defaults
      type: config.type || 'single',
      embedding_model: config.embedding_model || 'gemini-768',
      force: true, // Skip cost confirmation in API mode
      max_concurrent: config.max_concurrent || 5,
      cleanup: config.cleanup !== false,
      exclude_social_media: config.exclude_social_media !== false
    }

    console.log('Starting crawl with config:', processedConfig)

    // Use the service factory to get the appropriate service
    const crawlServiceFactory = ServerCrawlServiceFactory.getInstance()
    console.log(`🔧 Using service: ${crawlServiceFactory.getServiceType()}`)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await crawlServiceFactory.executeCrawl(processedConfig as any)

    if (result.success) {
      // Check if this is an async job (Cloudflare Worker)
      const asyncResult = await handleAsyncJob(result, config as { tenant_id: string; url: string })
      if (asyncResult) {
        return NextResponse.json(asyncResult)
      }

      // Parse output for completed job information
      const jobInfo = {
        job_id: result.job_id,
        tenant_id: config.tenant_id,
        status: 'completed',
        source_url: config.url,
        total_chunks: extractNumberFromOutput(result.output || '', 'chunks'),
        processed_chunks: extractNumberFromOutput(result.output || '', 'chunks'),
        estimated_cost: extractCostFromOutput(result.output || ''),
        created_at: Date.now() - parseInt(result.duration?.replace('ms', '') || '0'),
        completed_at: Date.now()
      }

      return NextResponse.json({ 
        success: true, 
        message: result.message,
        job_id: result.job_id,
        job: jobInfo,
        output: result.output,
        duration: result.duration
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        duration: result.duration
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Crawl API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to handle job status for async services
async function handleAsyncJob(result: { success: boolean; status?: string; job_id?: string; message?: string }, config: { tenant_id: string; url: string }) {
  if (result.status === 'pending' || result.status === 'running') {
    // For async services, return job info immediately
    const jobInfo = {
      job_id: result.job_id,
      tenant_id: config.tenant_id,
      status: result.status,
      source_url: config.url,
      total_chunks: 0,
      processed_chunks: 0,
      estimated_cost: 0,
      created_at: Date.now(),
      completed_at: null
    }

    return {
      success: true,
      message: result.message || 'Crawl job queued successfully',
      job_id: result.job_id,
      job: jobInfo,
      output: `Job ${result.job_id} queued for processing`,
      duration: '0ms',
      async: true
    }
  }
  
  return null
}

// Helper functions to extract information from Python CLI output
function extractNumberFromOutput(output: string, type: 'chunks' | 'pages'): number {
  const patterns = {
    chunks: /Created (\d+) chunks/i,
    pages: /Pages Processed: (\d+)/i
  }
  
  const match = output.match(patterns[type])
  return match ? parseInt(match[1], 10) : 0
}

function extractCostFromOutput(output: string): number {
  const costMatch = output.match(/Total Cost: \$([0-9.]+)/i)
  return costMatch ? parseFloat(costMatch[1]) : 0
}