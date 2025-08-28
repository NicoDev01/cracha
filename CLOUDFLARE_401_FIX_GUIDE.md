# 🔧 Cloudflare Workers 401 Unauthorized Error - Complete Fix Guide

## 🎯 Summary of Your Issue

You're experiencing **401 Unauthorized** errors in production while local development (`npm run cf:dev`) works perfectly. This is a classic **environment variable synchronization issue** between local development and Cloudflare Workers production.

## ✅ What We've Fixed

### 1. **Updated `database-api.ts`** ✅
- Implemented proper Cloudflare Workers-compatible environment variable access
- Added comprehensive error handling for 401/429/404 responses  
- Improved logging and debugging information
- Fixed TypeScript type safety issues

### 2. **Updated `wrangler.toml`** ✅
- Added clear documentation for production environment variables
- Highlighted the critical requirement to set variables in Cloudflare Dashboard

### 3. **Created Setup Scripts** ✅
- `setup-production-vars.md` - Complete manual setup guide
- `set-production-secrets.ps1` - Automated PowerShell script for setting secrets
- `test-api-connections.sh` - Comprehensive testing script

## 🚨 The Root Cause

**Critical Understanding**: Environment variables in `wrangler.toml` are **ONLY** used for local development (`npm run cf:dev`). For production deployments, **ALL** environment variables must be manually set in the Cloudflare Dashboard.

## 📋 Required Actions (In Order)

### Step 1: Set Production Environment Variables in Cloudflare Dashboard

Go to: **Cloudflare Dashboard → Workers & Pages → Your App → Settings → Environment Variables**

#### Set these as **Environment Variables** (not Secrets):
```
NEXT_PUBLIC_SUPABASE_URL = https://ncfrgsqfnccjfyezxjsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk
NEXT_PUBLIC_APP_ENV = production
NEXT_PUBLIC_USE_REAL_API = true
NEXT_PUBLIC_APP_URL = https://cracha.aimpact-agency.workers.dev
NEXT_PUBLIC_CRACHA_WORKER_URL = https://cracha-worker-rag.aimpact-agency.workers.dev
NEXT_PUBLIC_ADMIN_WORKER_URL = https://cracha-admin-worker.aimpact-agency.workers.dev
ENVIRONMENT = production
LOG_LEVEL = info
```

#### Set these as **Secrets**:
```
CLOUDFLARE_API_TOKEN = QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm
CLOUDFLARE_ACCOUNT_ID = 8c010bb7d3f4ebde9f695e61441511cb
CLOUDFLARE_KV_NAMESPACE_ID = 417ae907fb8547758b969c5eeaa635dd
DATABASE_REGISTRY_KV_ID = 417ae907fb8547758b969c5eeaa635dd
VECTORIZE_API_TOKEN = QTmd_TTQ-8sCCslgqA9W6JHK74Yl0SXKYkTt7MLm
VECTORIZE_ACCOUNT_ID = 8c010bb7d3f4ebde9f695e61441511cb
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg1ODQ0MCwiZXhwIjoyMDcwNDM0NDQwfQ.jn9_u3HcwVnFqYVM_pPzSmrQvEWU14jU213xUs1p3VA
OPENAI_API_KEY = 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
GEMINI_API_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
VERTEX_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
GOOGLE_API_KEY = AIzaSyDhBaHG4dbHrHb-7MRC_-6aLk7_AA6rzWw
```

### Step 2: Alternative - Use Automated Script

Run the PowerShell script (requires Wrangler CLI):
```bash
# Make sure you're in the cracha-frontend directory
cd cracha-frontend

# Run the automated setup script
./set-production-secrets.ps1
```

### Step 3: Rebuild and Deploy

```bash
# Build for Cloudflare Workers
npm run build:cf

# Deploy to production
npm run deploy
```

### Step 4: Test the Fix

```bash
# Test production endpoint
curl https://cracha.aimpact-agency.workers.dev/api/admin/databases

# Or run the comprehensive test script
./test-api-connections.sh
```

## 🔍 Troubleshooting Guide

### Issue: Still Getting 401 Errors After Setting Variables

**Possible Causes & Solutions:**

1. **Variables not set in correct environment**
   - Ensure variables are set for "Production" environment, not "Preview"
   - Check both "Environment Variables" and "Secrets" sections

2. **API Token Permissions**
   - Verify your API token has these permissions:
     - `Zone:Zone:Read`
     - `Account:Cloudflare Workers:Edit`
     - `Account:Cloudflare KV Storage:Edit`
     - `Account:Cloudflare Vectorize:Edit`

3. **Variable Names or Values**
   - Double-check spelling and case sensitivity
   - Ensure no extra spaces or quotes in values
   - Verify token values are correct and not expired

4. **Deployment Issues**
   - Redeploy after setting variables
   - Wait 2-3 minutes for propagation
   - Clear any caches

### Issue: Variables Not Appearing in Production

1. **Check Environment Type**
   - Variables must be set for "Production" environment specifically
   - Preview environment variables won't work for production

2. **Redeploy Required**
   - Environment variable changes require redeployment
   - Use `npm run deploy` after setting variables

### Issue: Mock Data Showing Instead of Real Data

1. **Check API Endpoint**
   - Ensure the API route is calling the correct endpoints
   - Verify authentication is working properly

2. **Check Logs**
   - Go to Cloudflare Dashboard → Workers → Your App → Logs
   - Look for authentication errors or API failures

## 📚 Understanding the Fix

### Why Local Works But Production Doesn't

| Environment | Variable Source | Working |
|-------------|----------------|---------|
| `npm run dev` | `.env.local` | ✅ |
| `npm run cf:dev` | `wrangler.toml` | ✅ |
| **Production** | **Cloudflare Dashboard** | ❌ → ✅ |

### Key Improvements Made

1. **Hybrid Environment Variable Access**: The updated `database-api.ts` properly handles both Node.js and Cloudflare Workers environments

2. **Comprehensive Error Handling**: Better error messages help identify whether issues are authentication, rate limiting, or configuration problems

3. **Production-Ready Configuration**: Proper separation of development and production environment variables

4. **Automated Setup**: Scripts to reduce manual configuration errors

## ✅ Verification Checklist

After completing the setup:

- [ ] All environment variables set in Cloudflare Dashboard
- [ ] Variables set for "Production" environment specifically  
- [ ] Both "Environment Variables" and "Secrets" configured
- [ ] Application redeployed after setting variables
- [ ] Production endpoint tested and returns data
- [ ] No 401 Unauthorized errors in production
- [ ] Local development still works (`npm run cf:dev`)

## 🎯 Expected Result

After following this guide:

1. **Production**: https://cracha.aimpact-agency.workers.dev/api/admin/databases returns real database data
2. **Local Development**: `npm run cf:dev` continues to work as before  
3. **Error Handling**: Clear error messages for any remaining issues
4. **Authentication**: Supabase authentication works in all environments

## 📞 If You Still Have Issues

If you continue to experience 401 errors after following this guide:

1. **Check API Token**: Create a new API token with broader permissions
2. **Verify Account ID**: Ensure the account ID matches your Cloudflare account
3. **Test Token Manually**: Use curl to test the Cloudflare API directly
4. **Check Logs**: Monitor real-time logs in Cloudflare Dashboard

The combination of updated code and properly configured production environment variables should completely resolve your 401 Unauthorized errors.