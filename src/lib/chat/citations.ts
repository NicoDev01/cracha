import type { Source } from '@/types/chat'

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
        return `[[${index}]](${href})`
      } catch {
        return `[${index}]`
      }
    })
    return links.length > 0 ? links.join(' ') : original
  })
}
