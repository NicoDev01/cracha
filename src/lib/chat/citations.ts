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

export function getCitedSources(content: string, sources: Source[], fallbackToAll = true): IndexedSource[] {
  const citationNumbers = getCitationNumbers(content, sources.length)
  const selected = citationNumbers.length > 0
    ? citationNumbers
    : fallbackToAll ? sources.map((_, index) => index + 1) : []
  return selected.map((index) => ({ index, source: sources[index - 1] }))
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
