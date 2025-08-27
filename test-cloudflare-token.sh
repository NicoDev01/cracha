#!/bin/bash

echo "🔍 Testing Cloudflare API Token Configuration..."
echo

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "Environment Variables:"
echo "  CLOUDFLARE_ACCOUNT_ID: ${CLOUDFLARE_ACCOUNT_ID:0:8}..."
echo "  CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN:0:8}..."
echo "  CLOUDFLARE_KV_NAMESPACE_ID: $CLOUDFLARE_KV_NAMESPACE_ID"
echo

# Test 1: Account access
echo "🧪 Test 1: Account Access"
curl -s -w "Status: %{http_code}\n" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID" | head -3
echo

# Test 2: List KV namespaces
echo "🧪 Test 2: KV Namespaces List"
curl -s -w "Status: %{http_code}\n" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces" | head -3
echo

# Test 3: Specific namespace access
echo "🧪 Test 3: Specific Namespace Access"
curl -s -w "Status: %{http_code}\n" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces/$CLOUDFLARE_KV_NAMESPACE_ID/values/test_key" | head -3
echo

echo "✅ Test completed!"
echo
echo "Expected results:"
echo "  Test 1: Status 200 (account access)"
echo "  Test 2: Status 200 (can list namespaces)"
echo "  Test 3: Status 404 (namespace exists but key doesn't) or Status 200 (key exists)"
echo
echo "If you see Status 401 in any test, the API token doesn't have the required permissions."