import { describe, expect, it } from 'vitest'

import { groundListEntry, paddedBlockText, type ContextBlock, type GroundingBlock } from './generation'

const teamPage: GroundingBlock = {
  n: 1,
  paddedText: paddedBlockText(
    '# Unser Team\n\nStephan Müller\nDirk Borchers\nKlaus Becker\nMark Hapke-Reichardt\nBen Mahrenholz\nChristiane Niebuhr-Redder',
  ),
}
const detailPage: GroundingBlock = {
  n: 4,
  paddedText: paddedBlockText('Klaus Becker ist seit 2011 bei Webmen und leitet die Entwicklung.'),
}
const blocks = [teamPage, detailPage]

describe('collection page restriction', () => {
  const overview: ContextBlock = {
    n: 1,
    title: 'Unser Team',
    url: 'https://www.webmen.de/agentur-bremen/team',
    text: 'Stephan Müller\nKlaus Becker\nFabian Holler',
    collection: true,
  }
  const blogPost: ContextBlock = {
    n: 2,
    title: 'Über Webmen',
    url: 'https://www.webmen.de/blog/ueber-webmen',
    text: 'Lena Fellner hat den Beitrag verfasst. Auch Klaus Becker kommt vor.',
  }

  function ground(line: string, context: ContextBlock[]): string | null {
    const collection = context.filter((block) => block.collection)
    const scope = (collection.length ? collection : context)
      .map((block) => ({ n: block.n, paddedText: paddedBlockText(block.text) }))
    return groundListEntry(line, scope)
  }

  it('drops entries that only appear outside the collection page', () => {
    // Production listed Lena Fellner and Sonja Ahrens as team members.
    expect(ground('- Lena Fellner [2]', [overview, blogPost])).toBeNull()
  })

  it('keeps collection entries and points their citation at the overview', () => {
    expect(ground('- Fabian Holler [8]', [overview, blogPost])).toBe('- Fabian Holler [1]')
    expect(ground('- Klaus Becker [2]', [overview, blogPost])).toBe('- Klaus Becker [1]')
  })

  it('uses every block when no collection page was identified', () => {
    expect(ground('- Lena Fellner [2]', [blogPost])).toBe('- Lena Fellner [2]')
  })
})

describe('list entry grounding', () => {
  it('keeps an entry whose citation already points at a supporting source', () => {
    expect(groundListEntry('- Stephan Müller [1]', blocks)).toBe('- Stephan Müller [1]')
  })

  it('repairs a citation that points at the wrong source', () => {
    // Production showed "Juliane [6]" resolving to Klaus Becker's page.
    expect(groundListEntry('- Christiane Niebuhr-Redder [4]', blocks))
      .toBe('- Christiane Niebuhr-Redder [1]')
  })

  it('drops an entry that no source mentions', () => {
    expect(groundListEntry('- Jessica Breier [3]', blocks)).toBeNull()
    expect(groundListEntry('- Juliane [6]', blocks)).toBeNull()
  })

  it('tolerates honorifics and spelling variants on either side', () => {
    expect(groundListEntry('- Dr. Klaus Becker [1]', blocks)).toBe('- Dr. Klaus Becker [1]')
    // Hyphen and umlaut normalisation must not cause a false deletion.
    expect(groundListEntry('- Mark Hapke Reichardt [1]', blocks)).toBe('- Mark Hapke Reichardt [1]')
    expect(groundListEntry('- Stephan Mueller [1]', blocks)).toBe('- Stephan Mueller [1]')
  })

  it('matches whole words only', () => {
    // "Ben" must not be considered supported by "bei Webmen" or "leitet".
    expect(groundListEntry('- Ben Mahrenholz [1]', [detailPage])).toBeNull()
    expect(groundListEntry('- Ben Mahrenholz [1]', blocks)).toBe('- Ben Mahrenholz [1]')
  })

  it('keeps roles and descriptions attached to a supported entry', () => {
    expect(groundListEntry('- Klaus Becker — Leiter Entwicklung [9]', blocks))
      .toBe('- Klaus Becker — Leiter Entwicklung [1]')
  })

  it('leaves prose, headings and unlisted lines untouched', () => {
    expect(groundListEntry('Das Team besteht aus folgenden Mitgliedern:', blocks))
      .toBe('Das Team besteht aus folgenden Mitgliedern:')
    expect(groundListEntry('## Team', blocks)).toBe('## Team')
    expect(groundListEntry('', blocks)).toBe('')
  })

  it('never deletes anything when no context blocks were supplied', () => {
    expect(groundListEntry('- Irgendwer [1]', [])).toBe('- Irgendwer [1]')
  })

  it('handles numbered lists', () => {
    expect(groundListEntry('1. Dirk Borchers [7]', blocks)).toBe('1. Dirk Borchers [1]')
  })
})
