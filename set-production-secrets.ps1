# PowerShell script to set Cloudflare production secrets
# Run this script to configure environment variables for production deployment

Write-Host "Setting Cloudflare Workers production environment variables..." -ForegroundColor Green

# Set the secrets using wrangler
wrangler secret put CLOUDFLARE_API_TOKEN --env production
wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production  
wrangler secret put CLOUDFLARE_KV_NAMESPACE_ID --env production
wrangler secret put DATABASE_REGISTRY_KV_ID --env production

# Set other required variables
wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env production
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put GEMINI_API_KEY --env production

Write-Host "All secrets have been set for production environment!" -ForegroundColor Green
Write-Host "You can now deploy with: npm run deploy" -ForegroundColor Yellow