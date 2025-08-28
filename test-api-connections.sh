#!/bin/bash

# Test Script for Cloudflare Workers API Connections
# This script tests the database API in both local and production environments

echo "🧪 Testing CraCha Database API Connections"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -e "${BLUE}🔍 Testing: $description${NC}"
    echo -e "   URL: $url"
    
    # Make request and capture response
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json")
    
    # Extract HTTP status code
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
    
    # Check status
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "   ${GREEN}✅ Status: $http_code (Expected: $expected_status)${NC}"
        
        # Try to parse JSON response
        if echo "$body" | jq . >/dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Valid JSON response${NC}"
            
            # Show relevant parts of response
            if echo "$body" | jq -e '.success' >/dev/null 2>&1; then
                success=$(echo "$body" | jq -r '.success')
                echo -e "   ${GREEN}✅ Success: $success${NC}"
            fi
            
            if echo "$body" | jq -e '.databases' >/dev/null 2>&1; then
                count=$(echo "$body" | jq '.databases | length')
                echo -e "   ${GREEN}✅ Databases found: $count${NC}"
            fi
            
            if echo "$body" | jq -e '.environment' >/dev/null 2>&1; then
                environment=$(echo "$body" | jq -r '.environment')
                echo -e "   ${BLUE}ℹ️  Environment: $environment${NC}"
            fi
            
            if echo "$body" | jq -e '.note' >/dev/null 2>&1; then
                note=$(echo "$body" | jq -r '.note')
                echo -e "   ${YELLOW}📝 Note: $note${NC}"
            fi
        else
            echo -e "   ${YELLOW}⚠️  Non-JSON response${NC}"
            echo -e "   Response: ${body:0:200}..."
        fi
    else
        echo -e "   ${RED}❌ Status: $http_code (Expected: $expected_status)${NC}"
        
        # Show error details
        if echo "$body" | jq . >/dev/null 2>&1; then
            if echo "$body" | jq -e '.error' >/dev/null 2>&1; then
                error=$(echo "$body" | jq -r '.error')
                echo -e "   ${RED}❌ Error: $error${NC}"
            fi
        else
            echo -e "   ${RED}❌ Response: ${body:0:200}...${NC}"
        fi
    fi
    
    echo ""
}

# Function to test health endpoint
test_health() {
    local base_url=$1
    local description=$2
    
    echo -e "${BLUE}🏥 Testing Health Check: $description${NC}"
    
    # Test cloudflare token endpoint
    test_endpoint "$base_url/api/test/cloudflare-token" "Cloudflare Token Test"
    
    # Test databases endpoint
    test_endpoint "$base_url/api/admin/databases" "Databases API"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is not installed. Please install it to run this test.${NC}"
    echo "Install with: sudo apt-get install jq (Ubuntu) or brew install jq (macOS)"
    exit 1
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl is not installed. Please install it to run this test.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Test 1: Local Development Server (if running)
echo -e "${YELLOW}📍 Test 1: Local Development Server${NC}"
echo "================================================"

if curl -s --connect-timeout 3 http://localhost:3000 >/dev/null 2>&1; then
    test_health "http://localhost:3000" "Local Development (npm run dev)"
else
    echo -e "${YELLOW}⚠️  Local development server not running on port 3000${NC}"
    echo "   Start with: npm run dev"
    echo ""
fi

# Test 2: Cloudflare Workers Local (if running)
echo -e "${YELLOW}📍 Test 2: Cloudflare Workers Local Simulation${NC}"
echo "================================================"

if curl -s --connect-timeout 3 http://127.0.0.1:8787 >/dev/null 2>&1; then
    test_health "http://127.0.0.1:8787" "Cloudflare Workers Local (npm run cf:dev)"
else
    echo -e "${YELLOW}⚠️  Cloudflare Workers local server not running on port 8787${NC}"
    echo "   Start with: npm run cf:dev"
    echo ""
fi

# Test 3: Production Deployment
echo -e "${YELLOW}📍 Test 3: Production Deployment${NC}"
echo "================================================"

PRODUCTION_URL="https://cracha.aimpact-agency.workers.dev"
if curl -s --connect-timeout 10 "$PRODUCTION_URL" >/dev/null 2>&1; then
    test_health "$PRODUCTION_URL" "Production Deployment"
    
    # Additional production-specific tests
    echo -e "${BLUE}🔍 Additional Production Tests${NC}"
    test_endpoint "$PRODUCTION_URL/api/admin/databases" "Production Database API" 200
    
else
    echo -e "${RED}❌ Production deployment not accessible${NC}"
    echo "   URL: $PRODUCTION_URL"
    echo ""
fi

# Test 4: RAG Worker Endpoints
echo -e "${YELLOW}📍 Test 4: RAG Worker Endpoints${NC}"
echo "================================================"

RAG_WORKER_URL="https://cracha-worker-rag.aimpact-agency.workers.dev"
test_endpoint "$RAG_WORKER_URL/health" "RAG Worker Health Check"
test_endpoint "$RAG_WORKER_URL/docs" "RAG Worker Documentation"
test_endpoint "$RAG_WORKER_URL/databases" "RAG Worker Databases List"

# Test 5: Admin Worker Endpoints  
echo -e "${YELLOW}📍 Test 5: Admin Worker Endpoints${NC}"
echo "================================================"

ADMIN_WORKER_URL="https://cracha-admin-worker.aimpact-agency.workers.dev"
test_endpoint "$ADMIN_WORKER_URL/health" "Admin Worker Health Check" 200

echo -e "${GREEN}🎯 Test Summary${NC}"
echo "================================================"
echo -e "${BLUE}ℹ️  If you see 401 Unauthorized errors in production:${NC}"
echo "   1. Run the setup script: ./set-production-secrets.ps1"
echo "   2. Set environment variables in Cloudflare Dashboard"
echo "   3. Redeploy the application: npm run deploy"
echo ""
echo -e "${BLUE}ℹ️  If you see mock data in local development:${NC}"
echo "   1. Check .env.local configuration"
echo "   2. Verify wrangler.toml settings"
echo "   3. Ensure authentication is working"
echo ""
echo -e "${GREEN}✅ Test completed!${NC}"