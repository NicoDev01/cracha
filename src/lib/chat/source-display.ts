/**
 * How a retrieved page is named in the source list.
 *
 * Page titles carry the site's branding ("… | Google Search Central |
 * Documentation | Google for Developers") and the URL path is the page's
 * address, not a description of it. Both were printed raw, one under the
 * other, and a list of eight read as a wall of repeated site names and slashes.
 */

/** Separators sites put between the page name and their own name. A plain
 *  hyphen is not one of them: "Schritt 1 - Installation" is a single title. */
const TITLE_SEPARATOR = /\s+[|–—·•»]\s+/u

export function cleanSourceTitle(title: string, url: string): string {
  const trimmed = title.trim()
  if (!trimmed || trimmed === url) return titleFromUrl(url)
  const [first] = trimmed.split(TITLE_SEPARATOR)
  // "FAQ | Firma" keeps "FAQ"; a two-letter fragment is kept whole instead.
  return first && first.trim().length >= 3 ? first.trim() : trimmed
}

function pathSegments(url: URL): string[] {
  return url.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })
    .map((segment) => segment.replace(/\.(html?|php|aspx?|md)$/i, ''))
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const last = pathSegments(parsed).at(-1)
    if (!last) return parsed.hostname.replace(/^www\./, '')
    const words = last.replace(/[-_]+/g, ' ').trim()
    return words ? `${words[0].toUpperCase()}${words.slice(1)}` : parsed.hostname
  } catch {
    return url
  }
}

/**
 * Where the page sits: `developers.google.com › search › docs › fundamentals`.
 * The last segment is left out, because the title already names the page; a
 * deep path keeps its first and last section around an ellipsis.
 */
export function sourceLocation(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const sections = pathSegments(parsed).slice(0, -1)
    const shown = sections.length > 3 ? [sections[0], '…', ...sections.slice(-2)] : sections
    return [host, ...shown].join(' › ')
  } catch {
    return url
  }
}

/**
 * The retrieved text begins with the lines the indexer adds — the page title,
 * "Quelle: <url>" and section breadcrumbs — which say nothing the row does not.
 */
export function cleanSnippet(snippet: string, maxLength = 220): string {
  const text = snippet
    .split('\n')
    .filter((line) => !/^\s*(#{1,6}\s|Quelle:\s|>\s.*›)/u.test(line))
    .join(' ')
    .replace(/[*_`#>|]+/g, ' ')
    .replace(/\[(\d+)\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}

/** Up to two distinct sites, for the collapsed source list. */
export function sourceHosts(urls: string[]): { shown: string[]; more: number } {
  const hosts = [...new Set(urls.map((url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }).filter(Boolean))]
  return { shown: hosts.slice(0, 2), more: Math.max(0, hosts.length - 2) }
}
