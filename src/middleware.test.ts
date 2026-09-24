import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { legacyHostRedirect } from './middleware'

const onHost = (host: string, path: string) =>
  new NextRequest(`https://${host}${path}`, { headers: { host } })

describe('legacyHostRedirect', () => {
  it('moves every page of the workers.dev host to the real domain', () => {
    for (const path of ['/', '/preise', '/blog/cracha-vs-notebooklm?utm_source=x']) {
      const response = legacyHostRedirect(onHost('cracha.aimpact-agency.workers.dev', path))
      expect(response?.status).toBe(308)
      expect(response?.headers.get('location')).toBe(`https://cracha-app.com${path}`)
    }
  })

  it('leaves the API and the real domain alone', () => {
    expect(legacyHostRedirect(onHost('cracha.aimpact-agency.workers.dev', '/api/internal/crawl-settlement'))).toBeNull()
    expect(legacyHostRedirect(onHost('cracha-app.com', '/preise'))).toBeNull()
  })
})
