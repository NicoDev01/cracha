import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params

    console.log(`📊 Loading database details for: ${databaseId}`)

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

    return NextResponse.json({
      success: true,
      database: {
        id: dbData.id || databaseId,
        name: dbData.name || databaseId,
        description: dbData.description || `Database: ${dbData.name || databaseId}`,
        status: dbData.status || 'active',
        document_count: parseInt(dbData.document_count) || 0,
        chunk_count: parseInt(dbData.chunk_count) || 0,
        vector_count: parseInt(dbData.vector_count) || 0,
        created_at: dbData.created_at || new Date().toISOString(),
        updated_at: dbData.last_updated || dbData.created_at || new Date().toISOString(),
        last_crawl: dbData.last_crawl || null,
        source_url: dbData.source_url || '',
        crawl_config: dbData.crawl_config || {
          type: 'single',
          embedding_model: 'gemini-768'
        },
        urls: dbData.urls || (dbData.source_url ? [dbData.source_url] : []),
        recent_activity: dbData.recent_activity || [
          {
            timestamp: dbData.created_at || new Date().toISOString(),
            action: 'Datenbank erstellt',
            details: 'Datenbank wurde erfolgreich erstellt',
            status: 'success'
          }
        ]
      }
    })

  } catch (error) {
    console.error('❌ Database Details API Error:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params

    console.log(`🗑️ Deleting database: ${databaseId}`)

    // Check if Cloudflare environment variables are available
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_KV_NAMESPACE_ID) {
      throw new Error('Cloudflare API credentials not configured')
    }

    // 1. Get database data first to extract user_id
    let dbData = null
    try {
      const getDbResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${databaseId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (getDbResponse.ok) {
        dbData = await getDbResponse.json()
      }
    } catch (error) {
      console.warn('⚠️ Could not get database data for user index update:', error)
    }

    // 2. Delete from Cloudflare KV
    const kvDeleteResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${databaseId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        }
      }
    )

    if (!kvDeleteResponse.ok && kvDeleteResponse.status !== 404) {
      throw new Error(`Failed to delete from KV: ${kvDeleteResponse.status}`)
    }

    // 3. Delete vectors from Vectorize
    console.log(`🔄 Attempting to delete vectors for database: ${databaseId}`)

    try {
      // First, try to query existing vectors to see what we're working with (using v2 API)
      const queryResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/cracha-768/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vector: new Array(768).fill(0.1), // Small non-zero values
            topK: 100 // Get up to 100 vectors
          })
        }
      )

      if (queryResponse.ok) {
        const queryResult = await queryResponse.json()
        const allMatches = queryResult.result?.matches || []

        // Filter matches by tenant_id in metadata (if available)
        interface VectorMatch {
          id: string;
          metadata?: { tenant_id?: string };
        }
        
        const matches = allMatches.filter((match: VectorMatch) =>
          match.metadata?.tenant_id === databaseId ||
          match.id?.includes(databaseId) // Fallback: check if ID contains tenant_id
        )

        console.log(`🔍 Found ${matches.length} vectors for database ${databaseId} (out of ${allMatches.length} total)`)

        if (matches.length > 0) {
          // Extract vector IDs
          const vectorIds = matches.map((match: VectorMatch) => match.id)
          console.log(`🗑️ Deleting ${vectorIds.length} vectors:`, vectorIds.slice(0, 5)) // Log first 5 IDs

          // Delete vectors by IDs (using v2 API)
          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/cracha-768/delete-by-ids`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ids: vectorIds
              })
            }
          )

          if (deleteResponse.ok) {
            await deleteResponse.json()
            console.log(`✅ Successfully deleted ${vectorIds.length} vectors from Vectorize`)
          } else {
            const errorText = await deleteResponse.text()
            console.warn(`⚠️ Vector deletion failed (${deleteResponse.status}):`, errorText)
          }
        } else {
          console.log(`ℹ️ No vectors found for database ${databaseId} - nothing to delete`)
        }
      } else {
        const errorText = await queryResponse.text()
        console.warn(`⚠️ Vector query failed (${queryResponse.status}):`, errorText)

        // If query fails, the index might not exist or be accessible
        // This is not necessarily an error - the database might not have vectors
        console.log(`ℹ️ Skipping vector deletion - index may not exist or be accessible`)
      }
    } catch (vectorError) {
      console.warn('⚠️ Vectorize operation failed:', vectorError)
      console.log(`ℹ️ Continuing with database deletion despite vector deletion failure`)
    }





    // 4. Update user index to remove database
    if (dbData?.user_id) {
      try {
        const userIndexKey = `user_index:${dbData.user_id}`

        // Get current user index
        const userIndexResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${userIndexKey}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (userIndexResponse.ok) {
          const userIndex = await userIndexResponse.json()
          const updatedDatabases = (userIndex.databases || []).filter((id: string) => id !== databaseId)

          const updatedUserIndex = {
            ...userIndex,
            databases: updatedDatabases,
            last_updated: new Date().toISOString()
          }

          // Update user index
          await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${userIndexKey}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatedUserIndex)
            }
          )

          console.log(`✅ Removed database ${databaseId} from user index for user ${dbData.user_id}`)
        }
      } catch (userIndexError) {
        console.warn('⚠️ User index update failed:', userIndexError)
      }
    } else {
      console.log('📝 User index update skipped - no user_id found')
    }

    console.log(`✅ Database ${databaseId} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: `Database ${databaseId} deleted successfully`
    })

  } catch (error) {
    console.error('❌ Database Delete API Error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to delete database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}