import { NextRequest, NextResponse } from 'next/server'

interface CrawlConfig {
  url: string
  tenant_id: string
  user_id: string
  type?: string
  embedding_model?: string
  max_depth?: number
  limit?: number
  force?: boolean
  cleanup?: boolean
  exclude_social_media?: boolean
  [key: string]: unknown
}

interface ModalCrawlResponse {
  success?: boolean
  job_id?: string
  status?: string
  message?: string
  [key: string]: unknown
}

function isModalCrawlResponse(obj: unknown): obj is ModalCrawlResponse {
  return typeof obj === 'object' && obj !== null
}

function isValidCrawlConfig(obj: unknown): obj is CrawlConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'url' in obj &&
    'tenant_id' in obj &&
    'user_id' in obj &&
    typeof (obj as Record<string, unknown>).url === 'string' &&
    typeof (obj as Record<string, unknown>).tenant_id === 'string' &&
    typeof (obj as Record<string, unknown>).user_id === 'string'
  )
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()

    // Validate and type check the config
    if (!isValidCrawlConfig(config)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: url, tenant_id, user_id' },
        { status: 400 }
      )
    }

    // Ensure user_id is present and not a fallback
    if (!config.user_id || config.user_id.startsWith('anonymous_')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required: Valid user_id is required for crawling' },
        { status: 401 }
      )
    }

    console.log('🚀 Sending crawl job to Modal Service for user:', config.user_id)
    console.log('🏢 Tenant ID:', config.tenant_id)

    // Use Modal Service instead of local queue
    const response = await fetch('https://nico-gt91--cracha-ingestion-orchestrator-secrets-fastapi-app.modal.run/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: config.url,
        tenant_id: config.tenant_id,
        user_id: config.user_id,
        type: config.type || 'single',
        embedding_model: config.embedding_model || 'gemini-768',
        max_depth: config.max_depth || 1,
        limit: config.limit || 10,
        force: config.force !== false,
        cleanup: config.cleanup !== false,
        exclude_social_media: config.exclude_social_media !== false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Modal Service Error:', response.status, errorText)
      return NextResponse.json({
        success: false,
        error: `Modal Service error: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const rawResult = await response.json()
    console.log('✅ Modal Service Response:', rawResult)

    // Type guard the result
    if (!isModalCrawlResponse(rawResult)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid response format from Modal Service'
      }, { status: 500 })
    }

    const result = rawResult as ModalCrawlResponse

    return NextResponse.json({
      success: result.success || true,
      job_id: result.job_id,
      status: 'queued',
      message: result.message || 'Crawl job sent to Modal Service successfully'
    })

  } catch (error) {
    console.error('❌ Crawl API Error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to send crawl job to Modal Service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}