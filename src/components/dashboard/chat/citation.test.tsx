// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { linkifyCitations } from '@/lib/chat/citations'
import type { Source } from '@/types/chat'
import { CitationLink, CitationSources } from './citation'

const sources: Source[] = [{
  id: 'c1',
  title: 'AnimationMixer | three.js docs',
  url: 'https://threejs.org/docs/pages/AnimationMixer.html',
  snippet: 'The AnimationMixer is a player for animations on a particular object in the scene.',
  relevance_score: 1,
}]

describe('citation markers', () => {
  it('name their page and open it at the cited passage', () => {
    render(
      <CitationSources.Provider value={{ sources }}>
        <CitationLink index={1} href={/\]\((.*)\)$/.exec(linkifyCitations('[1]', sources))![1]}>[1]</CitationLink>
      </CitationSources.Provider>,
    )
    const marker = screen.getByRole('link', { name: 'Quelle 1: AnimationMixer' })
    expect(marker.getAttribute('href')).toBe('https://threejs.org/docs/pages/AnimationMixer.html#:~:text=The%20AnimationMixer%20is%20a%20player%20for%20animations')
    expect(marker.textContent).toBe('1')
  })
})
