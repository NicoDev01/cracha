import { describe, expect, it } from 'vitest'

import {
  groundListEntries,
  groundListEntry,
  paddedBlockText,
  type ContextBlock,
  type GroundingBlock,
} from './generation'

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
    authoritative: true,
  }
  const blogPost: ContextBlock = {
    n: 2,
    title: 'Über Webmen',
    url: 'https://www.webmen.de/blog/ueber-webmen',
    text: 'Lena Fellner hat den Beitrag verfasst. Auch Klaus Becker kommt vor.',
  }

  // Exercises the production selection rather than a copy of it, so a change
  // in which blocks may reject an entry cannot pass unnoticed.
  async function ground(line: string, context: ContextBlock[]): Promise<string> {
    async function* source() {
      yield line
    }
    let output = ''
    for await (const delta of groundListEntries(source(), context)) output += delta
    return output
  }

  it('drops entries that only appear outside the collection page', async () => {
    // Production listed Lena Fellner and Sonja Ahrens as team members.
    const answer = await ground(
      '- Stephan Müller [1]\n- Lena Fellner [2]\n- Fabian Holler [1]',
      [overview, blogPost],
    )
    expect(answer).toBe('- Stephan Müller [1]\n- Fabian Holler [1]')
  })

  it('keeps collection entries and points their citation at the overview', async () => {
    expect(await ground('- Fabian Holler [8]', [overview, blogPost])).toBe('- Fabian Holler [1]')
    expect(await ground('- Klaus Becker [2]', [overview, blogPost])).toBe('- Klaus Becker [1]')
  })

  it('uses every block when no collection page was identified', async () => {
    expect(await ground('- Lena Fellner [2]', [blogPost])).toBe('- Lena Fellner [2]')
  })

  it('keeps the whole list when every entry would be rejected', async () => {
    // Production answered "zähle alle Mitarbeiter auf" with an intro and no
    // entries: retrieval had chosen an author archive as the set. An answer
    // with a stray name is recoverable, an empty one is not.
    const wrongScope: ContextBlock = {
      n: 1,
      title: 'webmen, Autor auf',
      url: 'https://www.webmen.de/blog/author/webmen',
      text: 'Beiträge von webmen: Relaunch, Barrierefreiheit, Konferenzsysteme.',
      collection: true,
      authoritative: true,
    }
    const answer = await ground(
      'Die Mitarbeiter sind:\n- Stephan Müller [1]\n- Klaus Becker [1]',
      [wrongScope],
    )
    expect(answer).toBe('Die Mitarbeiter sind:\n- Stephan Müller [1]\n- Klaus Becker [1]')
  })

  it('keeps blank lines inside a loose list from splitting the decision', async () => {
    const answer = await ground(
      '- Stephan Müller [1]\n\n- Lena Fellner [2]\n\n- Fabian Holler [1]',
      [overview, blogPost],
    )
    expect(answer).toBe('- Stephan Müller [1]\n\n\n- Fabian Holler [1]')
  })

  it('keeps entries from other pages when the overview was cut short', async () => {
    // The missing entries are missing from the context, not from the site.
    // Deleting them would turn a truncated source into a wrong answer.
    const partial: ContextBlock = { ...overview, truncated: true, authoritative: false }
    expect(await ground('- Lena Fellner [2]', [partial, blogPost])).toBe('- Lena Fellner [2]')
  })

  it('keeps entries when the overview was only guessed from retrieval evidence', async () => {
    const guessed: ContextBlock = { ...overview, authoritative: false }
    expect(await ground('- Lena Fellner [2]', [guessed, blogPost])).toBe('- Lena Fellner [2]')
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
