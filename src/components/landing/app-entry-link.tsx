'use client'

/*
 * Every "open the app" button on the marketing page renders through here
 * instead of hard-coding /login. A visitor whose Supabase session is still
 * live skips the login screen and lands directly on the dashboard — the same
 * session that lets them type /dashboard into the address bar. Everyone else
 * sees the destination appropriate to the button: login or registration.
 *
 * The auth store only initializes inside the guarded area of the app, so the
 * marketing page has to kick it off itself. Until that resolves (a claims
 * round-trip) the link points at the requested unauthenticated destination.
 */

import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'

// Several CTAs render on one page; the store must not be initialized four
// times over (each initialize() also registers an auth listener).
let initStarted = false

export function AppEntryLink({
  className,
  children,
  prefetch,
  signedOutHref = '/login',
}: {
  className?: string
  children: ReactNode
  prefetch?: boolean
  signedOutHref?: '/login' | '/register'
}) {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore()

  useEffect(() => {
    if (isInitialized || initStarted) return
    initStarted = true
    // Off the synchronous path: initialize() flips store state immediately,
    // and that does not belong inside the effect body itself.
    void Promise.resolve().then(() => initialize())
  }, [isInitialized, initialize])

  return (
    <Link href={isAuthenticated ? '/dashboard' : signedOutHref} className={className} prefetch={prefetch}>
      {children}
    </Link>
  )
}
