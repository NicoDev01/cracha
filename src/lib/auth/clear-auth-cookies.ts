'use client'

/**
 * Clear all Supabase auth cookies to fix refresh token issues
 * Call this when encountering persistent auth errors
 */
export function clearAuthCookies() {
  if (typeof window === 'undefined') return

  const authCookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name && (
      name.startsWith('sb-')
      || name.startsWith('supabase.')
      || name.startsWith('supabase-')
    )))

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

}
