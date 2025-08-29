# Cloudflare API Token Testing Script
# This script tests your Cloudflare API token permissions

param(
    [string]$Token,
    [string]$AccountId = "8c010bb7d3f4ebde9f695e61441511cb"
)

Write-Host "🔐 Cloudflare API Token Permission Test" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Get token from parameter or prompt
if (-not $Token) {
    $Token = Read-Host "Enter your Cloudflare API Token"
}

if (-not $Token) {
    Write-Host "❌ No token provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Testing token: $($Token.Substring(0, [Math]::Min(8, $Token.Length)))..." -ForegroundColor Cyan
Write-Host "📋 Account ID: $AccountId" -ForegroundColor Cyan

# Function to test API endpoint
function Test-CloudflareEndpoint {
    param(
        [string]$Url,
        [string]$Description,
        [hashtable]$Headers
    )
    
    Write-Host ""
    Write-Host "🧪 Testing: $Description" -ForegroundColor Yellow
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Headers $Headers -Method Get -ErrorAction Stop
        
        if ($response.success) {
            Write-Host "   ✅ SUCCESS: $Description" -ForegroundColor Green
            
            if ($response.result -and $response.result.Count -ge 0) {
                Write-Host "   📊 Results: $($response.result.Count) items found" -ForegroundColor Blue
            }
            
            return $true
        } else {
            Write-Host "   ❌ FAILED: $Description" -ForegroundColor Red
            Write-Host "   Error: $($response.errors | ConvertTo-Json -Compress)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "   ❌ FAILED: $Description" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "   Status Code: $statusCode" -ForegroundColor Red
            
            if ($statusCode -eq 401) {
                Write-Host "   🔑 This indicates insufficient permissions or invalid token" -ForegroundColor Yellow
            }
        }
        
        return $false
    }
}

# Set up headers for API token authentication
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "🔬 Running Permission Tests..." -ForegroundColor Cyan

# Test 1: Basic token verification
$test1 = Test-CloudflareEndpoint `
    -Url "https://api.cloudflare.com/client/v4/user/tokens/verify" `
    -Description "Token Verification" `
    -Headers $headers

# Test 2: Account access
$test2 = Test-CloudflareEndpoint `
    -Url "https://api.cloudflare.com/client/v4/accounts/$AccountId" `
    -Description "Account Access" `
    -Headers $headers

# Test 3: KV Namespaces
$test3 = Test-CloudflareEndpoint `
    -Url "https://api.cloudflare.com/client/v4/accounts/$AccountId/storage/kv/namespaces" `
    -Description "KV Namespaces Access" `
    -Headers $headers

# Test 4: Workers Scripts
$test4 = Test-CloudflareEndpoint `
    -Url "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/scripts" `
    -Description "Workers Scripts Access" `
    -Headers $headers

# Test 5: Vectorize Indexes (if available)
$test5 = Test-CloudflareEndpoint `
    -Url "https://api.cloudflare.com/client/v4/accounts/$AccountId/vectorize/indexes" `
    -Description "Vectorize Indexes Access" `
    -Headers $headers

# Summary
Write-Host ""
Write-Host "📊 TEST SUMMARY" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

$tests = @(
    @{ Name = "Token Verification"; Result = $test1 }
    @{ Name = "Account Access"; Result = $test2 }
    @{ Name = "KV Namespaces"; Result = $test3 }
    @{ Name = "Workers Scripts"; Result = $test4 }
    @{ Name = "Vectorize Indexes"; Result = $test5 }
)

$passedTests = 0
foreach ($test in $tests) {
    $status = if ($test.Result) { "✅ PASS" } else { "❌ FAIL" }
    $color = if ($test.Result) { "Green" } else { "Red" }
    Write-Host "$status $($test.Name)" -ForegroundColor $color
    if ($test.Result) { $passedTests++ }
}

Write-Host ""
Write-Host "📈 Results: $passedTests/$($tests.Count) tests passed" -ForegroundColor $(if ($passedTests -eq $tests.Count) { "Green" } else { "Yellow" })

if ($passedTests -lt $tests.Count) {
    Write-Host ""
    Write-Host "🔧 RECOMMENDATIONS:" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $test1) {
        Write-Host "❌ Token verification failed - Your token is invalid or expired" -ForegroundColor Red
        Write-Host "   → Create a new API token at: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Yellow
    }
    
    if (-not $test2) {
        Write-Host "❌ Account access failed - Token lacks account permissions" -ForegroundColor Red
        Write-Host "   → Add 'Account:Account Memberships:Read' permission" -ForegroundColor Yellow
    }
    
    if (-not $test3) {
        Write-Host "❌ KV access failed - Token lacks KV permissions" -ForegroundColor Red
        Write-Host "   → Add 'Account:Cloudflare KV Storage:Edit' permission" -ForegroundColor Yellow
    }
    
    if (-not $test4) {
        Write-Host "❌ Workers access failed - Token lacks Workers permissions" -ForegroundColor Red
        Write-Host "   → Add 'Account:Cloudflare Workers:Edit' permission" -ForegroundColor Yellow
    }
    
    if (-not $test5) {
        Write-Host "⚠️  Vectorize access failed - This might be expected if Vectorize isn't enabled" -ForegroundColor Yellow
        Write-Host "   → Add 'Account:Cloudflare Vectorize:Edit' permission if you use Vectorize" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🎯 Required Permissions for Full Functionality:" -ForegroundColor Cyan
    Write-Host "   • Zone:Zone:Read" -ForegroundColor White
    Write-Host "   • Account:Account Memberships:Read" -ForegroundColor White
    Write-Host "   • Account:Cloudflare Workers:Edit" -ForegroundColor White
    Write-Host "   • Account:Cloudflare KV Storage:Edit" -ForegroundColor White
    Write-Host "   • Account:Cloudflare Vectorize:Edit" -ForegroundColor White
    Write-Host "   • Account:Workers Scripts:Edit" -ForegroundColor White
    
} else {
    Write-Host ""
    Write-Host "🎉 All tests passed! Your token has the correct permissions." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Update your .env.local file with this token" -ForegroundColor White
    Write-Host "2. Update your wrangler.toml file with this token" -ForegroundColor White
    Write-Host "3. Set the token in Cloudflare Dashboard for production" -ForegroundColor White
    Write-Host "4. Rebuild and deploy: npm run build:cf && npm run deploy" -ForegroundColor White
}

Write-Host ""
Write-Host "🔗 Create new token: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Blue
Write-Host "📚 API Documentation: https://developers.cloudflare.com/api/" -ForegroundColor Blue