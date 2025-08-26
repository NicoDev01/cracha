import { NextRequest, NextResponse } from 'next/server'
import { ServerCrawlServiceFactory } from '@/lib/ingestion/server-crawl-service-factory'
import type { CrawlStatus } from '@/lib/ingestion/crawl-service'

interface CrawlResultData {
  total_chunks?: number;
  processed_chunks?: number;
  estimated_cost?: number;
  pages_crawled?: number;
  chunks_created?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    // Use the service factory to get job status
    const crawlServiceFactory = ServerCrawlServiceFactory.getInstance()
    const status: CrawlStatus | null = await crawlServiceFactory.getJobStatus(jobId)

    if (status) {
      // Convert to expected format
      const result = status.result as CrawlResultData | undefined;
      const jobStatus = {
        job_id: status.job_id,
        status: status.status,
        tenant_id: 'unknown', // Not available in status response
        source_url: 'unknown', // Not available in status response
        total_chunks: result?.total_chunks || 0,
        processed_chunks: result?.processed_chunks || 0,
        estimated_cost: result?.estimated_cost || 0,
        created_at: status.created_at ? new Date(status.created_at).getTime() : Date.now(),
        completed_at: status.completed_at ? new Date(status.completed_at).getTime() : null,
        error: status.error,
        progress: {
          pages_crawled: result?.pages_crawled || 0,
          chunks_created: result?.chunks_created || 0,
          estimated_cost: result?.estimated_cost || 0
        }
      }

      return NextResponse.json({
        success: true,
        job: jobStatus
      })
    } else {
      // Fallback to mock status for services that don't support status checking
      const mockStatus = {
        job_id: jobId,
        status: 'completed', // Assume completed for non-async services
        tenant_id: 'unknown',
        source_url: 'unknown',
        total_chunks: 0,
        processed_chunks: 0,
        estimated_cost: 0,
        created_at: Date.now() - 300000,
        completed_at: Date.now(),
        progress: {
          pages_crawled: 0,
          chunks_created: 0,
          estimated_cost: 0
        }
      }

      return NextResponse.json({
        success: true,
        job: mockStatus
      })
    }

  } catch (error) {
    console.error('Status API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}