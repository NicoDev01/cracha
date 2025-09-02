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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params

    console.log(`📊 Loading detailed database info for: ${databaseId}`)

    // Get Cloudflare Workers environment context
    let env: Record<string, unknown> = {}
    try {
      const context = getRequestContext()
      env = (context.env as Record<string, unknown>) || {}
    } catch {
      console.log('🖥️ Running in local development mode')
    }

    // Get database details from Cloudflare KV
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

    // Get vector count from Vectorize (optional - might be slow)
    let vectorCount = 0
    try {
      const vectorizeResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${getEnvVariable('CLOUDFLARE_ACCOUNT_ID', env)}/vectorize/indexes/cracha-768/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getEnvVariable('CLOUDFLARE_API_TOKEN', env)}`,
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
        const vectorData: { result?: { matches?: unknown[] } } = await vectorizeResponse.json()
        vectorCount = vectorData.result?.matches?.length || 0
      }
    } catch (vectorError) {
      console.warn('⚠️ Could not get vector count:', vectorError)
    }

    // Prepare detailed response
    const detailedInfo = {
      id: (dbData.id as string) || databaseId,
      name: (dbData.name as string) || databaseId,
      description: (dbData.description as string) || `Database: ${(dbData.name as string) || databaseId}`,
      status: (dbData.status as string) || 'active',
      document_count: parseInt(String(dbData.document_count)) || 0,
      chunk_count: parseInt(String(dbData.chunk_count)) || 0,
      vector_count: vectorCount || parseInt(String(dbData.vector_count)) || 0,
      created_at: (dbData.created_at as string) || new Date().toISOString(),
      updated_at: (dbData.last_updated as string) || (dbData.created_at as string) || new Date().toISOString(),
      last_crawl: (dbData.last_crawl as string) || null,
      source_url: (dbData.source_url as string) || '',
      crawl_config: (dbData.crawl_config as Record<string, unknown>) || {
        type: 'single',
        embedding_model: 'gemini-768',
        max_depth: null,
        limit: null,
        include_patterns: [],
        exclude_patterns: []
      },
      urls: (dbData.urls as string[]) || ((dbData.source_url as string) ? [dbData.source_url as string] : []),
      recent_activity: (dbData.recent_activity as unknown[]) || [
        {
          timestamp: (dbData.created_at as string) || new Date().toISOString(),
          action: 'Datenbank erstellt',
          details: 'Datenbank wurde erfolgreich erstellt',
          status: 'success'
        }
      ],
      // Additional metadata
      metadata: {
        user_id: (dbData.user_id as string) || 'unknown',
        embedding_model: ((dbData.crawl_config as Record<string, unknown>)?.embedding_model as string) || 'gemini-768',
        total_tokens: parseInt(String(dbData.total_tokens)) || 0,
        estimated_cost: parseFloat(String(dbData.estimated_cost)) || 0,
        crawl_duration: (dbData.crawl_duration as string) || null,
        error_count: parseInt(String(dbData.error_count)) || 0,
        success_rate: parseFloat(String(dbData.success_rate)) || 100
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
