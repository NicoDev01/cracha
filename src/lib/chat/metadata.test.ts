import { describe, expect, it } from 'vitest'

import { answerMetaParts, formatDuration, formatModel } from './metadata'

describe('formatModel', () => {
  it('drops the routing prefix from a Workers AI id', () => {
    // The regex used to require a word character first, so `@cf/` survived and
    // the whole path reached the reader.
    expect(formatModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'))
      .toBe('llama-3.3-70b-instruct-fp8-fast')
  })

  it('drops the vendor prefix but keeps the rest of the line', () => {
    expect(formatModel('google/gemini-3.5-flash + Cloudflare AI Search'))
      .toBe('gemini-3.5-flash + Cloudflare AI Search')
  })

  it('says in words that the standby model answered', () => {
    expect(formatModel('@cf/meta/llama-3.3-70b (fallback: primary-model-error)'))
      .toBe('llama-3.3-70b (Ersatzmodell)')
  })

  it('leaves a plain model name untouched', () => {
    expect(formatModel('gemini-3.5-flash')).toBe('gemini-3.5-flash')
  })
})

describe('formatDuration', () => {
  it('reports sub-second work in milliseconds', () => {
    expect(formatDuration(842.4)).toBe('842 ms')
  })

  it('switches to seconds with a German decimal comma', () => {
    expect(formatDuration(18_800)).toBe('18,8 s')
  })
})

describe('answerMetaParts', () => {
  const metadata = {
    query_time: 18_800,
    retrieval_time: 11_600,
    tokens_used: 0,
    model_used: 'google/gemini-3.5-flash + Cloudflare AI Search',
  }

  it('names the model, the split timing and the source count', () => {
    expect(answerMetaParts(metadata, 12)).toEqual([
      'gemini-3.5-flash + Cloudflare AI Search',
      '18,8 s (davon 11,6 s Suche)',
      '12 Quellen',
    ])
  })

  it('reports a single source in the singular', () => {
    expect(answerMetaParts(metadata, 1)[2]).toBe('1 Quelle')
  })

  it('omits the count when nothing was retrieved', () => {
    expect(answerMetaParts(metadata, 0)).toHaveLength(2)
  })

  it('leaves out the search share when it was not measured', () => {
    expect(answerMetaParts({ ...metadata, retrieval_time: undefined }, 3)[1]).toBe('18,8 s')
  })

  it('stays empty until the answer is timed', () => {
    expect(answerMetaParts({ ...metadata, query_time: 0 }, 3)).toEqual([])
    expect(answerMetaParts(undefined, 3)).toEqual([])
  })
})
