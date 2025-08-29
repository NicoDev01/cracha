import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

// Cloudflare Workers environment interface
interface CloudflareEnv {
  DATABASE_REGISTRY: KVNamespace
}

/**
 * Create a fallback user for development when Supabase is not configured
 */
function createFallbackUser() {
  return {
    id: 'dev-user-' + Math.random().toString(36).substr(2, 9),
    email: 'dev@example.com'
  }
}

/**
 * Get authenticated user with fallback for development
 */
async function getAuthenticatedUserWithFallback() {
  try {
    const user = await getAuthenticatedUser()
    
    if (user) {
      return {
        id: user.id,
        email: user.email || ''
      }
    }
    
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('placeholder')
    
    // In development mode with no Supabase config, provide fallback
    if (process.env.NODE_ENV === 'development' && !isSupabaseConfigured) {
      console.warn('🔧 Development mode: Using fallback authentication')
      return createFallbackUser()
    }
    
    return null
  } catch (error) {
    console.error('Authentication error:', error)
    
    // In development mode, provide fallback even on errors
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔧 Development mode: Using fallback authentication due to error')
      return createFallbackUser()
    }
    
    return null
  }
}

// Simple in-memory cache to reduce KV operations
interface CacheEntry {
  data: unknown
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 30000 // 30 seconds cache

// Helper function to get cached data
function getCachedData(key: string): unknown | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  cache.delete(key)
  return null
}

// Helper function to set cached data
function setCachedData(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 🔐 SECURITY: Authenticate user first
  const user = await getAuthenticatedUserWithFallback()
  
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required. Please log in to access this resource.'
    }, { status: 401 })
  }
  
  const userId = user.id
  console.log(`📊 Loading databases for authenticated user: ${userId}`)

  try {
    // Get Cloudflare Workers environment context
    let env: CloudflareEnv | undefined
    let kv: KVNamespace | undefined
    
    try {
      const context = getRequestContext()
      env = context.env as CloudflareEnv
      kv = env?.DATABASE_REGISTRY
      console.log('🔧 Cloudflare Workers context available:', !!env)
      console.log('🔧 KV binding available:', !!kv)
      console.log('🔧 KV binding type:', typeof kv)
    } catch (error) {
      console.log('📝 Error getting Cloudflare context:', error)
    }

    // Check cache first to reduce KV operations
    const cacheKey = `databases:${userId}`
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log(`⚡ Returning cached data for user: ${userId}`)
      return NextResponse.json({
        ...cachedData,
        note: 'Cached data - refreshes every 30 seconds'
      })
    }

    // If we have KV binding, use it directly (Cloudflare Workers)
    if (kv) {
      console.log('🔧 Using KV binding for database access')
      
      try {
        // Get user's database index from KV
        const userIndexKey = `user_index:${userId}`
        console.log('🔧 Looking up user index:', userIndexKey)
        
        const userIndexData = await kv.get(userIndexKey, 'json') as { databases?: string[] } | null
        const databaseIds = userIndexData?.databases || []
        
        console.log(`📊 Found ${databaseIds.length} databases for user ${userId}:`, databaseIds)

        if (databaseIds.length === 0) {
          return NextResponse.json({
            success: true,
            databases: [],
            count: 0,
            user_id: userId,
            method: 'kv_binding',
            note: 'No databases found for user'
          })
        }

        // Load each database's details from KV
        const databases = []
        for (const dbId of databaseIds) {
          try {
            console.log(`🔧 Loading database details for: ${dbId}`)
            const dbData = await kv.get(dbId, 'json') as {
              id?: string;
              name?: string;
              description?: string;
              document_count?: string | number;
              created_at?: string;
              last_crawl?: string | null;
              source_url?: string;
              status?: string;
              chunks_count?: string | number;
              pages_count?: string | number;
            } | null
            
            if (dbData) {
              databases.push({
                id: dbData.id || dbId,
                name: dbData.name || dbId,
                description: dbData.description || `Crawled from ${dbData.source_url || 'unknown source'}`,
                document_count: parseInt(String(dbData.document_count)) || 0,
                chunks_count: parseInt(String(dbData.chunks_count)) || 0,
                pages_count: parseInt(String(dbData.pages_count)) || 0,
                created_at: dbData.created_at || new Date().toISOString(),
                updated_at: dbData.created_at || new Date().toISOString(),
                last_crawl: dbData.last_crawl || null,
                source_url: dbData.source_url || '',
                url: dbData.source_url || '',
                status: dbData.status || 'active'
              })
            } else {
              console.warn(`Database ${dbId} not found in KV`)
            }
          } catch (error) {
            console.warn(`Error loading database ${dbId}:`, error)
          }
        }

        // Sort by creation date (newest first)
        databases.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })

        console.log(`📊 Returning ${databases.length} databases for user ${userId}`)

        const responseData = {
          success: true,
          databases,
          count: databases.length,
          user_id: userId,
          method: 'kv_binding'
        }

        // Cache the successful response
        setCachedData(cacheKey, responseData)

        return NextResponse.json(responseData)
        
      } catch (kvError) {
        console.error('❌ KV operation failed:', kvError)
        return NextResponse.json({
          success: false,
          error: 'KV operation failed',
          details: kvError instanceof Error ? kvError.message : 'Unknown KV error'
        }, { status: 500 })
      }
    }

    // Fallback: If no KV binding available, return empty list
    console.log('⚠️ No KV binding available - returning empty database list')
    return NextResponse.json({
      success: true,
      databases: [],
      count: 0,
      user_id: userId,
      method: 'fallback',
      note: 'No KV binding available - check wrangler.toml configuration'
    })

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
    // Inline authentication logic
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
    if (!(body.name as string) || !(body.url as string)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, url' },
        { status: 400 }
      )
    }

    // Get Cloudflare Workers environment context
    let env: CloudflareEnv | undefined
    let kv: KVNamespace | undefined
    
    try {
      const context = getRequestContext()
      env = context.env as CloudflareEnv
      kv = env?.DATABASE_REGISTRY
    } catch (error) {
      console.log('📝 Running in local development mode (no Cloudflare context available)')
    }

    // Create new database entry
    const dbId = (body.name as string).toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    const newDatabase = {
      id: dbId,
      name: body.name as string,
      description: (body.description as string) || `Database for ${body.url as string}`,
      source_url: body.url as string,
      url: body.url as string,
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
      
      // Clear cache for this user
      cache.delete(`databases:${userId}`)
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