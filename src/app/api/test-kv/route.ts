import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

interface CloudflareEnv {
  DATABASE_REGISTRY: KVNamespace
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 Testing KV binding access...')
    
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
      return NextResponse.json({
        success: false,
        error: 'No Cloudflare context available',
        mode: 'local_development'
      })
    }

    if (!kv) {
      return NextResponse.json({
        success: false,
        error: 'KV binding not available',
        env_available: !!env,
        context_type: typeof env
      })
    }

    // Test KV operations
    const testKey = 'test_key_' + Date.now()
    const testValue = { message: 'Hello KV!', timestamp: new Date().toISOString() }
    
    console.log('🔧 Testing KV put operation...')
    await kv.put(testKey, JSON.stringify(testValue))
    
    console.log('🔧 Testing KV get operation...')
    const retrieved = await kv.get(testKey, 'json')
    
    console.log('🔧 Testing KV delete operation...')
    await kv.delete(testKey)
    
    return NextResponse.json({
      success: true,
      message: 'KV binding is working!',
      test_data: retrieved,
      kv_available: true
    })

  } catch (error) {
    console.error('❌ KV Test Error:', error)
    return NextResponse.json({
      success: false,
      error: 'KV test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}