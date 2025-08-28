import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Testing Cloudflare API Token...')
    
    // Log environment variables (safely)
    console.log('Environment variables:')
    console.log('  CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING')
    console.log('  CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? `SET (${process.env.CLOUDFLARE_API_TOKEN.substring(0, 8)}...)` : 'MISSING')
    console.log('  CLOUDFLARE_KV_NAMESPACE_ID:', process.env.CLOUDFLARE_KV_NAMESPACE_ID ? 'SET' : 'MISSING')
    console.log('  GLOBAL_API_KEY:', process.env.GLOBAL_API_KEY ? `SET (${process.env.GLOBAL_API_KEY.substring(0, 8)}...)` : 'MISSING')
    console.log('  CLOUDFLARE_API_KEY:', process.env.CLOUDFLARE_API_KEY ? `SET (${process.env.CLOUDFLARE_API_KEY.substring(0, 8)}...)` : 'MISSING')
    
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables',
        details: {
          accountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
          apiToken: !!process.env.CLOUDFLARE_API_TOKEN
        }
      })
    }

    // Test 1: Verify account access
    console.log('🧪 Test 1: Checking account access...')
    const accountUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`
    const accountResponse = await fetch(accountUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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
    const namespacesUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`
    const namespacesResponse = await fetch(namespacesUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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
    
    const namespacesData = await namespacesResponse.json()
    console.log('Available namespaces:', namespacesData.result?.length || 0)
    
    // Check if our target namespace exists
    interface CloudflareNamespace {
      id: string
      title?: string
    }
    const targetNamespace = namespacesData.result?.find((ns: CloudflareNamespace) => ns.id === process.env.CLOUDFLARE_KV_NAMESPACE_ID)
    console.log('Target namespace found:', !!targetNamespace)
    
    // Test 3: Test specific namespace access
    if (process.env.CLOUDFLARE_KV_NAMESPACE_ID) {
      console.log('🧪 Test 3: Testing specific namespace access...')
      const testKey = 'test_connection'
      const testUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${testKey}`
      
      const testResponse = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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