'use client'

import { useEffect } from 'react'

/**
 * Holds a page to the light theme for as long as it is on screen.
 *
 * Everything around signing in — the sign-in card, registration, the
 * confirmation link's landing page, the password reset — is one light surface
 * by design. There is no dark version of it and never was: the inputs are white
 * cards on a pale gradient.
 *
 * The theme class sits on <html>, so arriving from the dark site dragged it
 * along and those inputs rendered their dark variant. The inline script in the
 * root layout already handles a direct load; this handles arriving by
 * client-side navigation, where that script does not run again, and puts the
 * class back on the way out so the rest of the site is unaffected.
 */
export function useLightOnly(): void {
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.remove('dark')
    return () => {
      if (wasDark) root.classList.add('dark')
    }
  }, [])
}

/** The same thing for pages that are server components and cannot call a hook. */
export function LightOnly(): null {
  useLightOnly()
  return null
}
