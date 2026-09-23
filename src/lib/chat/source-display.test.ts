import { describe, expect, it } from 'vitest'

import { cleanSnippet, cleanSourceTitle, sourceHosts, sourceLocation } from './source-display'

describe('cleanSourceTitle', () => {
  it('drops the branding a site appends to every title', () => {
    expect(cleanSourceTitle(
      'SEO-Leitfaden für Einsteiger | Google Search Central | Documentation | Google for Developers',
      'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
    )).toBe('SEO-Leitfaden für Einsteiger')
    expect(cleanSourceTitle('Preise – Webmen', 'https://webmen.de/preise')).toBe('Preise')
  })

  it('keeps a hyphen inside a title', () => {
    expect(cleanSourceTitle('Schritt 1 - Installation', 'https://ex.com/a')).toBe('Schritt 1 - Installation')
  })

  it('keeps a title whose first part is too short to stand alone', () => {
    expect(cleanSourceTitle('AI | Lexikon', 'https://ex.com/ai')).toBe('AI | Lexikon')
  })

  it('names a page that had only its URL as title', () => {
    expect(cleanSourceTitle('https://ex.com/docs/getting-started', 'https://ex.com/docs/getting-started')).toBe('Getting started')
    expect(cleanSourceTitle('', 'https://www.ex.com/')).toBe('ex.com')
  })
})

describe('sourceLocation', () => {
  it('shows the site and the sections above the page', () => {
    expect(sourceLocation('https://developers.google.com/search/docs/fundamentals/seo-starter-guide'))
      .toBe('developers.google.com › search › docs › fundamentals')
  })

  it('shortens a deep path around an ellipsis', () => {
    expect(sourceLocation('https://www.ex.com/a/b/c/d/e/page.html')).toBe('ex.com › a › … › d › e')
  })

  it('shows only the site for a top-level page', () => {
    expect(sourceLocation('https://www.webmen.de/team')).toBe('webmen.de')
  })
})

describe('cleanSnippet', () => {
  it('removes the lines the indexer adds', () => {
    expect(cleanSnippet('# Preise\n\nQuelle: https://ex.com/preise\n\n> Preise › Tarife\n## Tarife\nDer **Basis**-Tarif kostet 19 €.'))
      .toBe('Der Basis -Tarif kostet 19 €.')
  })

  it('cuts long text with an ellipsis', () => {
    expect(cleanSnippet('a'.repeat(300), 10)).toBe(`${'a'.repeat(9)}…`)
  })
})

describe('sourceHosts', () => {
  it('names up to two sites and counts the rest', () => {
    expect(sourceHosts(['https://a.com/x', 'https://www.a.com/y', 'https://b.com', 'https://c.com'])).toEqual({ shown: ['a.com', 'b.com'], more: 1 })
  })
})
