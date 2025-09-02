'use client'

/**
 * Clear all Supabase auth cookies to fix refresh token issues
 * Call this when encountering persistent auth errors
 */
export function clearAuthCookies() {
  if (typeof window === 'undefined') return

  // List of Supabase auth cookie names
  const authCookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'supabase.auth.token',
    'sb-ncfrgsqfnccjfyezxjsj-auth-token',
    'sb-ncfrgsqfnccjfyezxjsj-auth-token-code-verifier'
  ]

  // Clear cookies by setting them to expire
  authCookieNames.forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  })

  // Clear localStorage items
  const authStorageKeys = [
    'supabase.auth.token',
    'sb-ncfrgsqfnccjfyezxjsj-auth-token',
    'sb-ncfrgsqfnccjfyezxjsj-auth-token-code-verifier'
  ]

  authStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn('Could not clear storage item:', key, error)
    }
  })

  console.log('🧹 Cleared all auth cookies and storage')
}
