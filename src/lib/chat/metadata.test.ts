import { describe, expect, it } from 'vitest'

import { answerMetaParts, fallbackNotice, formatDuration, formatModel } from './metadata'

describe('formatModel', () => {
  it('drops the routing prefix from a Workers AI id', () => {
    // The regex used to require a word character first, so `@cf/` survived and
    // the whole path reached the reader.
    expect(formatModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast')).toBe('Llama 3.3 70B')
  })

  it('names the platform model the way its vendor does', () => {
    expect(formatModel('@cf/meta/llama-4-scout-17b-16e-instruct')).toBe('Llama 4 Scout')
  })

  it('drops the vendor prefix and names Gemini models readably', () => {
    expect(formatModel('google/gemini-3.5-flash-lite')).toBe('Gemini 3.5 Flash-Lite')
    expect(formatModel('gemini-3.8-flash')).toBe('Gemini 3.8 Flash')
    expect(formatModel('gemini-3.1-pro-preview')).toBe('Gemini 3.1 Pro Preview')
  })

  it('leaves a name it was never meant to carry alone', () => {
    // The search service is not composed into the label any more. A formatter
    // that strips it by name only knows the spellings it was told about, and
    // the standalone one -- what a question with no relevant sources reported
    // -- was not among them.
    expect(formatModel('Cloudflare AI Search')).toBe('Cloudflare AI Search')
  })

  it('leaves an unknown model id untouched', () => {
    expect(formatModel('@cf/qwen/qwen3.8-27b')).toBe('qwen3.8-27b')
  })
})

describe('fallbackNotice', () => {
  it('tells the reader what to do about their own key', () => {
    expect(fallbackNotice('byok_rejected')).toContain('API-Key wurde abgelehnt')
    expect(fallbackNotice('byok_quota')).toContain('Kontingent')
  })

  it('still says something when an older answer carries no reason', () => {
    expect(fallbackNotice(undefined)).toContain('Standardmodell')
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
    model_used: 'google/gemini-3.5-flash-lite',
  }

  it('leaves the model out when none ran', () => {
    // The no-relevant-sources answer names no model. An empty part would show
    // up as a stray separator in the line under the answer.
    expect(answerMetaParts({ ...metadata, model_used: '' }, 0)).toEqual([
      '18,8 s (davon 11,6 s Suche)',
    ])
  })

  it('names the model, the split timing and the source count', () => {
    expect(answerMetaParts(metadata, 12)).toEqual([
      'Gemini 3.5 Flash-Lite',
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

  it('says the search was reused instead of reporting a search time', () => {
    // 4 ms is the cache read, not a retrieval. Printing it as "davon 4 ms Suche"
    // would read as a retrieval that got 2900x faster.
    expect(answerMetaParts({ ...metadata, query_time: 7_200, retrieval_time: 4, retrieval_cached: true }, 3)[1])
      .toBe('7,2 s (Suche zwischengespeichert)')
  })

  it('stays empty until the answer is timed', () => {
    expect(answerMetaParts({ ...metadata, query_time: 0 }, 3)).toEqual([])
    expect(answerMetaParts(undefined, 3)).toEqual([])
  })
})
