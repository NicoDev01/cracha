# Google Auth Setup Guide

## Current Status
✅ Supabase client configured  
✅ Auth store with Google login function  
✅ Auth callback API route (PKCE compatible)  
✅ Auth middleware for session management  
✅ Environment variables set  
✅ Error handling pages  

## Required Supabase Configuration

### 1. In your Supabase Dashboard

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

### 2. Redirect URLs in Supabase

Add these redirect URLs in Supabase Auth settings:

**For Development:**
```
http://localhost:3000/auth/callback
```

**For Production:**
```
https://cracha.aimpact-agency.workers.dev/auth/callback
https://your-production-domain.com/auth/callback
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **Google Identity API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set **Application type** to **Web application**
6. Add **Authorized redirect URIs**:
   ```
   https://ncfrgsqfnccjfyezxjsj.supabase.co/auth/v1/callback
   ```

## Testing Steps

### 1. Test Basic Connection
Visit: `http://localhost:3000/debug/auth`

Click "Test Supabase Connection" to verify basic setup.

### 2. Test Google OAuth Flow
Click "Test Google OAuth" - this should:
1. Log the redirect URL and callback route status
2. Initiate Google OAuth flow with PKCE
3. Redirect to Google's login page
4. After Google login, redirect back to `/auth/callback` (API route)
5. Finally redirect to `/dashboard`

### 3. Check Browser Console
Open browser dev tools and check for:
- ✅ "Google OAuth initiated successfully"
- ✅ "Callback route status: 405" (expected for HEAD request)
- ❌ Any error messages

### 4. Test the Login Page
Visit: `http://localhost:3000/login`
Click the "Mit Google anmelden" button

## Common Issues & Solutions

### Issue: "Invalid redirect URI"
**Solution:** Ensure the redirect URI in Google Cloud Console exactly matches:
```
https://ncfrgsqfnccjfyezxjsj.supabase.co/auth/v1/callback
```

### Issue: "OAuth provider not enabled"
**Solution:** Enable Google provider in Supabase Dashboard → Authentication → Providers

### Issue: Button does nothing
**Solution:** Check browser console for JavaScript errors

### Issue: "Access blocked"
**Solution:** Verify OAuth consent screen is configured in Google Cloud Console

## Environment Variables Check

Your `.env.local` should have:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ncfrgsqfnccjfyezxjsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Debug Commands

```bash
# Start development server
npm run dev

# Visit debug page
open http://localhost:3000/debug/auth

# Check logs in browser console
# Press F12 → Console tab
```

## Next Steps

1. ✅ Test the debug page: `/debug/auth`
2. ⏳ Configure Google Cloud Console redirect URI
3. ⏳ Enable Google provider in Supabase
4. ⏳ Test the actual login flow

## Support

If you encounter issues:
1. Check the debug console output
2. Verify all redirect URIs match exactly
3. Ensure Google OAuth consent screen is published
4. Check Supabase logs in the dashboard