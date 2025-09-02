import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

// Helper function for cross-runtime environment variable access
function getEnvVariable(key: string, env?: Record<string, unknown>): string | undefined {
  // Try Cloudflare Workers context first (production)
  if (env && env[key]) {
    return env[key] as string
  }
  
  // Fallback to process.env (local development)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]
  }
  
  return undefined
}

// Note: Edge runtime temporarily disabled for OpenNext compatibility
// export const runtime = 'edge'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params

    console.log(`🔄 Starting re-crawl for database: ${databaseId}`)

    // Get Cloudflare Workers environment context
    let env: Record<string, unknown> = {}
    try {
      const context = getRequestContext()
      env = (context.env as Record<string, unknown>) || {}
    } catch (error) {
      console.log('🖥️ Running in local development mode')
    }

    // 1. Get database details from KV to retrieve original crawl config
    const kvResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${getEnvVariable('CLOUDFLARE_ACCOUNT_ID', env)}/storage/kv/namespaces/${getEnvVariable('CLOUDFLARE_KV_NAMESPACE_ID', env)}/values/${databaseId}`,
      {
        headers: {
          'Authorization': `Bearer ${getEnvVariable('CLOUDFLARE_API_TOKEN', env)}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!kvResponse.ok) {
      if (kvResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Database not found'
        }, { status: 404 })
      }
      throw new Error(`KV API error: ${kvResponse.status}`)
    }

    const dbData = await kvResponse.json() as Record<string, unknown>

    // 2. Update database status to 'crawling'
    const updatedDbData = {
      ...dbData,
      status: 'crawling',
      last_updated: new Date().toISOString(),
      recent_activity: [
        {
          timestamp: new Date().toISOString(),
          action: 'Re-Crawl gestartet',
          details: 'Re-Crawl wurde manuell gestartet',
          status: 'info'
        },
        ...((dbData.recent_activity as unknown[]) || []).slice(0, 9) // Keep last 9 activities
      ]
    }

    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${getEnvVariable('CLOUDFLARE_ACCOUNT_ID', env)}/storage/kv/namespaces/${getEnvVariable('CLOUDFLARE_KV_NAMESPACE_ID', env)}/values/${databaseId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getEnvVariable('CLOUDFLARE_API_TOKEN', env)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedDbData)
      }
    )

    // 3. Trigger re-crawl via Modal.com API
    const crawlConfig = (dbData.crawl_config as Record<string, unknown>) || {}
    const crawlPayload = {
      url: dbData.source_url as string,
      tenant_id: databaseId,
      user_id: (dbData.user_id as string) || 'unknown',
      type: (crawlConfig.type as string) || 'single',
      embedding_model: (crawlConfig.embedding_model as string) || 'gemini-768',
      max_depth: crawlConfig.max_depth as number,
      limit: crawlConfig.limit as number,
      include_patterns: crawlConfig.include_patterns as string[],
      exclude_domains: crawlConfig.exclude_domains as string[],
      include_domains: crawlConfig.include_domains as string[],
      url_filter: crawlConfig.url_filter as string,
      exclude_external: (crawlConfig.exclude_external as boolean) || false,
      generate_summaries: (crawlConfig.generate_summaries as boolean) !== false,
      ultra_fast: (crawlConfig.ultra_fast as boolean) !== false,
      max_concurrent: (crawlConfig.max_concurrent as number) || 5,
      force: true,
      cleanup: true,
      exclude_social_media: (crawlConfig.exclude_social_media as boolean) !== false
    }

    console.log('📤 Sending re-crawl request to Modal.com:', crawlPayload)

    // Check if Crawl4AI environment variables are available
    const crawl4aiBaseUrl = getEnvVariable('CRAWL4AI_BASE_URL', env) || 'https://nico-gt91--crawl4ai-service'
    const crawl4aiKey = getEnvVariable('CRAWL4AI_API_KEY', env) || '042656740A2A4C26D541F83E2585E4676830C26F5D1F5A4BD54C99ECE22AA4A9'
    
    if (!crawl4aiKey) {
      throw new Error('Crawl4AI API credentials not configured')
    }

    // Determine the correct endpoint based on crawl type
    const crawlType = (crawlConfig.type as string) || 'single'
    let endpoint: string
    let apiPayload: Record<string, unknown>

    switch (crawlType) {
      case 'single':
        endpoint = `${crawl4aiBaseUrl}-crawl-single.modal.run`
        apiPayload = {
          url: crawlPayload.url,
          cache_mode: 'BYPASS',
          text_only: true,
          disable_images: true,
          disable_javascript: true
        }
        break
        
      case 'recursive':
        endpoint = `${crawl4aiBaseUrl}-crawl-recursive.modal.run`
        apiPayload = {
          start_url: crawlPayload.url,
          max_depth: crawlPayload.max_depth || 3,
          max_concurrent: crawlPayload.max_concurrent || 5,
          limit: crawlPayload.limit || 100,
          exclude_external_links: crawlPayload.exclude_external || true,
          exclude_social_media_links: crawlPayload.exclude_social_media !== false,
          exclude_domains: crawlPayload.exclude_domains || [],
          include_domains: crawlPayload.include_domains || [],
          include_url_patterns: crawlPayload.include_patterns || [],
          url_pattern_filter: crawlPayload.url_filter || ''
        }
        break
        
      case 'sitemap':
        endpoint = `${crawl4aiBaseUrl}-crawl-sitemap.modal.run`
        apiPayload = {
          sitemap_url: crawlPayload.url,
          max_concurrent: crawlPayload.max_concurrent || 10
        }
        break
        
      case 'batch':
        endpoint = `${crawl4aiBaseUrl}-crawl-batch.modal.run`
        apiPayload = {
          urls: [crawlPayload.url],
          max_concurrent: crawlPayload.max_concurrent || 10
        }
        break
        
      default:
        throw new Error(`Unsupported crawl type: ${crawlType}`)
    }

    const modalResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${crawl4aiKey}`
      },
      body: JSON.stringify(apiPayload)
    })

    if (!modalResponse.ok) {
      // Update status back to error
      const errorDbData = {
        ...updatedDbData,
        status: 'error',
        recent_activity: [
          {
            timestamp: new Date().toISOString(),
            action: 'Re-Crawl fehlgeschlagen',
            details: `Fehler beim Starten des Re-Crawls: ${modalResponse.status}`,
            status: 'error'
          },
          ...((updatedDbData.recent_activity as unknown[]) || []).slice(0, 9)
        ]
      }

      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${getEnvVariable('CLOUDFLARE_ACCOUNT_ID', env)}/storage/kv/namespaces/${getEnvVariable('CLOUDFLARE_KV_NAMESPACE_ID', env)}/values/${databaseId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${getEnvVariable('CLOUDFLARE_API_TOKEN', env)}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorDbData)
        }
      )

      throw new Error(`Modal.com API error: ${modalResponse.status}`)
    }

    const modalResult = await modalResponse.json() as Record<string, unknown>

    console.log(`✅ Re-crawl started successfully for database ${databaseId}`)

    return NextResponse.json({
      success: true,
      message: `Re-crawl started for database ${databaseId}`,
      crawl_job_id: (modalResult.job_id as string) || 'unknown',
      estimated_duration: '5-15 minutes'
    })

  } catch (error) {
    console.error('❌ Re-crawl API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start re-crawl',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
