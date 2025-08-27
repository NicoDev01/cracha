const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Testing Cloudflare API Configuration...\n');

// Load .env.local
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]*?)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const apiKey = process.env.CLOUDFLARE_API_KEY;
const email = process.env.CLOUDFLARE_EMAIL;
const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

console.log('Environment Variables:');
console.log(`  CLOUDFLARE_ACCOUNT_ID: ${accountId ? accountId.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`  CLOUDFLARE_API_TOKEN: ${apiToken ? apiToken.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`  CLOUDFLARE_API_KEY: ${apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`  CLOUDFLARE_EMAIL: ${email || 'MISSING'}`);
console.log(`  CLOUDFLARE_KV_NAMESPACE_ID: ${namespaceId || 'MISSING'}`);
console.log();

if (!accountId) {
  console.log('❌ CLOUDFLARE_ACCOUNT_ID is missing');
  process.exit(1);
}

async function testAuth() {
  const fetch = (await import('node-fetch')).default;
  
  // Test API Token first
  if (apiToken) {
    console.log('🧪 Testing API Token...');
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Token: SUCCESS');
        console.log(`   Account: ${data.result?.name || 'Unknown'}`);
        return 'token';
      } else {
        console.log(`❌ API Token: FAILED (${response.status})`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ API Token: ERROR - ${error.message}`);
    }
  }
  
  // Test Global API Key
  if (apiKey && email) {
    console.log('🧪 Testing Global API Key...');
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
        headers: {
          'X-Auth-Email': email,
          'X-Auth-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Global API Key: SUCCESS');
        console.log(`   Account: ${data.result?.name || 'Unknown'}`);
        return 'global';
      } else {
        console.log(`❌ Global API Key: FAILED (${response.status})`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ Global API Key: ERROR - ${error.message}`);
    }
  }
  
  return null;
}

async function testKVAccess(authMethod) {
  const fetch = (await import('node-fetch')).default;
  
  console.log('\n🧪 Testing KV Access...');
  
  const headers = { 'Content-Type': 'application/json' };
  if (authMethod === 'token') {
    headers['Authorization'] = `Bearer ${apiToken}`;
  } else if (authMethod === 'global') {
    headers['X-Auth-Email'] = email;
    headers['X-Auth-Key'] = apiKey;
  }
  
  try {
    // List namespaces
    const namespacesResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`, {
      headers
    });
    
    if (namespacesResponse.ok) {
      const namespacesData = await namespacesResponse.json();
      console.log(`✅ KV Namespaces: SUCCESS (found ${namespacesData.result?.length || 0})`);
      
      // Check if target namespace exists
      const targetNamespace = namespacesData.result?.find(ns => ns.id === namespaceId);
      if (targetNamespace) {
        console.log(`✅ Target Namespace: FOUND - "${targetNamespace.title}"`);
      } else {
        console.log(`❌ Target Namespace: NOT FOUND`);
        console.log('   Available namespaces:');
        namespacesData.result?.forEach(ns => {
          console.log(`     - ${ns.id}: ${ns.title}`);
        });
      }
      
      // Test namespace access
      if (namespaceId) {
        const testResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/test_key`, {
          headers
        });
        
        if (testResponse.status === 404) {
          console.log('✅ Namespace Access: SUCCESS (404 = namespace exists, key doesn\'t)');
        } else if (testResponse.status === 200) {
          console.log('✅ Namespace Access: SUCCESS (200 = key exists)');
        } else {
          console.log(`❌ Namespace Access: FAILED (${testResponse.status})`);
        }
      }
    } else {
      console.log(`❌ KV Namespaces: FAILED (${namespacesResponse.status})`);
      const errorText = await namespacesResponse.text();
      console.log(`   Error: ${errorText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`❌ KV Access: ERROR - ${error.message}`);
  }
}

async function main() {
  const authMethod = await testAuth();
  
  if (authMethod) {
    await testKVAccess(authMethod);
  } else {
    console.log('\n❌ No valid authentication method found');
    console.log('\n💡 Solutions:');
    console.log('   1. Create a new API Token with KV permissions');
    console.log('   2. Or set CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY (Global API Key)');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   - If all tests pass, your authentication is working');
  console.log('   - If namespace not found, check CLOUDFLARE_KV_NAMESPACE_ID');
  console.log('   - If auth fails, check your API token/key permissions');
}

main().catch(console.error);