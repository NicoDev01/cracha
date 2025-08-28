import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/queue/simple-job-queue'

export async function POST(request: NextRequest) {
  try {
    const config: any = await request.json()
    
    // Validate required fields
    if (!config.url || !config.tenant_id || !config.user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: url, tenant_id, user_id' },
        { status: 400 }
      )
    }

    console.log('🚀 Queueing crawl job:', config)

    // Add job to queue
    const jobId = jobQueue.addJob(config)

    console.log(`✅ Crawl job queued with ID: ${jobId}`)

    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: 'queued',
      message: 'Crawl job added to queue successfully'
    })

  } catch (error) {
    console.error('❌ Queue API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to queue crawl job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}