import type { Source } from '@/types/chat'
import { cleanSourceTitle } from './source-display'

export interface IndexedSource {
  index: number
  source: Source
}

export function getCitationNumbers(content: string, sourceCount: number): number[] {
  const numbers = Array.from(content.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g))
    .flatMap((match) => match[1].split(',').map((value) => Number(value.trim())))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= sourceCount)
  return [...new Set(numbers)]
}

/**
 * The sources the answer actually cites, in citation order. An answer without
 * markers cites nothing: presenting every retrieved source as "used" would
 * claim support the answer never showed. Those sources remain visible through
 * `getUncitedSources` as searched, not cited.
 */
export function getCitedSources(content: string, sources: Source[]): IndexedSource[] {
  return getCitationNumbers(content, sources.length)
    .map((index) => ({ index, source: sources[index - 1] }))
}

/**
 * The sources retrieval returned that the answer never cited. Showing them keeps
 * the retrieval honest: the reader sees what was searched, not only what was used.
 */
export function getUncitedSources(sources: Source[], cited: IndexedSource[]): IndexedSource[] {
  const used = new Set(cited.map((entry) => entry.index))
  return sources
    .map((source, index) => ({ index: index + 1, source }))
    .filter((entry) => !used.has(entry.index))
}

export function linkifyCitations(content: string, sources: Source[]): string {
  return content.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (original, group: string) => {
    const links = group.split(',').map((value) => {
      const index = Number(value.trim())
      const source = sources[index - 1]
      if (!source) return `[${index}]`

      try {
        const url = new URL(source.url)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return `[${index}]`
        const href = encodeURI(url.toString()).replace(/\(/g, '%28').replace(/\)/g, '%29')
        // The marker alone says nothing until clicked; the title is its tooltip.
        const title = cleanSourceTitle(source.title, source.url).replace(/["\\]/g, '')
        return `[[${index}]](${href} "${title}")`
      } catch {
        return `[${index}]`
      }
    })
    return links.length > 0 ? links.join(' ') : original
  })
}

const CITATION_GROUP = /(\s*)\[(\d+(?:\s*,\s*\d+)*)\]/g
/** "Sitemaps [3]." left the full stop hanging after the marker's chip. */
const MARKERS_BEFORE_PUNCTUATION = /\s*((?:\[\d+(?:\s*,\s*\d+)*\])+)([.,;:!?])(?=\s|$)/g

function collapseLine(line: string): string {
  const groups = [...line.matchAll(CITATION_GROUP)].map((match) => match[2].split(',').map((value) => Number(value.trim())))
  if (groups.length < 2) return line
  const lastGroup = new Map<number, number>()
  groups.forEach((numbers, index) => numbers.forEach((number) => lastGroup.set(number, index)))
  let index = -1
  return line.replace(CITATION_GROUP, (_whole, space: string) => {
    index += 1
    const kept = groups[index].filter((number) => lastGroup.get(number) === index)
    return kept.length ? `${space}[${kept.join(', ')}]` : ''
  })
}

/**
 * A model told to cite every claim cites every sentence, so a paragraph drawn
 * from one page read "… [3]. … [3]. … [3]." Within a paragraph or list item a
 * source is marked once, at its last mention; a marker that carried another
 * source as well keeps that one. Markers move behind the sentence's
 * punctuation. Code blocks are left alone.
 */
export function collapseRepeatedCitations(content: string): string {
  let inFence = false
  return content.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    return collapseLine(line).replace(MARKERS_BEFORE_PUNCTUATION, '$2$1')
  }).join('\n')
}
