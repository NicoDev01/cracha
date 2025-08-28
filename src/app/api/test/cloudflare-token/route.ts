import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    console.log('🔍 Testing Cloudflare API Token...')
    
    // Get Cloudflare Workers environment context
    let env: Record<string, unknown> = {}
    try {
      const context = getRequestContext()
      env = (context.env as Record<string, unknown>) || {}
    } catch (error) {
      console.log('🖥️ Running in local development mode')
    }
    
    // Log environment variables (safely)
    const accountId = getEnvVariable('CLOUDFLARE_ACCOUNT_ID', env)
    const apiToken = getEnvVariable('CLOUDFLARE_API_TOKEN', env)
    const namespaceId = getEnvVariable('CLOUDFLARE_KV_NAMESPACE_ID', env)
    const globalApiKey = getEnvVariable('GLOBAL_API_KEY', env)
    const cloudflareApiKey = getEnvVariable('CLOUDFLARE_API_KEY', env)
    
    console.log('Environment variables:')
    console.log('  CLOUDFLARE_ACCOUNT_ID:', accountId ? 'SET' : 'MISSING')
    console.log('  CLOUDFLARE_API_TOKEN:', apiToken ? `SET (${apiToken.substring(0, 8)}...)` : 'MISSING')
    console.log('  CLOUDFLARE_KV_NAMESPACE_ID:', namespaceId ? 'SET' : 'MISSING')
    console.log('  GLOBAL_API_KEY:', globalApiKey ? `SET (${globalApiKey.substring(0, 8)}...)` : 'MISSING')
    console.log('  CLOUDFLARE_API_KEY:', cloudflareApiKey ? `SET (${cloudflareApiKey.substring(0, 8)}...)` : 'MISSING')
    
    if (!accountId || !apiToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables',
        details: {
          accountId: !!accountId,
          apiToken: !!apiToken
        }
      })
    }

    // Test 1: Verify account access
    console.log('🧪 Test 1: Checking account access...')
    const accountUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}`
    const accountResponse = await fetch(accountUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Account API response:', accountResponse.status, accountResponse.statusText)
    
    if (!accountResponse.ok) {
      const errorText = await accountResponse.text()
      console.log('Account API error:', errorText)
      return NextResponse.json({
        success: false,
        test: 'account_access',
        error: `Account access failed: ${accountResponse.status} ${accountResponse.statusText}`,
        details: errorText
      })
    }
    
    // Test 2: List KV namespaces
    console.log('🧪 Test 2: Listing KV namespaces...')
    const namespacesUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`
    const namespacesResponse = await fetch(namespacesUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Namespaces API response:', namespacesResponse.status, namespacesResponse.statusText)
    
    if (!namespacesResponse.ok) {
      const errorText = await namespacesResponse.text()
      console.log('Namespaces API error:', errorText)
      return NextResponse.json({
        success: false,
        test: 'namespaces_list',
        error: `Namespaces access failed: ${namespacesResponse.status} ${namespacesResponse.statusText}`,
        details: errorText
      })
    }
    
    interface CloudflareNamespace {
      id: string
      title?: string
    }
    
    interface CloudflareNamespacesResponse {
      result?: CloudflareNamespace[]
    }
    
    const namespacesData = await namespacesResponse.json() as CloudflareNamespacesResponse
    console.log('Available namespaces:', namespacesData.result?.length || 0)
    
    // Check if our target namespace exists
    const targetNamespace = namespacesData.result?.find((ns: CloudflareNamespace) => ns.id === namespaceId)
    console.log('Target namespace found:', !!targetNamespace)
    
    // Test 3: Test specific namespace access
    if (namespaceId) {
      console.log('🧪 Test 3: Testing specific namespace access...')
      const testKey = 'test_connection'
      const testUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${testKey}`
      
      const testResponse = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Test key access response:', testResponse.status, testResponse.statusText)
      
      return NextResponse.json({
        success: true,
        tests: {
          account_access: true,
          namespaces_list: true,
          namespace_access: testResponse.status === 404 || testResponse.status === 200, // 404 is OK (key doesn't exist)
          namespace_exists: !!targetNamespace
        },
        details: {
          total_namespaces: namespacesData.result?.length || 0,
          target_namespace_found: !!targetNamespace,
          test_key_response: testResponse.status
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        account_access: true,
        namespaces_list: true
      },
      details: {
        total_namespaces: namespacesData.result?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Token test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Token test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}