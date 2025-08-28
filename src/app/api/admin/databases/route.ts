import { NextResponse } from 'next/server'
import { authenticated, getUserId, type AuthenticatedRequest } from '@/lib/auth/middleware'

// Simple in-memory cache to reduce KV API calls
interface CacheEntry {
  data: unknown
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 30000 // 30 seconds cache

// Helper function to test API token validity
async function testCloudflareToken(): Promise<{ valid: boolean; error?: string; method?: string }> {
  try {
    const testUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`
    
    // Determine authentication method
    const useGlobalKey = !process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN === process.env.CLOUDFLARE_API_KEY
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    let authMethod = 'unknown'
    if (useGlobalKey && process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_API_KEY) {
      authMethod = 'global_key'
      authHeaders['X-Auth-Email'] = process.env.CLOUDFLARE_EMAIL
      authHeaders['X-Auth-Key'] = process.env.CLOUDFLARE_API_KEY
    } else if (process.env.CLOUDFLARE_API_TOKEN) {
      authMethod = 'api_token'
      authHeaders['Authorization'] = `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
    } else {
      return { valid: false, error: 'No authentication method configured', method: 'none' }
    }
    
    console.log(`🔐 Testing authentication method: ${authMethod}`)
    
    const response = await fetch(testUrl, { headers: authHeaders })
    
    console.log('🔐 Token validation response:', response.status, response.statusText)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Token is valid, found namespaces:', data.result?.length || 0)
      return { valid: true, method: authMethod }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.log('❌ Token validation failed:', errorText)
      return { valid: false, error: `${response.status}: ${response.statusText}`, method: authMethod }
    }
  } catch (error) {
    console.log('❌ Token validation error:', error)
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error', method: 'error' }
  }
}

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

// Helper function to handle KV API calls with retry logic
async function makeKVRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // Don't retry auth errors - they won't get better with time
      if (response.status === 401) {
        console.warn(`🔐 Authentication error (401) - not retrying`)
        return response
      }
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        if (attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5 seconds
          console.warn(`⏳ Rate limited, waiting ${waitTime}ms before retry ${attempt}/${retries}`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        // If final attempt, fall through to handle the error
      }
      
      return response
    } catch (error) {
      if (attempt === retries) {
        throw error
      }
      console.warn(`⚠️ KV request failed (attempt ${attempt}/${retries}):`, error)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  throw new Error('Max retries exceeded')
}

async function handleGetDatabases(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    // 🔐 SECURITY: Get authenticated user ID from middleware
    const userId = getUserId(request)
    console.log(`📊 Loading databases for authenticated user: ${userId}`)

    // Check cache first to reduce KV API calls
    const cacheKey = `databases:${userId}`
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log(`⚡ Returning cached data for user: ${userId}`)
      return NextResponse.json({
        ...cachedData,
        note: 'Cached data - refreshes every 30 seconds'
      })
    }

    // Check if required environment variables are set
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_KV_NAMESPACE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      const isProduction = process.env.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production'
      const envType = isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
      
      console.warn(`⚠️ [${envType}] Cloudflare KV environment variables not set, returning mock data`)
      console.log(`Debug - Environment check (${envType}):`);
      console.log('  CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING')
      console.log('  CLOUDFLARE_KV_NAMESPACE_ID:', process.env.CLOUDFLARE_KV_NAMESPACE_ID ? 'SET' : 'MISSING')
      console.log('  CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? `SET (${process.env.CLOUDFLARE_API_TOKEN.substring(0, 8)}...)` : 'MISSING')
      
      if (isProduction) {
        console.error('🚨 PRODUCTION DEPLOYMENT ISSUE: Environment variables not configured!')
        console.error('🔧 SOLUTION: Set secrets via Cloudflare Dashboard or run: wrangler secret put CLOUDFLARE_API_TOKEN')
      }
      
      return NextResponse.json({
        success: true,
        databases: [
          {
            id: 'config-missing',
            name: `${envType} - Configuration Missing`,
            description: isProduction 
              ? 'Production environment variables not configured. Please set secrets in Cloudflare Dashboard.' 
              : 'Development environment variables not configured in wrangler.toml.',
            document_count: 0,
            created_at: new Date().toISOString(),
            last_crawl: null,
            source_url: '',
            status: isProduction ? 'error' : 'development'
          }
        ],
        count: 1,
        environment: envType,
        note: isProduction 
          ? 'PRODUCTION: Set environment variables in Cloudflare Dashboard' 
          : 'DEVELOPMENT: Check wrangler.toml configuration'
      })
    }

    // Get user's database index from Cloudflare KV with retry logic
    const userIndexKey = `user_index:${userId}`
    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${userIndexKey}`
    
    console.log('🔧 KV API Debug Info:')
    console.log('  Account ID:', process.env.CLOUDFLARE_ACCOUNT_ID)
    console.log('  Namespace ID:', process.env.CLOUDFLARE_KV_NAMESPACE_ID)
    console.log('  API Token (first 8 chars):', process.env.CLOUDFLARE_API_TOKEN?.substring(0, 8))
    console.log('  Full URL:', kvUrl)
    console.log('  User Index Key:', userIndexKey)
    
    // Test token validity first
    const tokenTest = await testCloudflareToken()
    if (!tokenTest.valid) {
      console.error('🚫 Token validation failed:', tokenTest.error)
      console.log('🛠️ Falling back to mock data due to invalid token')
      return NextResponse.json({
        success: true,
        databases: [
          {
            id: 'token-invalid-fallback',
            name: 'Development Mode (Token Issue)',
            description: `API token validation failed: ${tokenTest.error}`,
            document_count: 0,
            created_at: new Date().toISOString(),
            last_crawl: null,
            source_url: '',
            status: 'development'
          }
        ],
        count: 1,
        user_id: userId,
        note: 'Token validation failed - using development mode'
      })
    }
    
    // Determine authentication method
    const useGlobalKey = !process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN === process.env.CLOUDFLARE_API_KEY
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (useGlobalKey && process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_API_KEY) {
      console.log('🔑 Using Global API Key authentication')
      authHeaders['X-Auth-Email'] = process.env.CLOUDFLARE_EMAIL
      authHeaders['X-Auth-Key'] = process.env.CLOUDFLARE_API_KEY
    } else if (process.env.CLOUDFLARE_API_TOKEN) {
      console.log('🔐 Using API Token authentication')
      authHeaders['Authorization'] = `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
    } else {
      console.error('❌ No valid authentication method found')
      return NextResponse.json({
        success: true,
        databases: [],
        count: 0,
        user_id: userId,
        note: 'No authentication configured - using empty database list'
      })
    }
    
    let kvResponse: Response
    try {
      kvResponse = await makeKVRequest(kvUrl, {
        headers: authHeaders
      })
      
      console.log('📡 KV API Response Status:', kvResponse.status, kvResponse.statusText)
      
      // Log response headers for debugging
      const responseHeaders = Array.from(kvResponse.headers.entries())
      if (responseHeaders.length > 0) {
        console.log('📋 Response Headers:', Object.fromEntries(responseHeaders))
      }
      
    } catch (error) {
      console.error('❌ KV API request failed after retries:', error)
      // Return mock data if KV is unavailable
      return NextResponse.json({
        success: true,
        databases: [
          {
            id: 'fallback-db',
            name: 'Fallback Database',
            description: 'Database returned due to KV API unavailability',
            document_count: 0,
            created_at: new Date().toISOString(),
            last_crawl: null,
            source_url: '',
            status: 'active'
          }
        ],
        count: 1,
        user_id: userId,
        note: 'Fallback data - KV API unavailable'
      })
    }

    if (!kvResponse.ok) {
      if (kvResponse.status === 404) {
        // User has no databases yet
        console.log(`📊 No databases found for user ${userId}`)
        return NextResponse.json({
          success: true,
          databases: [],
          count: 0,
          user_id: userId
        })
      }
      
      if (kvResponse.status === 429) {
        console.error('🚫 Rate limit exceeded for KV API - returning fallback data')
        return NextResponse.json({
          success: true,
          databases: [
            {
              id: 'rate-limited-fallback',
              name: 'Rate Limited - Try Again Later',
              description: 'KV API rate limit exceeded. Please wait a moment and refresh.',
              document_count: 0,
              created_at: new Date().toISOString(),
              last_crawl: null,
              source_url: '',
              status: 'warning'
            }
          ],
          count: 1,
          user_id: userId,
          note: 'Rate limit exceeded - please try again in a few moments'
        })
      }
      
      if (kvResponse.status === 401) {
        console.error('🔐 Authentication failed for Cloudflare KV API - check API token')
        console.error('Token exists:', !!process.env.CLOUDFLARE_API_TOKEN)
        console.error('Account ID exists:', !!process.env.CLOUDFLARE_ACCOUNT_ID)
        console.error('Namespace ID exists:', !!process.env.CLOUDFLARE_KV_NAMESPACE_ID)
        
        // Return fallback data instead of throwing error
        return NextResponse.json({
          success: true,
          databases: [
            {
              id: 'auth-fallback',
              name: 'Development Mode',
              description: 'Using fallback data due to authentication issues with Cloudflare KV',
              document_count: 0,
              created_at: new Date().toISOString(),
              last_crawl: null,
              source_url: '',
              status: 'development'
            }
          ],
          count: 1,
          user_id: userId,
          note: 'Authentication issue with KV API - using development mode'
        })
      }
      
      console.error(`🚫 KV API error: ${kvResponse.status} ${kvResponse.statusText}`)
      
      // For any other error, return fallback data instead of throwing
      return NextResponse.json({
        success: true,
        databases: [
          {
            id: 'error-fallback',
            name: 'Error Fallback',
            description: `KV API returned ${kvResponse.status}: ${kvResponse.statusText}`,
            document_count: 0,
            created_at: new Date().toISOString(),
            last_crawl: null,
            source_url: '',
            status: 'error'
          }
        ],
        count: 1,
        user_id: userId,
        note: `KV API error: ${kvResponse.status} - using fallback data`
      })
    }

    const userIndex = await kvResponse.json()
    const databaseIds = Array.isArray(userIndex.databases) ? userIndex.databases : []

    console.log(`📊 Found ${databaseIds.length} databases for user ${userId}:`, databaseIds)

    // Load each database's details with retry logic
    const databases = []
    for (const dbId of databaseIds) {
      try {
        const dbUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${dbId}`
        
        const dbResponse = await makeKVRequest(dbUrl, {
          headers: authHeaders
        })

        if (dbResponse.ok) {
          const dbData = await dbResponse.json()
          databases.push({
            id: dbData.id || dbId,
            name: dbData.name || dbId,
            description: dbData.description || `Crawled from ${dbData.source_url || 'unknown source'}`,
            document_count: parseInt(dbData.document_count) || 0,
            created_at: dbData.created_at || new Date().toISOString(),
            last_crawl: dbData.last_crawl || null,
            source_url: dbData.source_url || '',
            status: dbData.status || 'active'
          })
        } else if (dbResponse.status === 401) {
          console.warn(`Authentication failed for database ${dbId} - skipping`)
          // Skip this database instead of adding error entry
        } else {
          console.warn(`Failed to load database ${dbId}: ${dbResponse.status} ${dbResponse.statusText}`)
          // Add a placeholder entry for other types of failures
          databases.push({
            id: dbId,
            name: `Database ${dbId} (Load Error)`,
            description: `Failed to load: ${dbResponse.status} ${dbResponse.statusText}`,
            document_count: 0,
            created_at: new Date().toISOString(),
            last_crawl: null,
            source_url: '',
            status: 'error'
          })
        }
      } catch (error) {
        console.warn(`Error loading database ${dbId}:`, error)
        // Add a placeholder entry for failed database loads
        databases.push({
          id: dbId,
          name: `Database ${dbId} (Load Error)`,
          description: 'Failed to load database details due to API error',
          document_count: 0,
          created_at: new Date().toISOString(),
          last_crawl: null,
          source_url: '',
          status: 'error'
        })
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
      user_id: userId
    }

    // Cache the successful response
    setCachedData(cacheKey, responseData)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ Database API Error:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('401')) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed with Cloudflare KV API',
        details: 'Please check your CLOUDFLARE_API_TOKEN and ensure it has the correct permissions.',
        fallback: true
      }, { status: 401 })
    }
    
    // Check if it's a rate limiting error
    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        details: 'Cloudflare KV API rate limit reached. This is temporary.',
        retryAfter: 30
      }, { status: 429 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Export authenticated handler
export const GET = authenticated(handleGetDatabases)