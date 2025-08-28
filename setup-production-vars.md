# Production Environment Variables Setup Guide

## 🚨 CRITICAL: Why You're Getting 401 Unauthorized Errors

The 401 Unauthorized errors occur because **Cloudflare Workers production environment variables are NOT automatically synchronized from `wrangler.toml`**. They must be manually set in the Cloudflare Dashboard.

## 📋 Required Actions

### Step 1: Add Environment Variables in Cloudflare Dashboard

Go to **Cloudflare Dashboard → Workers & Pages → Your App → Settings → Environment Variables** and add these **Production** environment variables:

#### 🔐 Authentication & Core Configuration
```
CLOUDFLARE_API_TOKEN = QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm
CLOUDFLARE_ACCOUNT_ID = 8c010bb7d3f4ebde9f695e61441511cb
CLOUDFLARE_KV_NAMESPACE_ID = 417ae907fb8547758b969c5eeaa635dd
DATABASE_REGISTRY_KV_ID = 417ae907fb8547758b969c5eeaa635dd
VECTORIZE_API_TOKEN = QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm
VECTORIZE_ACCOUNT_ID = 8c010bb7d3f4ebde9f695e61441511cb
```

#### 🔑 Supabase Authentication
```
NEXT_PUBLIC_SUPABASE_URL = https://ncfrgsqfnccjfyezxjsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg1ODQ0MCwiZXhwIjoyMDcwNDM0NDQwfQ.jn9_u3HcwVnFqYVM_pPzSmrQvEWU14jU213xUs1p3VA
```

#### 🤖 AI Provider Keys
```
OPENAI_API_KEY = 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
GEMINI_API_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
VERTEX_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
GOOGLE_API_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
```

#### 🌐 Application Configuration
```
NEXT_PUBLIC_APP_ENV = production
NEXT_PUBLIC_USE_REAL_API = true
NEXT_PUBLIC_APP_URL = https://cracha.aimpact-agency.workers.dev
NEXT_PUBLIC_CRACHA_WORKER_URL = https://cracha-worker-rag.aimpact-agency.workers.dev
NEXT_PUBLIC_ADMIN_WORKER_URL = https://cracha-admin-worker.aimpact-agency.workers.dev
ENVIRONMENT = production
LOG_LEVEL = info
```

### Step 2: Alternative - Using Wrangler CLI

You can also set secrets via command line (but Dashboard is more reliable):

```bash
# Set each variable as a secret
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_KV_NAMESPACE_ID
wrangler secret put DATABASE_REGISTRY_KV_ID
wrangler secret put VECTORIZE_API_TOKEN
wrangler secret put VECTORIZE_ACCOUNT_ID
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY
```

### Step 3: Verify Configuration

After setting the variables, deploy and test:

```bash
# Deploy with new configuration
npm run build:cf
npm run deploy

# Test the deployment
curl https://cracha.aimpact-agency.workers.dev/api/admin/databases
```

## 🔍 Debugging Production Issues

### Check Environment Variables in Production

1. **Cloudflare Dashboard**: Go to Workers & Pages → Your App → Settings → Environment Variables
2. **Verify all required variables are set with correct values**
3. **Make sure they're set for "Production" environment, not just "Preview"**

### Common Issues & Solutions

#### ❌ Problem: Still getting 401 errors after setting variables
**Solution**: 
- Double-check variable names (exact spelling and case)
- Ensure values don't have extra spaces or quotes
- Verify the API token has correct permissions

#### ❌ Problem: Variables not appearing in production
**Solution**:
- Make sure you're setting them for "Production" environment
- Redeploy after setting variables
- Wait a few minutes for propagation

#### ❌ Problem: API token permissions
**Solution**:
- Ensure the API token has these permissions:
  - `Zone:Zone:Read`
  - `Zone:Zone Settings:Edit`
  - `Account:Cloudflare Workers:Edit`
  - `Account:Account Memberships:Read`
  - `Account:Cloudflare KV Storage:Edit`
  - `Account:Cloudflare Vectorize:Edit`

## 🔄 Testing Workflow

1. **Local Development**: `npm run cf:dev` (uses wrangler.toml vars)
2. **Production Test**: Deploy and test live endpoint
3. **Debug**: Check logs in Cloudflare Dashboard → Workers → Your App → Logs

## 📚 Important Notes

- **Local vs Production**: `wrangler.toml` variables are ONLY for local development
- **Security**: Never commit secrets to git - they're safe in Cloudflare Dashboard
- **Synchronization**: Always keep local `.env.local`, `wrangler.toml`, and Cloudflare Dashboard in sync
- **Deployment**: Changes to Dashboard variables require redeploy to take effect

## ✅ Verification Checklist

- [ ] All environment variables set in Cloudflare Dashboard
- [ ] Variables set for "Production" environment specifically
- [ ] API token has correct permissions
- [ ] Redeployed application after setting variables
- [ ] Tested production endpoint returns data instead of 401

After completing these steps, your 401 Unauthorized errors should be resolved and the production environment will work exactly like your local development environment.