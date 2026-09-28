import { describe, expect, it } from 'vitest'

import { cleanSnippet, cleanSourceTitle, passageLink, passagePhrase, sourceHosts, sourceLocation } from './source-display'

describe('passage links', () => {
  const snippet = '# AnimationMixer | three.js docs\n\nQuelle: https://threejs.org/docs/pages/AnimationMixer.html\n\nThe **AnimationMixer** is a player for animations on a particular object in the scene. When multiple objects are animated indepen'

  it('takes the first rendered sentence, skipping the lines the indexer added', () => {
    expect(passagePhrase(snippet)).toBe('The AnimationMixer is a player for animations')
  })

  it('reduces markdown links and list markers to their text', () => {
    expect(passagePhrase('- Siehe [die Preisliste](https://x.de/preise) für alle Tarife und Laufzeiten')).toBe('Siehe die Preisliste für alle Tarife und')
  })

  it('finds nothing in a snippet without a full line of prose', () => {
    expect(passagePhrase('| Tarif | Preis |\n| --- | --- |')).toBeNull()
    expect(passageLink('https://x.de/a', 'zu kurz')).toBe('https://x.de/a')
  })

  it('appends a text fragment the browser can highlight', () => {
    expect(passageLink('https://threejs.org/docs/', 'Pre-built helpers make it easy to start quickly today'))
      .toBe('https://threejs.org/docs/#:~:text=Pre%2Dbuilt%20helpers%20make%20it%20easy%20to%20start')
    expect(passageLink('https://x.de/a#b', 'eins zwei drei vier fünf sechs sieben')).toMatch(/^https:\/\/x\.de\/a#b:~:text=/)
  })
})

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
