import { describe, expect, it } from 'vitest'

import { isSessionFreePath } from './public-pages'

describe('isSessionFreePath', () => {
  it('skips the session check on the prerendered marketing pages', () => {
    expect(isSessionFreePath('/')).toBe(true)
    expect(isSessionFreePath('/beispiele')).toBe(true)
    expect(isSessionFreePath('/datenschutz')).toBe(true)
    expect(isSessionFreePath('/preise')).toBe(true)
    expect(isSessionFreePath('/blog')).toBe(true)
    expect(isSessionFreePath('/blog/cracha-vs-notebooklm')).toBe(true)
  })

  it('keeps it everywhere a session can matter', () => {
    for (const path of ['/dashboard', '/dashboard/chat', '/login', '/auth/callback', '/api/chat', '/confirm', '/beispiele/x', '/blog/unbekannt']) {
      expect(isSessionFreePath(path)).toBe(false)
    }
  })
})
