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
 *
 * The store pulls in the whole Supabase client, a fifth of the landing
 * page's JavaScript, and most visitors have never signed in. A session lives
 * in `sb-<project>-auth-token` cookies (split into `.0`, `.1`, … when large),
 * so without one there is nobody to recognise and the store is never loaded.
 */

import Link from 'next/link'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'

const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/

let signedIn = false
const listeners = new Set<() => void>()
// Several CTAs render on one page; the store must not be initialized four
// times over (each initialize() also registers an auth listener).
let watching = false

function watchSession() {
  // Checked on every mount rather than once: a visitor who first arrives
  // signed out can sign in and navigate back here without a reload.
  if (watching || !SESSION_COOKIE.test(document.cookie)) return
  watching = true
  import('@/stores/auth-store').then(
    ({ useAuthStore }) => {
      const sync = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
        if (isAuthenticated === signedIn) return
        signedIn = isAuthenticated
        listeners.forEach((listener) => listener())
      }
      useAuthStore.subscribe(sync)
      sync(useAuthStore.getState())
      const { isInitialized, initialize } = useAuthStore.getState()
      if (!isInitialized) void initialize()
    },
    (error: unknown) => {
      // A chunk that failed to load (flaky network, a deploy in between) must
      // not keep every link on the signed-out target for the rest of the
      // visit: the next mount tries again.
      watching = false
      console.warn('Could not load the session check:', error)
    },
  )
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

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
  const isAuthenticated = useSyncExternalStore(subscribe, () => signedIn, () => false)

  useEffect(watchSession, [])

  return (
    <Link href={isAuthenticated ? '/dashboard' : signedOutHref} className={className} prefetch={prefetch}>
      {children}
    </Link>
  )
}
