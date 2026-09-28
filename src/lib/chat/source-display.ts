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
  const name = first && first.trim().length >= 3 ? first.trim() : trimmed
  // "… für SEO -" is what is left when a site's name was cut off its title.
  return name.replace(/\s+[-–—|:·]\s*$/u, '')
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
    // Table rules and the skip link a crawled page starts with.
    .replace(/(^|\s)-{3,}(?=\s|$)/g, ' ')
    .replace(/^\s*(Zum Inhalt springen|Skip to (main )?content)/iu, '')
    .replace(/\[(\d+)\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) return text
  // Cut at a word, not inside one: "Socia" and "Mob" ended rows of the list.
  const cut = text.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/u, '')}…`
}

const PASSAGE_WORDS = 7
const PASSAGE_MIN_WORDS = 5

/**
 * A short run of words the source page shows verbatim, taken from the passage
 * the answer was written from. Lines the indexer added, tables and code are
 * skipped, and markdown is reduced to the text a browser renders.
 */
export function passagePhrase(snippet: string): string | null {
  for (const raw of snippet.split('\n')) {
    if (/^\s*(#{1,6}\s|Quelle:\s|>|\||```|~~~|- \/)/u.test(raw)) continue
    const text = raw
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/u, '')
      .replace(/[*_`]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const words = text.split(' ').filter(Boolean)
    // Both ends of a snippet may be cut mid-word; a phrase from its start is
    // only cut at its own end, which the slice leaves out.
    if (words.length < PASSAGE_MIN_WORDS + 1) continue
    return words.slice(0, Math.min(PASSAGE_WORDS, words.length - 1)).join(' ')
  }
  return null
}

/**
 * The source URL with a text fragment (`#:~:text=`), so opening a citation
 * scrolls to and highlights the passage the answer drew on. Chrome, Edge and
 * Safari support it; elsewhere, or if the page changed since the crawl, the
 * page simply opens at the top.
 */
export function passageLink(url: string, snippet: string): string {
  const phrase = passagePhrase(snippet)
  return phrase ? fragmentLink(url, phrase) : url
}

/** `url#:~:text=<phrase>`, with the characters the directive reserves escaped. */
export function fragmentLink(url: string, phrase: string): string {
  // The spec reserves `-`, `,` and `&` inside a directive.
  const encoded = encodeURIComponent(phrase).replace(/-/g, '%2D').replace(/[()]/g, (c) => (c === '(' ? '%28' : '%29'))
  return `${url}${url.includes('#') ? '' : '#'}:~:text=${encoded}`
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
