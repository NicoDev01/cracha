@echo off
REM Cloudflare Workers Secrets Deployment Script for Windows

echo 🚀 Deploying secrets to Cloudflare Workers...

REM Set all secrets at once
echo 8c010bb7d3f4ebde9f695e61441511cb | wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
echo 77gSlb7YkPC-Cs9xOvrf6O9qW76tGnnaM38-NXIA | wrangler secret put CLOUDFLARE_API_KEY --env production
echo A1Sw8Rl7ztCFihG2hJNs9-VI85XuZPcCs_EPre6b | wrangler secret put CLOUDFLARE_API_TOKEN --env production
echo Aimpact.agency@gmail.com | wrangler secret put CLOUDFLARE_EMAIL --env production
echo 417ae907fb8547758b969c5eeaa635dd | wrangler secret put CLOUDFLARE_KV_NAMESPACE_ID --env production
echo 417ae907fb8547758b969c5eeaa635dd | wrangler secret put DATABASE_REGISTRY_KV_ID --env production
echo AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw | wrangler secret put GEMINI_API_KEY --env production
echo 29bd2f55dbea6d4937d4f234dbc7bee582d4b | wrangler secret put GLOBAL_API_KEY --env production
echo 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 | wrangler secret put OPENAI_API_KEY --env production
echo 8c010bb7d3f4ebde9f695e61441511cb | wrangler secret put VECTORIZE_ACCOUNT_ID --env production
echo A1Sw8Rl7ztCFihG2hJNs9-VI85XuZPcCs_EPre6b | wrangler secret put VECTORIZE_API_TOKEN --env production
echo AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw | wrangler secret put VERTEX_KEY --env production

REM Supabase Authentication
echo https://ncfrgsqfnccjfyezxjsj.supabase.co | wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env production
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk | wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env production
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg1ODQ0MCwiZXhwIjoyMDcwNDM0NDQwfQ.jn9_u3HcwVnFqYVM_pPzSmrQvEWU14jU213xUs1p3VA | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production

echo ✅ All secrets deployed successfully!
echo 🚀 Ready to deploy: npm run deploy