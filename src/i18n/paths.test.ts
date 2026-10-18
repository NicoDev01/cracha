import { describe, expect, it } from 'vitest'

import { delocalizePath, languageAlternates, localizePath, switchLocalePath } from './paths'
import { localeFromRequest } from './request-locale'

describe('localizePath', () => {
  it('keeps German paths and translates English ones', () => {
    expect(localizePath('/preise', 'de')).toBe('/preise')
    expect(localizePath('/preise', 'en')).toBe('/en/pricing')
    expect(localizePath('/', 'en')).toBe('/en')
    expect(localizePath('/dashboard/chat?wissensbasis=x', 'en')).toBe('/en/dashboard/chat?wissensbasis=x')
    expect(localizePath('/#fragen', 'en')).toBe('/en#fragen')
  })

  it('leaves other hosts, the API and prefixed paths alone', () => {
    expect(localizePath('https://example.com', 'en')).toBe('https://example.com')
    expect(localizePath('/api/credits', 'en')).toBe('/api/credits')
    expect(localizePath('#how-to-use', 'en')).toBe('#how-to-use')
    expect(localizePath('/en/dashboard', 'en')).toBe('/en/dashboard')
    expect(localizePath('/en/dashboard', 'de')).toBe('/en/dashboard')
  })
})

describe('delocalizePath and switchLocalePath', () => {
  it('maps the address bar back to the internal path', () => {
    expect(delocalizePath('/en/pricing')).toEqual({ locale: 'en', path: '/preise' })
    expect(delocalizePath('/en')).toEqual({ locale: 'en', path: '/' })
    expect(delocalizePath('/preise')).toEqual({ locale: 'de', path: '/preise' })
    expect(delocalizePath('/english-blog')).toEqual({ locale: 'de', path: '/english-blog' })
  })

  it('switches to the same page in the other language', () => {
    expect(switchLocalePath('/preise', 'en')).toBe('/en/pricing')
    expect(switchLocalePath('/en/legal-notice', 'de')).toBe('/impressum')
    expect(switchLocalePath('/en/blog/cracha-vs-notebooklm', 'de')).toBe('/blog/cracha-vs-notebooklm')
  })

  it('lists both languages and x-default for hreflang', () => {
    expect(languageAlternates('/beispiele')).toEqual({ de: '/beispiele', en: '/en/examples', 'x-default': '/beispiele' })
  })
})

describe('localeFromRequest', () => {
  const request = (headers: Record<string, string>) => new Request('https://cracha-app.com/api/credits', { headers })

  it('follows the page the call came from', () => {
    expect(localeFromRequest(request({ referer: 'https://cracha-app.com/en/dashboard' }))).toBe('en')
    expect(localeFromRequest(request({ referer: 'https://cracha-app.com/dashboard', 'accept-language': 'en' }))).toBe('de')
  })

  it('falls back to the cookie, then the browser language', () => {
    expect(localeFromRequest(request({ cookie: 'a=1; NEXT_LOCALE=en' }))).toBe('en')
    expect(localeFromRequest(request({ 'accept-language': 'en-US,en;q=0.9' }))).toBe('en')
    expect(localeFromRequest(request({ 'accept-language': 'de-DE' }))).toBe('de')
    expect(localeFromRequest(request({}))).toBe('de')
  })
})
