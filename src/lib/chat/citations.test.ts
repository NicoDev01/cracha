import { describe, expect, it } from 'vitest'

import { getCitedSources, getUncitedSources } from './citations'
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
