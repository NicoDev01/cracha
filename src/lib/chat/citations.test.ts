import { describe, expect, it } from 'vitest'

import { collapseRepeatedCitations, getCitedSources, getUncitedSources } from './citations'
import type { Source } from '@/types/chat'

const sources = (count: number): Source[] => Array.from({ length: count }, (_, index) => ({
  id: `source-${index + 1}`,
  title: `Seite ${index + 1}`,
  url: `https://example.com/${index + 1}`,
  snippet: '',
  relevance_score: 1,
}))

describe('getUncitedSources', () => {
  it('returns the retrieved sources the answer left out', () => {
    const all = sources(4)
    const cited = getCitedSources('Laut [2] und [4] gilt das.', all)

    expect(getUncitedSources(all, cited).map((entry) => entry.index)).toEqual([1, 3])
  })

  it('returns nothing when every source was cited', () => {
    const all = sources(2)
    const cited = getCitedSources('Siehe [1][2].', all)

    expect(getUncitedSources(all, cited)).toEqual([])
  })

  it('lists every source as uncited when the answer cites none', () => {
    const all = sources(3)
    const cited = getCitedSources('Eine Antwort ohne Belegziffern.', all)

    // Nothing is presented as cited that the answer did not cite.
    expect(cited).toEqual([])
    expect(getUncitedSources(all, cited).map((entry) => entry.index)).toEqual([1, 2, 3])
  })

  it('ignores markers that point past the retrieved sources', () => {
    const all = sources(2)

    expect(getCitedSources('Siehe [7].', all)).toEqual([])
    expect(getCitedSources('Siehe [2, 7].', all)).toEqual([{ index: 2, source: all[1] }])
  })

  it('keeps the numbering aligned with the citation markers', () => {
    const all = sources(3)
    const cited = getCitedSources('Nur [3] wird belegt.', all)

    expect(getUncitedSources(all, cited)).toEqual([
      { index: 1, source: all[0] },
      { index: 2, source: all[1] },
    ])
  })
})

describe('collapseRepeatedCitations', () => {
  it('marks a source once per paragraph, at its last mention', () => {
    expect(collapseRepeatedCitations('Erstens gilt das [3]. Zweitens auch [3]. Drittens ebenso [3].'))
      .toBe('Erstens gilt das. Zweitens auch. Drittens ebenso.[3]')
  })

  it('keeps different sources and each list item on its own', () => {
    expect(collapseRepeatedCitations('1. Crawling [3]. Mehr dazu [2][3].\n2. Indexierung [3].'))
      .toBe('1. Crawling. Mehr dazu.[2][3]\n2. Indexierung.[3]')
  })

  it('keeps the other source of a combined marker', () => {
    expect(collapseRepeatedCitations('A [1, 2]. B [2].')).toBe('A.[1] B.[2]')
  })

  it('leaves code blocks alone', () => {
    const code = '```js\nx[1]; y[1]\n```'
    expect(collapseRepeatedCitations(code)).toBe(code)
  })
})
