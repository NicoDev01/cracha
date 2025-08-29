# Load environment variables from .env.local
Write-Host "🔍 Testing Cloudflare API Token Configuration..." -ForegroundColor Cyan
Write-Host

$envFile = ".\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^#][^=]*?)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$accountId = $env:CLOUDFLARE_ACCOUNT_ID
$apiToken = $env:CLOUDFLARE_API_TOKEN
$namespaceId = $env:CLOUDFLARE_KV_NAMESPACE_ID

Write-Host "Environment Variables:"
Write-Host "  CLOUDFLARE_ACCOUNT_ID: $($accountId.Substring(0, [Math]::Min(8, $accountId.Length)))..."
Write-Host "  CLOUDFLARE_API_TOKEN: $($apiToken.Substring(0, [Math]::Min(8, $apiToken.Length)))..."
Write-Host "  CLOUDFLARE_KV_NAMESPACE_ID: $namespaceId"
Write-Host

# Test 1: Account access
Write-Host "🧪 Test 1: Account Access" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId" `
        -Headers @{
            "Authorization" = "Bearer $apiToken"
            "Content-Type" = "application/json"
        } -ErrorAction Stop
    
    Write-Host "✅ Account access: SUCCESS" -ForegroundColor Green
    Write-Host "Account name: $($response.result.name)"
} catch {
    Write-Host "❌ Account access: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host

# Test 2: List KV namespaces
Write-Host "🧪 Test 2: KV Namespaces List" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/storage/kv/namespaces" `
        -Headers @{
            "Authorization" = "Bearer $apiToken"
            "Content-Type" = "application/json"
        } -ErrorAction Stop
    
    Write-Host "✅ Namespaces access: SUCCESS" -ForegroundColor Green
    Write-Host "Total namespaces: $($response.result.Count)"
    
    # Check if our target namespace exists
    $targetNamespace = $response.result | Where-Object { $_.id -eq $namespaceId }
    if ($targetNamespace) {
        Write-Host "✅ Target namespace found: $($targetNamespace.title)" -ForegroundColor Green
    } else {
        Write-Host "❌ Target namespace NOT found in account" -ForegroundColor Red
        Write-Host "Available namespaces:"
        $response.result | ForEach-Object { Write-Host "  - $($_.id): $($_.title)" }
    }
} catch {
    Write-Host "❌ Namespaces access: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host

# Test 3: Specific namespace access
Write-Host "🧪 Test 3: Specific Namespace Access" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/storage/kv/namespaces/$namespaceId/values/test_key" `
        -Headers @{
            "Authorization" = "Bearer $apiToken"
            "Content-Type" = "application/json"
        } -ErrorAction Stop
    
    Write-Host "✅ Namespace access: SUCCESS (key exists)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Namespace access: SUCCESS (key doesn't exist - this is normal)" -ForegroundColor Green
    } else {
        Write-Host "❌ Namespace access: FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host

Write-Host "🎯 Diagnosis:" -ForegroundColor Cyan
Write-Host "Expected results:"
Write-Host "  ✅ Test 1: SUCCESS (account access)"
Write-Host "  ✅ Test 2: SUCCESS (can list namespaces)"
Write-Host "  ✅ Test 3: SUCCESS with 404 (namespace exists but key doesn't)"
Write-Host
Write-Host "If any test shows 401 Unauthorized, the API token doesn't have the required permissions." -ForegroundColor Yellow
Write-Host "If Test 2 shows namespace NOT found, the CLOUDFLARE_KV_NAMESPACE_ID is incorrect." -ForegroundColor Yellow