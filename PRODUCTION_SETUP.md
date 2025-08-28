# Production Deployment Setup Guide

## The Problem
Your application works in `npm run cf:dev` (development) but shows mock data in production because environment variables from `wrangler.toml` are not automatically transferred to production deployments.

## Quick Fix - Set Environment Variables in Cloudflare Dashboard

1. **Go to Cloudflare Dashboard**
   - Navigate to **Workers & Pages** → Your Project (`cracha-frontend`)
   - Go to **Settings** → **Environment Variables**

2. **Add these variables for PRODUCTION environment:**
   ```
   CLOUDFLARE_API_TOKEN = QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm
   CLOUDFLARE_ACCOUNT_ID = 8c010bb7d3f4ebde9f695e61441511cb
   CLOUDFLARE_KV_NAMESPACE_ID = 417ae907fb8547758b969c5eeaa635dd
   DATABASE_REGISTRY_KV_ID = 417ae907fb8547758b969c5eeaa635dd
   NEXT_PUBLIC_SUPABASE_URL = https://ncfrgsqfnccjfyezxjsj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   OPENAI_API_KEY = sk-proj-VNeSI05HoqDEDE4bL7lTLpyVNK4VumCn6r2sYLAuPpsm5JnQlYLj24P1pq...
   GEMINI_API_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
   ```

3. **Deploy again**
   - Push your changes to GitHub
   - Cloudflare will automatically rebuild with the new environment variables

## Alternative - Using Wrangler CLI (Advanced)

If you prefer command line, you can run the provided PowerShell script:
```powershell
.\set-production-secrets.ps1
```

Or set them manually:
```bash
wrangler secret put CLOUDFLARE_API_TOKEN --env production
wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
wrangler secret put CLOUDFLARE_KV_NAMESPACE_ID --env production
# ... repeat for all variables
```

## Why This Happens

- **Development (`npm run cf:dev`)**: Uses variables from `wrangler.toml` [vars] section
- **Production deployment**: Only uses variables set in Cloudflare Dashboard or via `wrangler secret`
- **wrangler.toml [vars]** are only for local development, not production

## Verification

After setting the variables, check the logs in your next deployment. You should see:
- ✅ `Token validation response: 200 OK`
- ✅ `Found X databases for user ...`

Instead of:
- ❌ `Token validation response: 401 Unauthorized`
- ❌ `Falling back to mock data due to invalid token`