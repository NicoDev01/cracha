import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

// CRITICAL: Enable Edge Runtime for Cloudflare Workers compatibility
// Temporarily disabled for OpenNext build compatibility
// TODO: Re-enable after OpenNext fixes edge runtime bundling
// export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// NOTE: Even without explicit edge runtime, this will run on Cloudflare Workers
// because OpenNext automatically optimizes for the target platform

interface CloudflareEnv {
  DATABASE_REGISTRY: KVNamespace
}

interface DatabaseItem {
  id: string
  name: string
  description: string
  document_count: number
  chunks_count: number
  pages_count: number
  created_at: string
  updated_at: string
  last_crawl: string | null
  source_url: string
  url: string
  status: string
}

interface DatabaseResponse {
  success: boolean
  databases: DatabaseItem[]
  count: number
  user_id: string
  method: string
  note?: string
}

async function getAuthenticatedUserWithFallback() {
  try {
    const user = await getAuthenticatedUser()
    if (user) {
      return { id: user.id, email: user.email || '' }
    }
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      return {
        id: 'dev-user-' + Math.random().toString(36).substring(2, 11),
        email: 'dev@example.com'
      }
    }
    
    return null
  } catch (error) {
    console.error('Authentication error:', error)
    if (process.env.NODE_ENV === 'development') {
      return {
        id: 'dev-user-fallback',
        email: 'dev@example.com'
      }
    }
    return null
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const user = await getAuthenticatedUserWithFallback()
  
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required. Please log in to access this resource.'
    }, { status: 401 })
  }
  
  const userId = user.id
  console.log(`📊 Loading databases for user: ${userId}`)

  try {
    // Get Cloudflare Workers environment context
    let kv: KVNamespace | undefined
    
    try {
      const context = getRequestContext()
      const env = context.env as CloudflareEnv
      kv = env?.DATABASE_REGISTRY
    } catch (_error) {
      console.log('📝 Local development mode: No KV binding available')
    }

    // If we have KV binding, use it directly
    if (kv) {
      try {
        const userIndexKey = `user_index:${userId}`
        const userIndexData = await kv.get(userIndexKey, 'json') as { databases?: string[] } | null
        const databaseIds = userIndexData?.databases || []

        if (databaseIds.length === 0) {
          const response: DatabaseResponse = {
            success: true,
            databases: [],
            count: 0,
            user_id: userId,
            method: 'kv_binding',
            note: 'No databases found for user'
          }
          return NextResponse.json(response)
        }

        const databases: DatabaseItem[] = []
        for (const dbId of databaseIds) {
          try {
            const dbData = await kv.get(dbId, 'json') as Record<string, unknown> | null
            if (dbData) {
              databases.push({
                id: String(dbData.id || dbId),
                name: String(dbData.name || dbId),
                description: String(dbData.description || `Crawled from ${dbData.source_url || 'unknown source'}`),
                document_count: parseInt(String(dbData.document_count)) || 0,
                chunks_count: parseInt(String(dbData.chunks_count)) || 0,
                pages_count: parseInt(String(dbData.pages_count)) || 0,
                created_at: String(dbData.created_at || new Date().toISOString()),
                updated_at: String(dbData.created_at || new Date().toISOString()),
                last_crawl: dbData.last_crawl ? String(dbData.last_crawl) : null,
                source_url: String(dbData.source_url || ''),
                url: String(dbData.source_url || ''),
                status: String(dbData.status || 'active')
              })
            }
          } catch (error) {
            console.warn(`Error loading database ${dbId}:`, error)
          }
        }

        databases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        const response: DatabaseResponse = {
          success: true,
          databases,
          count: databases.length,
          user_id: userId,
          method: 'kv_binding'
        }

        return NextResponse.json(response)
        
      } catch (kvError) {
        console.error('❌ KV operation failed:', kvError)
        return NextResponse.json({
          success: false,
          error: 'KV operation failed',
          details: kvError instanceof Error ? kvError.message : 'Unknown KV error'
        }, { status: 500 })
      }
    }

    // HTTP API Fallback for local development
    console.log('🔧 Using HTTP API fallback for local development')
    
    try {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
      const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID || process.env.DATABASE_REGISTRY_KV_ID
      const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.VECTORIZE_API_TOKEN
      const apiKey = process.env.GLOBAL_API_KEY || process.env.CLOUDFLARE_API_KEY
      const email = process.env.CLOUDFLARE_EMAIL
      
      console.log('🔧 HTTP API Fallback - Environment check:')
      console.log('  Account ID:', accountId ? 'SET' : 'MISSING')
      console.log('  Namespace ID:', namespaceId ? 'SET' : 'MISSING')
      console.log('  API Token:', apiToken ? `SET (${apiToken.substring(0, 8)}...)` : 'MISSING')
      
      if (!accountId || !namespaceId || (!apiToken && (!apiKey || !email))) {
        console.log('⚠️ Missing environment variables for HTTP API fallback')
        const response: DatabaseResponse = {
          success: true,
          databases: [],
          count: 0,
          user_id: userId,
          method: 'fallback_no_env',
          note: 'No KV binding and missing environment variables'
        }
        return NextResponse.json(response)
      }
      
      // Get user's database index from KV via HTTP API
      const userIndexKey = `user_index:${userId}`
      const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${userIndexKey}`
      
      console.log('🔧 Using HTTP API fallback for KV access')
      console.log('🔧 User Index Key:', userIndexKey)
      
      // Determine authentication method
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (email && apiKey) {
        console.log('🔑 HTTP API Fallback: Using Global API Key authentication')
        authHeaders['X-Auth-Email'] = email
        authHeaders['X-Auth-Key'] = apiKey
      } else if (apiToken) {
        console.log('🔐 HTTP API Fallback: Using API Token authentication')
        authHeaders['Authorization'] = `Bearer ${apiToken}`
      } else {
        console.error('❌ No valid authentication method found for HTTP API fallback')
        const response: DatabaseResponse = {
          success: true,
          databases: [],
          count: 0,
          user_id: userId,
          method: 'fallback_no_auth',
          note: 'No valid authentication method'
        }
        return NextResponse.json(response)
      }
      
      const kvResponse = await fetch(kvUrl, { headers: authHeaders })
      
      if (!kvResponse.ok) {
        if (kvResponse.status === 404) {
          // User has no databases yet
          console.log(`📊 No databases found for user ${userId} (HTTP API)`)
          const response: DatabaseResponse = {
            success: true,
            databases: [],
            count: 0,
            user_id: userId,
            method: 'http_api_fallback'
          }
          return NextResponse.json(response)
        }
        
        console.error(`🚫 HTTP API error: ${kvResponse.status} ${kvResponse.statusText}`)
        const response: DatabaseResponse = {
          success: true,
          databases: [],
          count: 0,
          user_id: userId,
          method: 'http_api_fallback',
          note: `HTTP API error: ${kvResponse.status}`
        }
        return NextResponse.json(response)
      }

      const userIndex = await kvResponse.json() as { databases?: string[] }
      const databaseIds = Array.isArray(userIndex.databases) ? userIndex.databases : []
      
      console.log(`📊 Found ${databaseIds.length} databases for user ${userId} (HTTP API):`, databaseIds)

      if (databaseIds.length === 0) {
        const response: DatabaseResponse = {
          success: true,
          databases: [],
          count: 0,
          user_id: userId,
          method: 'http_api_fallback',
          note: 'No databases found for user'
        }
        return NextResponse.json(response)
      }

      // Load each database's details via HTTP API
      const databases: DatabaseItem[] = []
      for (const dbId of databaseIds) {
        try {
          const dbUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${dbId}`
          const dbResponse = await fetch(dbUrl, { headers: authHeaders })

          if (dbResponse.ok) {
            const dbData = await dbResponse.json() as Record<string, unknown>
            
            databases.push({
              id: String(dbData.id || dbId),
              name: String(dbData.name || dbId),
              description: String(dbData.description || `Crawled from ${dbData.source_url || 'unknown source'}`),
              document_count: parseInt(String(dbData.document_count)) || 0,
              chunks_count: parseInt(String(dbData.chunks_count)) || 0,
              pages_count: parseInt(String(dbData.pages_count)) || 0,
              created_at: String(dbData.created_at || new Date().toISOString()),
              updated_at: String(dbData.created_at || new Date().toISOString()),
              last_crawl: dbData.last_crawl ? String(dbData.last_crawl) : null,
              source_url: String(dbData.source_url || ''),
              url: String(dbData.source_url || ''),
              status: String(dbData.status || 'active')
            })
          } else {
            console.warn(`Failed to load database ${dbId} via HTTP API: ${dbResponse.status}`)
          }
        } catch (error) {
          console.warn(`Error loading database ${dbId} via HTTP API:`, error)
        }
      }

      // Sort by creation date (newest first)
      databases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log(`📊 Returning ${databases.length} databases for user ${userId} (HTTP API fallback)`)

      const response: DatabaseResponse = {
        success: true,
        databases,
        count: databases.length,
        user_id: userId,
        method: 'http_api_fallback'
      }

      return NextResponse.json(response)
      
    } catch (httpError) {
      console.error('❌ HTTP API fallback failed:', httpError)
      const response: DatabaseResponse = {
        success: true,
        databases: [],
        count: 0,
        user_id: userId,
        method: 'fallback_failed',
        note: 'Both KV binding and HTTP API fallback failed'
      }
      return NextResponse.json(response)
    }

  } catch (error) {
    console.error('❌ Database API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUserWithFallback()
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please log in to access this resource.'
      }, { status: 401 })
    }

    const userId = user.id
    const body = await request.json() as Record<string, unknown>
    
    // Validate required fields
    if (!body.name || !body.url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, url' },
        { status: 400 }
      )
    }

    // Get Cloudflare Workers environment context
    let kv: KVNamespace | undefined
    
    try {
      const context = getRequestContext()
      const env = context.env as CloudflareEnv
      kv = env?.DATABASE_REGISTRY
    } catch (_error) {
      console.log('📝 Running in local development mode (no Cloudflare context available)')
    }

    // Create new database entry
    const dbId = String(body.name).toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    const newDatabase = {
      id: dbId,
      name: String(body.name),
      description: String(body.description || `Database for ${body.url}`),
      source_url: String(body.url),
      url: String(body.url),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      chunks_count: 0,
      pages_count: 0,
      status: 'pending'
    }

    if (kv) {
      console.log(`🔧 Creating database ${dbId} for user ${userId}`)
      
      // Store database details in KV
      await kv.put(dbId, JSON.stringify(newDatabase))
      
      // Update user's database index
      const userIndexKey = `user_index:${userId}`
      const userIndex = await kv.get(userIndexKey, 'json') as { databases?: string[] } | null
      const databases = userIndex?.databases || []
      
      if (!databases.includes(dbId)) {
        databases.push(dbId)
        await kv.put(userIndexKey, JSON.stringify({ databases }))
      }
      
      console.log(`✅ Database ${dbId} created successfully for user ${userId}`)
    } else {
      console.log('⚠️ No KV binding available - database creation skipped')
    }

    return NextResponse.json({
      success: true,
      database: newDatabase
    })

  } catch (error) {
    console.error('Database creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}