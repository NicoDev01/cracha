# Cloudflare Workers Production Secrets Setup Script
# This script automates the process of setting production environment variables

Write-Host "🚀 Setting up Cloudflare Workers Production Environment Variables" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Function to set a secret with wrangler
function Set-WorkerSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description
    )
    
    Write-Host "🔐 Setting $Description..." -ForegroundColor Yellow
    
    try {
        # Use echo to pipe the value to wrangler secret put
        echo $SecretValue | wrangler secret put $SecretName --env production
        Write-Host "✅ Successfully set $SecretName" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to set $SecretName" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Check if wrangler is installed
Write-Host "🔍 Checking if Wrangler CLI is installed..." -ForegroundColor Cyan
try {
    $wranglerVersion = wrangler --version
    Write-Host "✅ Wrangler found: $wranglerVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Wrangler CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# Check if user is authenticated
Write-Host "🔍 Checking Wrangler authentication..." -ForegroundColor Cyan
try {
    wrangler whoami
    Write-Host "✅ Wrangler is authenticated" -ForegroundColor Green
}
catch {
    Write-Host "❌ Please authenticate with Wrangler first:" -ForegroundColor Red
    Write-Host "wrangler login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: This will set production secrets for your Cloudflare Worker." -ForegroundColor Yellow
Write-Host "Make sure you're in the correct project directory and have the right permissions." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Do you want to continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔧 Setting Cloudflare Configuration Secrets..." -ForegroundColor Cyan

# Cloudflare Configuration
Set-WorkerSecret "CLOUDFLARE_API_TOKEN" "QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm" "Cloudflare API Token"
Set-WorkerSecret "CLOUDFLARE_ACCOUNT_ID" "8c010bb7d3f4ebde9f695e61441511cb" "Cloudflare Account ID"
Set-WorkerSecret "CLOUDFLARE_KV_NAMESPACE_ID" "417ae907fb8547758b969c5eeaa635dd" "KV Namespace ID"
Set-WorkerSecret "DATABASE_REGISTRY_KV_ID" "417ae907fb8547758b969c5eeaa635dd" "Database Registry KV ID"
Set-WorkerSecret "VECTORIZE_API_TOKEN" "QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm" "Vectorize API Token"
Set-WorkerSecret "VECTORIZE_ACCOUNT_ID" "8c010bb7d3f4ebde9f695e61441511cb" "Vectorize Account ID"

Write-Host ""
Write-Host "🔐 Setting Supabase Authentication Secrets..." -ForegroundColor Cyan

# Supabase Authentication
Set-WorkerSecret "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg1ODQ0MCwiZXhwIjoyMDcwNDM0NDQwfQ.jn9_u3HcwVnFqYVM_pPzSmrQvEWU14jU213xUs1p3VA" "Supabase Service Role Key"

Write-Host ""
Write-Host "🤖 Setting AI Provider Secrets..." -ForegroundColor Cyan

# AI Provider Keys
Set-WorkerSecret "OPENAI_API_KEY" "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" "OpenAI API Key"
Set-WorkerSecret "GEMINI_API_KEY" "AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw" "Gemini API Key"
Set-WorkerSecret "VERTEX_KEY" "AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw" "Vertex AI Key"
Set-WorkerSecret "GOOGLE_API_KEY" "AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw" "Google API Key"

Write-Host ""
Write-Host "🔥 Setting Additional Environment Variables..." -ForegroundColor Cyan

# Note: These should be set as regular variables, not secrets
Write-Host "ℹ️  Setting non-secret environment variables via wrangler..." -ForegroundColor Blue
Write-Host "These should be set in the Cloudflare Dashboard as Environment Variables (not Secrets):" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_APP_ENV" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_USE_REAL_API" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_APP_URL" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_CRACHA_WORKER_URL" -ForegroundColor Blue
Write-Host "  - NEXT_PUBLIC_ADMIN_WORKER_URL" -ForegroundColor Blue
Write-Host "  - ENVIRONMENT" -ForegroundColor Blue
Write-Host "  - LOG_LEVEL" -ForegroundColor Blue

Write-Host ""
Write-Host "✅ Production secrets setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Set the NEXT_PUBLIC_ variables in Cloudflare Dashboard > Workers & Pages > Your App > Settings > Environment Variables" -ForegroundColor White
Write-Host "2. Build and deploy your application:" -ForegroundColor White
Write-Host "   npm run build:cf" -ForegroundColor Yellow
Write-Host "   npm run deploy" -ForegroundColor Yellow
Write-Host "3. Test the production endpoint:" -ForegroundColor White
Write-Host "   curl https://cracha.aimpact-agency.workers.dev/api/admin/databases" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 Cloudflare Dashboard: https://dash.cloudflare.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Remember: Environment Variables in the Dashboard must be set manually!" -ForegroundColor Yellow
Write-Host "   This script only sets the sensitive secrets via CLI." -ForegroundColor Yellow