import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params

    console.log(`📊 Loading detailed database info for: ${databaseId}`)

    // Get database details from Cloudflare KV
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

    // Get vector count from Vectorize (optional - might be slow)
    let vectorCount = 0
    try {
      const vectorizeResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/vectorize/indexes/cracha-768/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vector: new Array(768).fill(0), // Dummy vector for count query
            topK: 1,
            namespace: databaseId,
            returnMetadata: false
          })
        }
      )

      if (vectorizeResponse.ok) {
        const vectorData = await vectorizeResponse.json()
        vectorCount = vectorData.result?.matches?.length || 0
      }
    } catch (vectorError) {
      console.warn('⚠️ Could not get vector count:', vectorError)
    }

    // Prepare detailed response
    const detailedInfo = {
      id: dbData.id || databaseId,
      name: dbData.name || databaseId,
      description: dbData.description || `Database: ${dbData.name || databaseId}`,
      status: dbData.status || 'active',
      document_count: parseInt(dbData.document_count) || 0,
      chunk_count: parseInt(dbData.chunk_count) || 0,
      vector_count: vectorCount || parseInt(dbData.vector_count) || 0,
      created_at: dbData.created_at || new Date().toISOString(),
      updated_at: dbData.last_updated || dbData.created_at || new Date().toISOString(),
      last_crawl: dbData.last_crawl || null,
      source_url: dbData.source_url || '',
      crawl_config: dbData.crawl_config || {
        type: 'single',
        embedding_model: 'gemini-768',
        max_depth: null,
        limit: null,
        include_patterns: [],
        exclude_patterns: []
      },
      urls: dbData.urls || (dbData.source_url ? [dbData.source_url] : []),
      recent_activity: dbData.recent_activity || [
        {
          timestamp: dbData.created_at || new Date().toISOString(),
          action: 'Datenbank erstellt',
          details: 'Datenbank wurde erfolgreich erstellt',
          status: 'success'
        }
      ],
      // Additional metadata
      metadata: {
        user_id: dbData.user_id || 'unknown',
        embedding_model: dbData.crawl_config?.embedding_model || 'gemini-768',
        total_tokens: dbData.total_tokens || 0,
        estimated_cost: dbData.estimated_cost || 0,
        crawl_duration: dbData.crawl_duration || null,
        error_count: dbData.error_count || 0,
        success_rate: dbData.success_rate || 100
      }
    }

    return NextResponse.json(detailedInfo)

  } catch (error) {
    console.error('❌ Database Details API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}