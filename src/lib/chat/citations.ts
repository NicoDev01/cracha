import type { Source } from '@/types/chat'
import type { CitationAnchor } from '@/types/chat'
import { fragmentLink, passageLink } from './source-display'

export interface IndexedSource {
  index: number
  source: Source
}

/** The page list of the whole knowledge base, which has no passage to open. */
export function isOutlineSource(source: Pick<Source, 'id'>): boolean {
  return source.id === 'site-outline'
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

/**
 * Turns markers into links. With the anchors of a finished answer, each marker
 * opens its page at the sentence that supports its own line and carries that
 * sentence as the link title, which the chat shows on hover; without them it
 * falls back to the start of the retrieved passage.
 */
export function linkifyCitations(content: string, sources: Source[], anchors?: Record<string, CitationAnchor>): string {
  return content.split('\n').map((line, lineIndex) => line.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (original, group: string) => {
    const links = group.split(',').map((value) => {
      const index = Number(value.trim())
      const source = sources[index - 1]
      if (!source) return `[${index}]`

      try {
        const url = new URL(source.url)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return `[${index}]`
        const base = encodeURI(url.toString()).replace(/\(/g, '%28').replace(/\)/g, '%29')
        if (isOutlineSource(source)) return `[[${index}]](${base})`
        const anchor = anchors?.[`${lineIndex}:${index}`]
        const href = anchor ? fragmentLink(base, anchor.phrase) : passageLink(base, source.snippet)
        const title = anchor ? ` "${anchor.quote.replace(/["\\\n]/g, ' ')}"` : ''
        return `[[${index}]](${href}${title})`
      } catch {
        return `[${index}]`
      }
    })
    return links.length > 0 ? links.join(' ') : original
  })).join('\n')
}

const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s+/u
const SOLE_TRAILING_MARKER = /^(.*?)\s*\[(\d+)\]([.,;:!?]?)\s*$/u

/**
 * A list whose every entry cites the same single page, 33 names each followed
 * by the same [2], reads as noise and says nothing an introducing marker would
 * not. From three entries on, the marker moves to the sentence that introduces
 * the list — or stays on the first entry when a heading introduces it.
 */
function collapseUniformLists(lines: string[]): string[] {
  const result = [...lines]
  let start = 0
  while (start < result.length) {
    if (!LIST_LINE.test(result[start])) { start += 1; continue }
    let end = start
    const entries: number[] = []
    while (end < result.length && (LIST_LINE.test(result[end]) || (!result[end].trim() && LIST_LINE.test(result[end + 1] ?? '')))) {
      if (result[end].trim()) entries.push(end)
      end += 1
    }
    const markers = entries.map((index) => {
      const match = SOLE_TRAILING_MARKER.exec(result[index])
      return match && !/\[\d/.test(match[1]) ? match[2] : null
    })
    if (entries.length >= 3 && markers[0] && markers.every((marker) => marker === markers[0])) {
      const marker = `[${markers[0]}]`
      let intro = start - 1
      while (intro >= 0 && !result[intro].trim()) intro -= 1
      const introLine = intro >= 0 ? result[intro] : ''
      const introIsProse = introLine.trim() && !/^\s*#/.test(introLine) && !LIST_LINE.test(introLine)
      entries.forEach((index, position) => {
        if (!introIsProse && position === 0) return
        result[index] = result[index].replace(SOLE_TRAILING_MARKER, '$1$3')
      })
      if (introIsProse && !introLine.includes(marker)) result[intro] = `${introLine.trimEnd()} ${marker}`
    }
    start = end
  }
  return result
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
  return collapseUniformLists(content.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    return collapseLine(line).replace(MARKERS_BEFORE_PUNCTUATION, '$2$1')
  })).join('\n')
}
