# Cloudflare Workers Secrets setzen
# Führe diese Befehle einzeln aus und gib die Werte ein

Write-Host "Setting Cloudflare Workers Secrets..." -ForegroundColor Green

# Global API Key (funktioniert nachweislich lokal)
wrangler secret put CLOUDFLARE_API_KEY
# Wert: 77gSlb7YkPC-Cs9xOvrf6O9qW76tGnnaM38-NXIA

# Optional: Falls die Route nach GLOBAL_API_KEY sucht
wrangler secret put GLOBAL_API_KEY  
# Wert: 29bd2f55dbea6d4937d4f234dbc7bee582d4b

# Email für Global API Key
wrangler secret put CLOUDFLARE_EMAIL  
# Wert: Aimpact.agency@gmail.com

# Account ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Wert: 8c010bb7d3f4ebde9f695e61441511cb

# KV Namespace ID
wrangler secret put CLOUDFLARE_KV_NAMESPACE_ID
# Wert: 417ae907fb8547758b969c5eeaa635dd

# Supabase (falls noch nicht gesetzt)
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
# Wert: https://ncfrgsqfnccjfyezxjsj.supabase.co

wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
# Wert: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Wert: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg1ODQ0MCwiZXhwIjoyMDcwNDM0NDQwfQ.jn9_u3HcwVnFqYVM_pPzSmrQvEWU14jU213xUs1p3VA

Write-Host "Done! Now deploy with: npm run deploy" -ForegroundColor Green