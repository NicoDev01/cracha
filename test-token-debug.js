// Test script to debug Cloudflare API token issues
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const apiKey = process.env.CLOUDFLARE_API_KEY;
const email = process.env.CLOUDFLARE_EMAIL;

console.log('🔍 Cloudflare API Token Debug\n');
console.log('📋 Configuration:');
console.log(`   Account ID: ${accountId}`);
console.log(`   Namespace ID: ${namespaceId}`);
console.log(`   API Token: ${apiToken ? apiToken.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`   API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`   Email: ${email || 'MISSING'}\n`);

async function testAPIToken() {
  console.log('🧪 Testing API Token...');
  
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS: Found ${data.result?.length || 0} KV namespaces`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ FAILED: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testGlobalAPIKey() {
  console.log('\n🧪 Testing Global API Key...');
  
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`, {
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS: Found ${data.result?.length || 0} KV namespaces`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ FAILED: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testKVAccess(useGlobalKey = false) {
  console.log(`\n🧪 Testing KV Access (${useGlobalKey ? 'Global Key' : 'API Token'})...`);
  
  const headers = { 'Content-Type': 'application/json' };
  if (useGlobalKey) {
    headers['X-Auth-Email'] = email;
    headers['X-Auth-Key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }
  
  const testKey = 'test-auth-' + Date.now();
  const testValue = { message: 'Hello from token test', timestamp: new Date().toISOString() };
  
  try {
    // Test write
    const writeResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${testKey}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(testValue)
      }
    );
    
    console.log(`   Write Status: ${writeResponse.status} ${writeResponse.statusText}`);
    
    if (!writeResponse.ok) {
      const errorText = await writeResponse.text();
      console.log(`   ❌ Write FAILED: ${errorText}`);
      return false;
    }
    
    // Test read
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for propagation
    
    const readResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${testKey}`,
      { headers }
    );
    
    console.log(`   Read Status: ${readResponse.status} ${readResponse.statusText}`);
    
    if (readResponse.ok) {
      const data = await readResponse.json();
      console.log(`   ✅ KV Access SUCCESS: ${data.message}`);
      
      // Clean up
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${testKey}`,
        { method: 'DELETE', headers }
      );
      
      return true;
    } else {
      const errorText = await readResponse.text();
      console.log(`   ❌ Read FAILED: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!accountId || !namespaceId) {
    console.log('❌ Missing required environment variables!');
    return;
  }
  
  const tokenWorks = await testAPIToken();
  const globalKeyWorks = await testGlobalAPIKey();
  
  if (tokenWorks) {
    await testKVAccess(false);
  }
  
  if (globalKeyWorks) {
    await testKVAccess(true);
  }
  
  console.log('\n📋 Summary:');
  console.log(`   API Token: ${tokenWorks ? '✅ WORKS' : '❌ FAILED'}`);
  console.log(`   Global Key: ${globalKeyWorks ? '✅ WORKS' : '❌ FAILED'}`);
  
  if (!tokenWorks && !globalKeyWorks) {
    console.log('\n💡 Recommendations:');
    console.log('   1. Create a new API Token with KV permissions');
    console.log('   2. Or use your Global API Key with email authentication');
    console.log('   3. Check that Account ID and Namespace ID are correct');
  }
}

main().catch(console.error);