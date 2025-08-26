import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/queue/simple-job-queue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    console.log(`📊 Getting status for job: ${jobId}`)

    const job = jobQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    // Convert to our format
    const jobStatus = {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      created_at: job.createdAt,
      updated_at: job.startedAt || job.createdAt,
      completed_at: job.completedAt,
      error: job.error,
      result: job.result,
      config: job.config
    }

    return NextResponse.json({
      success: true,
      job: jobStatus
    })

  } catch (error) {
    console.error('❌ Status API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Status is already in our format, no mapping needed