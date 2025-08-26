import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing user_id parameter'
      }, { status: 400 })
    }

    console.log(`📊 Loading databases for user: ${userId}`)

    // Check if required environment variables are set
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_KV_NAMESPACE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      console.warn('⚠️ Cloudflare KV environment variables not set, returning mock data')
      return NextResponse.json({
        success: true,
        databases: [
          {
            id: 'lotrichtung',
            name: 'Lotrichtung',
            description: 'Lotrichtung database',
            document_count: 42,
            created_at: new Date().toISOString(),
            last_crawl: new Date().toISOString(),
            source_url: 'https://example.com',
            status: 'active'
          },
          {
            id: 'geo',
            name: 'Geo',
            description: 'Geographic database',
            document_count: 128,
            created_at: new Date().toISOString(),
            last_crawl: new Date().toISOString(),
            source_url: 'https://example.com',
            status: 'active'
          },
          {
            id: 'test',
            name: 'Test',
            description: 'Test database',
            document_count: 15,
            created_at: new Date().toISOString(),
            last_crawl: new Date().toISOString(),
            source_url: 'https://example.com',
            status: 'active'
          },
          {
            id: 'normal',
            name: 'Normal',
            description: 'Normal database',
            document_count: 67,
            created_at: new Date().toISOString(),
            last_crawl: new Date().toISOString(),
            source_url: 'https://example.com',
            status: 'active'
          },
          {
            id: 'Weltraum',
            name: 'Weltraum',
            description: 'Space database',
            document_count: 234,
            created_at: new Date().toISOString(),
            last_crawl: new Date().toISOString(),
            source_url: 'https://example.com',
            status: 'active'
          }
        ],
        count: 5
      })
    }

    // Get user's database index from Cloudflare KV
    const userIndexKey = `user_index:${userId}`
    const kvResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${userIndexKey}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!kvResponse.ok) {
      if (kvResponse.status === 404) {
        // User has no databases yet
        console.log(`📊 No databases found for user ${userId}`)
        return NextResponse.json({
          success: true,
          databases: [],
          count: 0
        })
      }
      throw new Error(`KV API error: ${kvResponse.status} ${kvResponse.statusText}`)
    }

    const userIndex = await kvResponse.json()
    const databaseIds = Array.isArray(userIndex.databases) ? userIndex.databases : []

    console.log(`📊 Found ${databaseIds.length} databases for user ${userId}:`, databaseIds)

    // Load each database's details
    const databases = []
    for (const dbId of databaseIds) {
      try {
        const dbResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${dbId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        )

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
        } else {
          console.warn(`Failed to load database ${dbId}: ${dbResponse.status} ${dbResponse.statusText}`)
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

    return NextResponse.json({
      success: true,
      databases,
      count: databases.length
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