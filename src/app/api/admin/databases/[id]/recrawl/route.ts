import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params

    console.log(`🔄 Starting re-crawl for database: ${databaseId}`)

    // 1. Get database details from KV to retrieve original crawl config
    const kvResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${databaseId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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

    const dbData = await kvResponse.json()

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
        ...(dbData.recent_activity || []).slice(0, 9) // Keep last 9 activities
      ]
    }

    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${databaseId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedDbData)
      }
    )

    // 3. Trigger re-crawl via Modal.com API
    const crawlConfig = dbData.crawl_config || {}
    const crawlPayload = {
      url: dbData.source_url,
      tenant_id: databaseId,
      user_id: dbData.user_id || 'unknown',
      type: crawlConfig.type || 'single',
      embedding_model: crawlConfig.embedding_model || 'gemini-768',
      max_depth: crawlConfig.max_depth,
      limit: crawlConfig.limit,
      include_patterns: crawlConfig.include_patterns,
      exclude_domains: crawlConfig.exclude_domains,
      include_domains: crawlConfig.include_domains,
      url_filter: crawlConfig.url_filter,
      exclude_external: crawlConfig.exclude_external || false,
      generate_summaries: crawlConfig.generate_summaries !== false,
      ultra_fast: crawlConfig.ultra_fast !== false,
      max_concurrent: crawlConfig.max_concurrent || 5,
      force: true,
      cleanup: true,
      exclude_social_media: crawlConfig.exclude_social_media !== false
    }

    console.log('📤 Sending re-crawl request to Modal.com:', crawlPayload)

    // Check if Modal.com environment variables are available
    if (!process.env.CRAWL4AI_BASE_URL || !process.env.CRAWL4AI_API_KEY) {
      throw new Error('Modal.com API credentials not configured')
    }

    const modalResponse = await fetch(
      `${process.env.CRAWL4AI_BASE_URL}/crawl`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRAWL4AI_API_KEY}`
        },
        body: JSON.stringify(crawlPayload)
      }
    )

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
          ...updatedDbData.recent_activity.slice(0, 9)
        ]
      }

      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${databaseId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorDbData)
        }
      )

      throw new Error(`Modal.com API error: ${modalResponse.status}`)
    }

    const modalResult = await modalResponse.json()

    console.log(`✅ Re-crawl started successfully for database ${databaseId}`)

    return NextResponse.json({
      success: true,
      message: `Re-crawl started for database ${databaseId}`,
      crawl_job_id: modalResult.job_id || 'unknown',
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