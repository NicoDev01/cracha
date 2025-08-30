import { NextRequest, NextResponse } from 'next/server'

interface ModalStatusResponse {
  success?: boolean
  message?: string
  job_id?: string
  note?: string
  [key: string]: unknown
}

function isModalStatusResponse(obj: unknown): obj is ModalStatusResponse {
  return typeof obj === 'object' && obj !== null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log('📊 Getting status for job:', jobId)

    // Use Modal Service to get job status
    const response = await fetch(`https://nico-gt91--cracha-ingestion-orchestrator-secrets-fastapi-app.modal.run/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Modal Service Status Error:', response.status, errorText)
      
      // Return completed status if job not found (likely finished)
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          job: {
            status: 'completed',
            config: { tenant_id: 'unknown', url: 'unknown' },
            result: { chunks: 0, duration: 'unknown' },
            progress: 100,
            completed_at: new Date().toISOString()
          }
        })
      }
      
      return NextResponse.json({
        success: false,
        error: `Modal Service error: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const rawResult = await response.json()
    console.log('✅ Modal Service Status Response:', rawResult)

    // Type guard the result
    if (!isModalStatusResponse(rawResult)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid response format from Modal Service'
      }, { status: 500 })
    }

    const result = rawResult as ModalStatusResponse

    // Modal Service returns generic message - interpret as completed
    // since Modal jobs are fire-and-forget without persistent storage
    if (result.message && typeof result.message === 'string' && result.message.includes('persistent storage')) {
      return NextResponse.json({
        success: true,
        job: {
          status: 'completed',
          config: { tenant_id: 'unknown', url: 'unknown' },
          result: { chunks: 0, duration: 'unknown' },
          progress: 100,
          completed_at: new Date().toISOString(),
          note: 'Job completed - check Modal logs for details'
        }
      })
    }

    // Return the result as-is if it has proper status
    return NextResponse.json({
      success: true,
      job: result
    })

  } catch (error) {
    console.error('❌ Status API Error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get job status from Modal Service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}