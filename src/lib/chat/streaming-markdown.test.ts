import { describe, expect, it } from 'vitest'

import { streamingMarkdown } from './streaming-markdown'

describe('streamingMarkdown', () => {
  it('closes emphasis that is still open', () => {
    expect(streamingMarkdown('Das ist **wich')).toBe('Das ist **wich**')
  })

  it('holds back a source marker until its bracket closes', () => {
    expect(streamingMarkdown('Der Preis liegt bei 19 € [1')).toBe('Der Preis liegt bei 19 €')
    expect(streamingMarkdown('Belegt [1, ')).toBe('Belegt')
    expect(streamingMarkdown('Belegt [1].')).toBe('Belegt [1].')
  })

  it('shows an unfinished link as its text', () => {
    expect(streamingMarkdown('Siehe [Anleitung](https://ex')).not.toContain('](')
  })
})
