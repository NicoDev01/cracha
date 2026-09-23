import type { ConversationMessage, Env, IngestPage, Source } from './types'

/** Cloudflare caps custom metadata at five fields per instance, so the schema
 *  is exported for the test that holds us to it. */
export const INSTANCE_CONFIG = {
  index_method: { vector: true, keyword: true },
  hybrid_search_enabled: true,
  embedding_model: '@cf/baai/bge-m3',
  fusion_method: 'rrf' as const,
  // Character trigrams tolerate spelling variants, compounds and identifiers
  // better than the English-oriented Porter stemmer on multilingual websites.
  indexing_options: { keyword_tokenizer: 'trigram' as const },
  retrieval_options: { keyword_match_mode: 'or' as const },
  chunk: true,
  chunk_size: 800,
  chunk_overlap: 15,
  // Filtering happens after multi-retrieval fusion. A global threshold previously
  // removed relevant German chunks whose reranker scores were below 0.1.
  score_threshold: 0,
  max_num_results: 30,
  reranking: false,
  reranking_model: '@cf/baai/bge-reranker-base',
  // Cloudflare allows five custom fields per instance and we declared six, so
  // every new instance was one field over the line. The two that went are the
  // two nothing ever read: `crawled_at` was written on every page and only ever
  // looked at through the record's own `last_crawl`, and `depth` was written as
  // a number the hub analysis then recomputed from the URL itself. Four fields
  // leaves room for a real one later.
  custom_metadata: [
    { field_name: 'url', data_type: 'text' as const },
    { field_name: 'title', data_type: 'text' as const },
    { field_name: 'checksum', data_type: 'text' as const },
    // The date the page states, not the date we fetched it. "Newest release"
    // is unanswerable without it, because every page is crawled at once.
    { field_name: 'published_at', data_type: 'datetime' as const },
  ],
}

/** Key order must not decide equality, so objects are compared sorted. */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(',')}}`
}

/**
 * Compares every field the configuration sets, not a subset: an earlier guard
 * checked only a few and let drift in max_num_results, score_threshold or
 * reranking survive unnoticed.
 */
export function instanceConfigMatches(info: unknown, config: Record<string, unknown>): boolean {
  if (!info || typeof info !== 'object') return false
  const live = info as Record<string, unknown>
  return Object.entries(config).every(([key, value]) => stableJson(live[key]) === stableJson(value))
}

async function configureInstance(instance: AiSearchInstance, id: string): Promise<void> {
  await instance.update({ id, ...INSTANCE_CONFIG })
}

export async function instanceIdFor(databaseId: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(databaseId))
  const hex = [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `kb-${hex.slice(0, 28)}`
}

export async function itemKeyFor(url: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url))
  const hex = [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `page-${hex}.md`
}

export async function ensureInstance(env: Env, databaseId: string): Promise<AiSearchInstance> {
  const id = await instanceIdFor(databaseId)
  const existing = env.AI_SEARCH.get(id)

  try {
    const info = await existing.info()
    // Ingestion calls this once per batch. Rewriting an identical configuration
    // while items are being indexed is at best wasted work against the same
    // API that is doing the indexing.
    if (!instanceConfigMatches(info, INSTANCE_CONFIG)) await configureInstance(existing, id)
    return existing
  } catch {
    try {
      // Provision first, then configure. The beta binding can reject a
      // combined create payload while the instance is not yet visible.
      const created = await env.AI_SEARCH.create({ id })
      let lastInfoError: unknown
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await created.info()
          lastInfoError = undefined
          break
        } catch (error) {
          lastInfoError = error
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
        }
      }
      if (lastInfoError) throw lastInfoError
      await configureInstance(created, id)
      return created
    } catch (createError) {
      // A concurrent ingestion may have created it between info() and create().
      try {
        await existing.info()
        return existing
      } catch {
        throw createError
      }
    }
  }
}

interface IndexedItem {
  checksum: string
  title: string
  status: string
  chunks: number
}

/** 20 x 50 covers the crawler's 500-page ceiling with room to spare. */
const ITEM_SCAN_PAGES = 20

async function indexedItemsByKey(
  items: Pick<AiSearchInstance['items'], 'list'>,
): Promise<Map<string, IndexedItem>> {
  const byKey = new Map<string, IndexedItem>()
  const pageSize = 50
  for (let page = 1; page <= ITEM_SCAN_PAGES; page += 1) {
    const response = await items.list({ page, per_page: pageSize })
    for (const item of response.result) {
      const metadata = item.metadata ?? {}
      byKey.set(item.key, {
        checksum: typeof metadata.checksum === 'string' ? metadata.checksum : '',
        title: typeof metadata.title === 'string' ? metadata.title : '',
        status: item.status,
        chunks: item.chunks_count ?? 0,
      })
    }
    const totalCount = response.result_info?.total_count ?? response.result.length
    if (page * pageSize >= totalCount) break
  }
  return byKey
}

/**
 * Re-embedding a page whose text has not changed cannot improve the index and
 * is what made a re-crawl cost as much as the first one. The checksum covers
 * the markdown and the title is part of the uploaded document, so both must
 * match. An item that never produced chunks is always re-uploaded.
 */
export function needsUpload(page: IngestPage, current: IndexedItem | undefined): boolean {
  if (!current) return true
  if (current.status !== 'completed' || current.chunks < 1) return true
  return current.checksum !== documentChecksum(page) || current.title !== page.title
}

/**
 * The layout of the uploaded document, beyond the page's own markdown. It is
 * part of the stored checksum, so a change to `documentContent` re-uploads
 * every page once on its next crawl instead of leaving old items in the old
 * layout until their text happens to change.
 */
export const DOCUMENT_FORMAT = 'sections-v1'

export function documentChecksum(page: Pick<IngestPage, 'checksum'>): string {
  return `${page.checksum}:${DOCUMENT_FORMAT}`
}

/** Sections shorter than this rarely start a chunk of their own (chunks are
 *  800 tokens, split at paragraphs), so their context line would only add
 *  noise — and on a collection page of short entries, a lot of it. */
const SECTION_CONTEXT_MIN_CHARACTERS = 400
const SECTION_CONTEXT_MAX_PART = 80
const SECTION_CONTEXT_MAX_LINES = 60
const SECTION_CONTEXT_LINE = /^> [^\n]* › [^\n]*$/u
const MARKDOWN_HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/
const MARKDOWN_FENCE = /^[ \t]*(`{3,}|~{3,})/

function contextPart(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > SECTION_CONTEXT_MAX_PART ? `${text.slice(0, SECTION_CONTEXT_MAX_PART - 1)}…` : text
}

/**
 * Put `> Title › Section › Subsection` in front of every H2/H3 section long
 * enough to be chunked on its own.
 *
 * AI Search splits a document into 800-token chunks at paragraph boundaries, so
 * only the first chunk carries the `# Title` line. A later chunk that begins at
 * "## Preise" has lost which page and which product it is about, and neither
 * its embedding nor the model reading it can recover that. The line sits
 * directly above the heading, in the same paragraph, so a split before the
 * heading keeps the two together. Fenced code is left alone.
 */
export function withSectionContext(title: string, markdown: string): string {
  const lines = markdown.split('\n')
  const headings: Array<{ index: number; level: number; text: string }> = []
  let fence: string | null = null
  lines.forEach((line, index) => {
    const marker = MARKDOWN_FENCE.exec(line)?.[1]
    if (marker) {
      if (fence === null) fence = marker[0]
      else if (marker[0] === fence) fence = null
      return
    }
    if (fence !== null) return
    const heading = MARKDOWN_HEADING.exec(line)
    if (heading) headings.push({ index, level: heading[1].length, text: heading[2] })
  })

  const pageTitle = contextPart(title)
  const insertions = new Map<number, string>()
  let section: string | null = null
  for (const [position, heading] of headings.entries()) {
    if (heading.level === 1) section = null
    if (heading.level === 2) section = contextPart(heading.text)
    if (heading.level !== 2 && heading.level !== 3) continue
    if (insertions.size >= SECTION_CONTEXT_MAX_LINES) break
    // The section runs to the next heading of level three or above.
    const end = headings.slice(position + 1).find((next) => next.level <= 3)?.index ?? lines.length
    const body = lines.slice(heading.index + 1, end).join('\n').trim()
    if (body.length < SECTION_CONTEXT_MIN_CHARACTERS) continue
    const parts = [pageTitle]
    if (heading.level === 3 && section) parts.push(section)
    parts.push(contextPart(heading.text))
    const path = parts.filter((part, index) => part && part !== parts[index - 1])
    if (path.length < 2) continue
    insertions.set(heading.index, `> ${path.join(' › ')}`)
  }
  if (!insertions.size) return markdown
  return lines.flatMap((line, index) => {
    const context = insertions.get(index)
    return context ? [context, line] : [line]
  }).join('\n')
}

/** The context lines are for chunks, not for a page read as a whole. */
export function stripSectionContext(text: string): string {
  return text.split('\n').filter((line) => !SECTION_CONTEXT_LINE.test(line)).join('\n')
}

export function documentContent(page: Pick<IngestPage, 'title' | 'url' | 'markdown'>): string {
  return `# ${page.title}\n\nQuelle: ${page.url}\n\n${withSectionContext(page.title, page.markdown.trim())}`
}

/** The listing covers the crawler's 500-page ceiling with room to spare. */
const KNOWN_ITEMS_LIMIT = 1_000

function sanitizeKnownItems(value: unknown): Map<string, IndexedItem> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > KNOWN_ITEMS_LIMIT) return null
  const map = new Map<string, IndexedItem>()
  for (const [key, raw] of entries) {
    if (typeof key !== 'string' || !raw || typeof raw !== 'object') return null
    const item = raw as Partial<IndexedItem>
    if (
      typeof item.checksum !== 'string'
      || typeof item.title !== 'string'
      || typeof item.status !== 'string'
      || typeof item.chunks !== 'number'
      || !Number.isFinite(item.chunks)
    ) return null
    map.set(key, { checksum: item.checksum, title: item.title, status: item.status, chunks: item.chunks })
  }
  return map
}

function knownItemsPayload(map: Map<string, IndexedItem>): Record<string, IndexedItem> {
  const payload: Record<string, IndexedItem> = {}
  for (const [key, item] of map) payload[key] = item
  return payload
}

export async function uploadPages(
  instance: Pick<AiSearchInstance, 'items'>,
  pages: IngestPage[],
  knownItems?: unknown,
  beforeUploadCheck?: () => Promise<void>,
): Promise<{ keys: string[]; known_items: Record<string, IndexedItem> }> {
  // Skipping is an optimisation, never a precondition: if the listing fails,
  // every page is uploaded exactly as before. A crawl's later batches carry
  // the first batch's listing with them, so the scan runs once per job.
  let existing = sanitizeKnownItems(knownItems)
  if (!existing) {
    existing = await indexedItemsByKey(instance.items).catch((error) => {
      console.log(JSON.stringify({
        event: 'item_index_unavailable',
        error: error instanceof Error ? error.message : 'unknown',
      }))
      return new Map<string, IndexedItem>()
    })
  }
  if (beforeUploadCheck) await beforeUploadCheck()
  const results = await Promise.allSettled(
    pages.map(async (page) => {
      const key = await itemKeyFor(page.url)
      if (!needsUpload(page, existing.get(key))) return key
      if (beforeUploadCheck) await beforeUploadCheck()
      const content = documentContent(page)
      // Queue the item instead of holding a Worker request open while the
      // managed embedding/indexing pipeline runs (often longer than 30 s).
      await instance.items.upload(key, content, {
        metadata: {
          url: page.url,
          title: page.title,
          checksum: documentChecksum(page),
          // Absent on pages that state no date. Omitted rather than defaulted,
          // so a missing date can never masquerade as a real one.
          ...(page.published_at ? { published_at: page.published_at } : {}),
        },
      })
      if (beforeUploadCheck) await beforeUploadCheck()
      return key
    }),
  )
  if (beforeUploadCheck) await beforeUploadCheck()
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (rejected) throw rejected.reason
  const keys = results.map(result => (result as PromiseFulfilledResult<string>).value)
  // The map stays the scan-time snapshot: a crawl never sends the same URL in
  // two batches, so nothing here can go stale within one job.
  return { keys, known_items: knownItemsPayload(existing) }
}

/** How many item deletions may be in flight at once. */
const DELETE_WINDOW = 6

export async function deleteStaleItems(
  instance: { items: Pick<AiSearchInstance['items'], 'list' | 'delete'> },
  activeKeys: Set<string>,
  beforeDeleteCheck?: () => Promise<void>,
): Promise<number> {
  const pageSize = 50
  let page = 1
  const staleIds: string[] = []

  while (true) {
    const response = await instance.items.list({ page, per_page: pageSize })
    for (const item of response.result) {
      if (!activeKeys.has(item.key)) staleIds.push(item.id)
    }
    const totalCount = response.result_info?.total_count ?? response.result.length
    if (page * pageSize >= totalCount) break
    page += 1
  }

  if (beforeDeleteCheck) await beforeDeleteCheck()

  // Deletions are independent, so they overlap; one at a time made a large
  // re-crawl pay a round trip per removed page. The window is small on
  // purpose -- a Worker holds six connections open, and firing hundreds of
  // deletes at once trades one slow endpoint for a rate-limited one.
  for (let start = 0; start < staleIds.length; start += DELETE_WINDOW) {
    if (beforeDeleteCheck) await beforeDeleteCheck()
    const results = await Promise.allSettled(
      staleIds.slice(start, start + DELETE_WINDOW).map(async (id) => {
        if (beforeDeleteCheck) await beforeDeleteCheck()
        await instance.items.delete(id)
        if (beforeDeleteCheck) await beforeDeleteCheck()
      }),
    )
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (rejected) throw rejected.reason
  }
  if (beforeDeleteCheck) await beforeDeleteCheck()
  return staleIds.length
}

export async function deleteInstanceIfExists(
  namespace: Pick<AiSearchNamespace, 'list' | 'delete'>,
  instanceId: string,
): Promise<boolean> {
  const response = await namespace.list({ search: instanceId, per_page: 50 })
  if (!response.result.some((instance) => instance.id === instanceId)) return false

  await namespace.delete(instanceId)
  return true
}

const HUB_MIN_DESCENDANTS = 3
const HUB_MAX_PROBES = 3
/** 10 x 50 items covers the crawler's 500-page ceiling. */
const HUB_MAX_SCAN_PAGES = 10
/** The chunks API rejects anything above 100 outright. */
const HUB_MAX_CHUNKS = 100
const HUB_MAX_CHARACTERS = 45_000
/** A page whose URL names the queried entity is a collection page candidate
 *  even when the site keeps detail pages as siblings rather than children. */
const HUB_MIN_URL_MATCH = 0.5
/** How much of a page has to read like list entries before its name may
 *  reclassify the question as an enumeration. */
const HUB_MIN_LIST_DENSITY = 0.5
/** How many other retrieved pages a page must name before it counts as their
 *  overview. One is coincidence — any page may mention one other. */
const HUB_MIN_SIBLING_MENTIONS = 2

type ItemsApi = Pick<AiSearchInstance['items'], 'list' | 'get'>
type RetrievalInstance = Pick<AiSearchInstance, 'search'> & { items?: ItemsApi }

interface HubPage {
  url: string
  title: string
  key: string
  text: string
  /** The page did not fit the budget, so the entries in it are a prefix. */
  truncated: boolean
}

export interface AncestorCandidate {
  url: string
  descendants: number
  depth: number
}

export interface HubCandidate {
  url: string
  /** Higher goes first. Mixes URL-hierarchy and content evidence. */
  score: number
  /** The URL itself is named after the queried entity, e.g. `/team` for "who
   *  is in the team". Strong enough to reclassify the question. */
  namesQuery: boolean
}

/**
 * A collection page is the parent path of the detail pages it links to.
 * `/agentur-bremen/team` lists everyone; `/agentur-bremen/team/detail/<name>`
 * repeats a single entry. When retrieval returns many siblings, their shared
 * ancestor is the page that actually answers an enumerating question, even if
 * it never entered the result set on its own score.
 */
export function ancestorCandidates(urls: string[]): AncestorCandidate[] {
  const descendantsByAncestor = new Map<string, Set<string>>()

  for (const url of new Set(urls)) {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      continue
    }
    const segments = parsed.pathname.split('/').filter(Boolean)
    for (let length = 1; length < segments.length; length += 1) {
      const ancestor = `${parsed.origin}/${segments.slice(0, length).join('/')}`
      const bucket = descendantsByAncestor.get(ancestor) ?? new Set<string>()
      bucket.add(url)
      descendantsByAncestor.set(ancestor, bucket)
    }
  }

  return [...descendantsByAncestor.entries()]
    .map(([url, descendants]) => ({
      url,
      descendants: descendants.size,
      depth: url.split('/').filter(Boolean).length - 2,
    }))
    .filter((candidate) => candidate.descendants >= HUB_MIN_DESCENDANTS)
    // Most specific first: `/team/detail` is probed before `/team`, so a real
    // intermediate collection page wins over the broad section landing page.
    .sort((left, right) => right.depth - left.depth || right.descendants - left.descendants)
}

/**
 * Chunks overlap by design, so concatenating them duplicates text. The stored
 * byte ranges order them; the shared boundary text removes the seam.
 */
export function appendWithoutOverlap(accumulated: string, next: string): string {
  if (!accumulated) return next
  const window = Math.min(accumulated.length, next.length, 1_500)
  for (let size = window; size >= 30; size -= 1) {
    if (accumulated.endsWith(next.slice(0, size))) return accumulated + next.slice(size)
  }
  return `${accumulated}\n${next}`
}

/**
 * Truncation is reported, never silent. An answer built from a cut-off
 * collection page is incomplete, and the prompt forbids hedging about
 * completeness — so the only way to stay honest is to know it happened.
 */
async function readItemText(
  items: ItemsApi,
  itemId: string,
): Promise<{ text: string; truncated: boolean }> {
  const response = await items.get(itemId).chunks({ limit: HUB_MAX_CHUNKS })
  const ordered = [...response.result].sort((left, right) => left.start_byte - right.start_byte)
  let text = ''
  let consumed = 0
  for (const chunk of ordered) {
    if (text.length >= HUB_MAX_CHARACTERS) break
    // The whole page is read here, so the per-section context lines would only
    // repeat what its own headings already say.
    text = appendWithoutOverlap(text, stripSectionContext(chunk.text))
    consumed += 1
  }
  return {
    text: text.slice(0, HUB_MAX_CHARACTERS),
    // Either the character budget cut the text, or the page has more chunks
    // than one request returns.
    truncated: text.length > HUB_MAX_CHARACTERS || consumed < ordered.length || ordered.length >= HUB_MAX_CHUNKS,
  }
}

/**
 * The Items API rejects our `page-<sha256>.md` keys when passed as `search`:
 * it compiles the term into a metadata filter pattern and refuses it. Look the
 * item up by its indexed `url` metadata instead, and fall back to a bounded
 * key scan when metadata filtering is unavailable.
 */
async function findItemByUrl(
  items: ItemsApi,
  key: string,
  url: string,
): Promise<AiSearchItemInfo | null> {
  try {
    const filtered = await items.list({ metadata_filter: JSON.stringify({ url }), per_page: 10 })
    const match = filtered.result.find((item) => item.key === key)
    if (match) return match
  } catch (error) {
    console.log(JSON.stringify({
      event: 'hub_metadata_filter_unavailable',
      error: error instanceof Error ? error.message : 'unknown',
    }))
  }

  // The Items API caps per_page at 50; a larger value is rejected outright.
  const pageSize = 50
  for (let page = 1; page <= HUB_MAX_SCAN_PAGES; page += 1) {
    const listed = await items.list({ page, per_page: pageSize })
    const match = listed.result.find((item) => item.key === key)
    if (match) return match
    const totalCount = listed.result_info?.total_count ?? listed.result.length
    if (page * pageSize >= totalCount) break
  }
  return null
}

/**
 * Two independent kinds of evidence, because sites organise collections in two
 * ways. Hierarchical sites put the entries below the overview
 * (`/team` -> `/team/detail/x`), which the ancestor analysis finds. Flat sites
 * put them beside it (`/team`, `/anna-beispiel`), where the only signal is that
 * a retrieved page's own URL names what was asked for. Ignoring the second kind
 * left every flat site without a complete list.
 */
export function hubCandidates(ranked: RankedChunk[], queryTokens: string[]): HubCandidate[] {
  const urls = ranked
    .map(({ chunk }) => (typeof chunk.item.metadata?.url === 'string' ? chunk.item.metadata.url : ''))
    .filter(Boolean)

  // The two kinds of evidence add up rather than compete. On webmen.de the
  // author archive `/blog/author/webmen` matched the word "Webmen" as well as
  // the team page matched "Teammitglieder"; only the team page was also the
  // parent of the retrieved detail pages, and that is what decides it.
  const candidates = new Map<string, HubCandidate>()
  const remember = (url: string, score: number, namesQuery: boolean) => {
    const current = candidates.get(url)
    candidates.set(url, {
      url,
      score: (current?.score ?? 0) + score,
      namesQuery: (current?.namesQuery ?? false) || namesQuery,
    })
  }

  for (const ancestor of ancestorCandidates(urls)) {
    const named = collectionPageScore(queryTokens, ancestor.url) >= HUB_MIN_URL_MATCH
    // Depth ranks the specific collection before the broad section landing
    // page; a matching name outranks both. Shared ancestry never reclassifies
    // the question, so this candidate cannot claim `namesQuery`.
    remember(
      ancestor.url,
      1 + ancestor.depth / 100 + Math.min(ancestor.descendants, 20) / 1_000 + (named ? 1 : 0),
      false,
    )
  }

  // One representative chunk per page: the highest ranked one it produced.
  const pages = new Map<string, string>()
  for (const { chunk } of ranked) {
    const url = typeof chunk.item.metadata?.url === 'string' ? chunk.item.metadata.url : ''
    if (!url || pages.has(url)) continue
    pages.set(url, chunk.text.slice(0, 4_000))
  }

  for (const [url, text] of pages) {
    const listLike = listDensity(text)
    const urlMatch = collectionPageScore(queryTokens, url)
    // A page that names the entries of other retrieved pages is their overview,
    // whatever the URLs look like and whatever language the question used.
    // "Zähle alle Mitarbeiter auf" shares no word with `/team`, and only this
    // signal connects the two.
    const mentions = siblingMentions(text, [...pages.keys()].filter((other) => other !== url))
    if (urlMatch < HUB_MIN_URL_MATCH && mentions < HUB_MIN_SIBLING_MENTIONS) continue
    // The name alone is not enough: `/guide/queues` is named after "queue" but
    // answers "what is a queue" as prose. Only a page that reads like a list of
    // entries may turn a question into an enumeration.
    remember(
      url,
      1.5 + urlMatch + Math.min(mentions, 10) / 5 + listLike / 2,
      listLike >= HUB_MIN_LIST_DENSITY
        && (urlMatch >= HUB_MIN_URL_MATCH || mentions >= HUB_MIN_SIBLING_MENTIONS),
    )
  }

  return [...candidates.values()].sort((left, right) => right.score - left.score)
}

async function resolveHubPage(
  instance: RetrievalInstance,
  ranked: RankedChunk[],
  queryTokens: string[],
  requireNamed: boolean,
): Promise<HubPage | null> {
  const items = instance.items
  if (!items) return null

  // When the wording never asked for a set, the only justification for reading
  // a page whole is the page that supplied the evidence. Falling through to an
  // unrelated ancestor answered "what is a queue" with the docs index.
  const candidates = hubCandidates(ranked, queryTokens)
    .filter((candidate) => !requireNamed || candidate.namesQuery)
    .slice(0, HUB_MAX_PROBES)

  // Looked up together, decided in rank order. Sequentially this cost up to
  // three round trips before the first candidate could be ruled out, and each
  // one may fall back to a paged key scan — on an enumerating question, the
  // very kind that already retrieves the most.
  const located = await Promise.all(candidates.map(async (candidate) => {
    const key = await itemKeyFor(candidate.url)
    try {
      const info = await findItemByUrl(items, key, candidate.url)
      if (!info) console.log(JSON.stringify({ event: 'hub_probe_miss', url: candidate.url, key }))
      return { candidate, key, info }
    } catch (error) {
      // A swallowed failure here is indistinguishable from "no collection page
      // exists", which is exactly what made this hard to diagnose in production.
      console.log(JSON.stringify({
        event: 'hub_probe_failed',
        url: candidate.url,
        error: error instanceof Error ? error.message : 'unknown',
      }))
      return { candidate, key, info: null }
    }
  }))

  // The page text is fetched one at a time: the first candidate that resolves is
  // almost always the right one, and reading all three would trade the latency
  // saved above for chunk requests nobody uses.
  for (const { candidate, key, info } of located) {
    if (!info) continue
    try {
      const { text, truncated } = await readItemText(items, info.id)
      if (!text.trim()) {
        console.log(JSON.stringify({ event: 'hub_probe_empty', url: candidate.url, item_id: info.id }))
        continue
      }
      const metadata = info.metadata ?? {}
      console.log(JSON.stringify({
        event: 'hub_resolved',
        url: candidate.url,
        characters: text.length,
        truncated,
      }))
      return {
        url: candidate.url,
        title: typeof metadata.title === 'string' ? metadata.title : candidate.url,
        key,
        text,
        truncated,
      }
    } catch (error) {
      console.log(JSON.stringify({
        event: 'hub_read_failed',
        url: candidate.url,
        error: error instanceof Error ? error.message : 'unknown',
      }))
    }
  }
  console.log(JSON.stringify({
    event: 'hub_unresolved',
    candidates: candidates.map((candidate) => candidate.url),
    ranked_chunks: ranked.length,
  }))
  return null
}

export async function retrieve(
  instance: RetrievalInstance,
  question: string,
  topK: number,
  history: ConversationMessage[] = [],
): Promise<{ context: string; blocks: ContextBlock[]; sources: Source[]; searchQuery: string }> {
  const intent = classifyQuestion(question)
  const messages: AiSearchMessage[] = [
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: question },
  ]
  const maxResults = intent.list ? 50 : Math.min(Math.max(topK * 4, 20), 40)
  const search = (retrievalType: 'hybrid' | 'vector', rerank: boolean, rewrite: boolean) => instance.search({
    messages,
    ai_search_options: {
      // AI Search rewrites the query with an LLM inside every search call, so
      // asking both paths to rewrite bought two identical calls per question —
      // the gateway log showed the same sentence returned twice, 785 ms and
      // 831 ms. Only the keyword side needs it, because colloquial phrasing and
      // typos are what break a literal match. The vector side keeps the question
      // as typed: embeddings tolerate typos, and letting the two paths search
      // for differently worded things is the reason we run both.
      query_rewrite: { enabled: rewrite },
      retrieval: {
        retrieval_type: retrievalType,
        fusion_method: 'rrf',
        keyword_match_mode: 'or',
        match_threshold: 0,
        max_num_results: maxResults,
        context_expansion: intent.list ? 2 : 1,
        return_on_failure: false,
      },
      reranking: {
        enabled: rerank,
        model: '@cf/baai/bge-reranker-base',
        match_threshold: 0,
      },
    },
  })

  // Vector search protects semantic recall and typo tolerance. Hybrid + reranking
  // supplies keyword precision. Local rank fusion keeps either path from
  // discarding a useful result solely because one model assigned a low score.
  const [hybridResult, vectorResult] = await Promise.allSettled([
    search('hybrid', true, true),
    search('vector', false, false),
  ])
  // One path failing is survivable and stays survivable — but it silently halves
  // recall, and nothing said so. The gateway log showed two query rewrites and
  // only one embedding for the same question, which is what a half-failed
  // retrieval looks like from the outside.
  for (const [path, result] of [['hybrid', hybridResult], ['vector', vectorResult]] as const) {
    if (result.status === 'rejected') {
      console.warn(JSON.stringify({
        event: 'search_path_failed',
        path,
        error: result.reason instanceof Error ? result.reason.message : 'unknown',
      }))
    }
  }

  const successfulResults = [hybridResult, vectorResult]
    .filter((result): result is PromiseFulfilledResult<AiSearchSearchResponse> => result.status === 'fulfilled')
    .map((result) => result.value)

  if (!successfulResults.length) {
    const failure = hybridResult.status === 'rejected' ? hybridResult.reason : vectorResult.status === 'rejected' ? vectorResult.reason : null
    throw failure instanceof Error ? failure : new Error('AI Search konnte keine Suche ausführen.')
  }

  const rankedChunks = fuseSearchResults(successfulResults, question, intent)
  const queryTokens = tokens(question)
  // Phrasing is not a reliable signal across languages, so the results get a
  // vote: when a page whose URL names the queried entity is among them, the
  // question behaves like an enumeration whatever words it used.
  const evidence = hubCandidates(rankedChunks, queryTokens)
  // Only the "a retrieved page is named after what was asked" signal may
  // escalate. Shared ancestry alone is not enough: every documentation page
  // shares an ancestor, and that must not turn a definition question into an
  // enumeration.
  const effectiveIntent: QuestionIntent = intent.list
    ? intent
    : { ...intent, list: evidence.some((candidate) => candidate.namesQuery) }
  const hub = effectiveIntent.list
    ? await resolveHubPage(instance, rankedChunks, queryTokens, !intent.explicitList)
    : null
  // Only the hybrid path rewrites, so its query is the one a reader can act on.
  // The vector path now reports the question as typed, and printing both would
  // read as two searches having disagreed rather than as one having been cleaned.
  const searchQuery = (hybridResult.status === 'fulfilled' ? hybridResult.value.search_query : '')
    || successfulResults.map((result) => result.search_query).find(Boolean)
    || question

  return { ...packContext(rankedChunks, hub, effectiveIntent, topK), searchQuery }
}

export function packContext(
  rankedChunks: RankedChunk[],
  hub: HubPage | null,
  intent: QuestionIntent,
  topK: number,
): { context: string; blocks: ContextBlock[]; sources: Source[] } {
  // An enumerating answer is only as complete as the context allows. The budget
  // is sized so one full collection page fits alongside supporting detail pages.
  const contextBudget = intent.list ? 64_000 : 24_000
  const maxSources = intent.list ? Math.max(topK, 12) : topK
  const maxChunkCharacters = intent.list ? 9_000 : 6_500
  const maxChunksPerSource = intent.exhaustive ? 3 : 2

  const blocks: ContextBlock[] = []
  const sources: Source[] = []
  const chunksPerSource = new Map<string, number>()
  const selectedTextsBySource = new Map<string, string[]>()
  const sourceNumberByKey = new Map<string, number>()
  let contextCharacters = 0

  const addSource = (key: string, title: string, url: string, snippet: string, score: number, id: string): number => {
    const existing = sourceNumberByKey.get(key)
    if (existing) return existing
    const sourceNumber = sources.length + 1
    sourceNumberByKey.set(key, sourceNumber)
    sources.push({ id, title, url, snippet: snippet.slice(0, 320), score, chunk_index: id })
    return sourceNumber
  }

  // The collection page goes in whole and first. Splitting it across ranked
  // chunks is what previously truncated a 34-entry list to eight entries.
  if (hub) {
    const limit = Math.min(HUB_MAX_CHARACTERS, contextBudget)
    const text = hub.text.slice(0, limit)
    const truncated = hub.truncated || text.length < hub.text.length
    const sourceNumber = addSource(hub.url, hub.title, hub.url, text, 1, `hub-${hub.key}`)
    blocks.push({
      n: sourceNumber,
      title: hub.title,
      url: hub.url,
      text,
      collection: true,
      truncated,
      // A cut-off page cannot define the full set, and neither can a page the
      // wording never asked for. In both cases entries from other sources are
      // kept rather than rejected.
      authoritative: intent.explicitList && !truncated,
    })
    chunksPerSource.set(hub.url, maxChunksPerSource)
    contextCharacters += text.length
  }

  for (const { chunk, score } of rankedChunks) {
    // A new source is refused once the cap is reached, but a lower-ranked chunk
    // of an already selected page may still add substance.
    if (sources.length >= maxSources && !sourceNumberByKey.has(chunkSourceKey(chunk))) continue
    const metadata = chunk.item.metadata ?? {}
    const url = typeof metadata.url === 'string' ? metadata.url : ''
    const title = typeof metadata.title === 'string' ? metadata.title : url || chunk.item.key
    const sourceKey = chunkSourceKey(chunk)
    const sourceChunkCount = chunksPerSource.get(sourceKey) ?? 0
    if (sourceChunkCount >= maxChunksPerSource) continue

    const previousTexts = selectedTextsBySource.get(sourceKey) ?? []
    if (previousTexts.some((text) => textOverlap(text, chunk.text) >= 0.78)) continue

    const remainingCharacters = contextBudget - contextCharacters
    if (remainingCharacters < 600) break
    const chunkText = chunk.text.slice(0, Math.min(maxChunkCharacters, remainingCharacters))
    if (!chunkText.trim()) continue

    chunksPerSource.set(sourceKey, sourceChunkCount + 1)
    selectedTextsBySource.set(sourceKey, [...previousTexts, chunkText])
    const sourceNumber = addSource(sourceKey, title, url, chunk.text, score, chunk.id)
    blocks.push({ n: sourceNumber, title, url, text: chunkText })
    contextCharacters += chunkText.length
  }

  return {
    context: blocks
      .map((block) => {
        // Machine-shaped metadata on its own line. A natural-language
        // parenthetical after the title was quoted verbatim into an answer, and
        // key: value lines are also language-neutral, which a German label was
        // not once the knowledge base could be in any language.
        const kind = block.collection
          ? `\nsource_type: ${block.truncated ? 'collection_page_partial' : 'collection_page_complete'}`
          : ''
        return `[${block.n}] ${block.title}\nURL: ${block.url || 'unknown'}${kind}\n${block.text}`
      })
      .join('\n\n---\n\n'),
    blocks,
    sources,
  }
}

function chunkSourceKey(chunk: SearchChunk): string {
  const url = chunk.item.metadata?.url
  return typeof url === 'string' && url ? url : chunk.item.key
}

type SearchChunk = AiSearchSearchResponse['chunks'][number]

interface RankedChunk {
  chunk: SearchChunk
  score: number
}

/**
 * Function words carry no retrieval signal but do dilute every coverage score,
 * and a knowledge base can be crawled in any language. The list stays small on
 * purpose: only words that are function words in their language and unlikely to
 * be a searched term in another. Words like `where`, `each`, `with`, `list` or
 * `has` are deliberately absent: on a documentation knowledge base they are API
 * names, and losing the one token that identifies the page is far worse than
 * the mild dilution of keeping a function word.
 */
const QUERY_STOP_WORDS = new Set([
  // German
  'aber', 'alle', 'allen', 'aller', 'alles', 'auch', 'bitte', 'dass', 'dem', 'den',
  'der', 'die', 'diese', 'dieser', 'ein', 'eine', 'einer', 'eines', 'für', 'ich',
  'ist', 'mich', 'mir', 'möchte', 'oder', 'sich', 'sind', 'und', 'vom', 'von',
  'warum', 'welche', 'welchem', 'welchen', 'welcher', 'welches', 'wer', 'wie',
  'wird', 'wurde',
  // English
  'about', 'and', 'are', 'does', 'please', 'tell', 'the', 'their', 'these', 'they',
  'those', 'want', 'were', 'what', 'which', 'who', 'whom', 'why', 'you', 'your',
  // French / Spanish / Italian / Portuguese / Dutch
  'aux', 'como', 'cual', 'cuales', 'dans', 'della', 'delle', 'des', 'een', 'est',
  'het', 'las', 'los', 'para', 'por', 'pour', 'quais', 'quale', 'quali', 'quelles',
  'quels', 'que', 'qui', 'sont', 'sur', 'una', 'une', 'voor', 'welk', 'welke',
])

function tokens(value: string): string[] {
  const all = [...new Set(
    value
      .toLocaleLowerCase()
      // Both spellings must land on one form. A page writes "Stephan Müller"
      // while its URL writes "stephan-mueller", and stripping the diaeresis
      // alone leaves "muller", which matches neither.
      .replace(/ä/gu, 'ae')
      .replace(/ö/gu, 'oe')
      .replace(/ü/gu, 'ue')
      .replace(/ß/gu, 'ss')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
  )]
  const meaningful = all.filter((token) => !QUERY_STOP_WORDS.has(token))
  // "Was ist das?" is all function words. An empty token list would score every
  // candidate at zero, so the unfiltered form is better than nothing.
  return meaningful.length ? meaningful : all
}

/** Trigram sets are rebuilt for the same tokens across dozens of chunks, and
 *  the Worker pays for that in CPU time it does not have. */
const trigramCache = new Map<string, Set<string>>()

function trigrams(value: string): Set<string> {
  const cached = trigramCache.get(value)
  if (cached) return cached
  const padded = `  ${value}  `
  const grams = new Set<string>()
  for (let index = 0; index <= padded.length - 3; index += 1) grams.add(padded.slice(index, index + 3))
  // Bounded so a long-running isolate cannot accumulate every token it ever saw.
  if (trigramCache.size > 4_000) trigramCache.clear()
  trigramCache.set(value, grams)
  return grams
}

function fuzzyTokenScore(left: string, right: string): number {
  if (left === right) return 1
  // Compounds and inflections: "team" inside "teammitglieder", "command"
  // inside "commands", "plan" inside "plans". Trigram overlap divides by the
  // longer word, so it scored `/team` against "Teammitglieder" at 0.2 and the
  // team page was not recognised as the overview at all.
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left]
  if (shorter.length >= 4 && longer.includes(shorter)) {
    return longer.startsWith(shorter) ? 0.9 : 0.75
  }
  const leftGrams = trigrams(left)
  const rightGrams = trigrams(right)
  let intersection = 0
  for (const gram of leftGrams) if (rightGrams.has(gram)) intersection += 1
  return intersection / Math.max(leftGrams.size, rightGrams.size, 1)
}

function tokenCoverage(queryTokens: string[], content: string): number {
  if (!queryTokens.length) return 0
  const contentTokens = tokens(content)
  if (!contentTokens.length) return 0
  let matched = 0
  for (const queryToken of queryTokens) {
    let best = 0
    for (const contentToken of contentTokens) {
      best = Math.max(best, fuzzyTokenScore(queryToken, contentToken))
      if (best === 1) break
    }
    if (best >= 0.55) matched += best
  }
  return matched / queryTokens.length
}

const EXHAUSTIVE_PATTERN = /\b(alle|allen|aller|alles|vollständig\w*|vollstaendig\w*|sämtlich\w*|saemtlich\w*|gesamte?[nsmr]?|komplette?[nsmr]?|jede[nsmr]?|every|all|complete|entire|full|tous|toutes|complet\w*|entier\w*|todos|todas|completo\w*|tutti|tutte|volledig\w*)\b/iu

// An enumerating question rarely says "alle". "Wer sind die Teammitglieder?"
// needs the same collection page as "nenne mir alle Mitglieder". Missing that
// is what capped answers at a handful of entries.
//
// Three independent signals: a selective interrogative, a listing verb, or a
// plural entity noun. The vocabulary spans the languages a crawled site is
// likely to be in and the technical nouns a repository or docs site is asked
// about — but wording alone is never the last word, because no word list
// covers every language. Retrieval evidence can escalate a question that none
// of these patterns matched (see `hubCandidates`).
const LIST_PATTERN = new RegExp(
  '^\\s*(wer|welche[nsrm]?|who|which|quels?|quelles|qui|qui[eé]n(es)?|cu[aá]l(es)?|chi|quali|quem|quais)\\b'
  + '|\\b(liste|auflistung|übersicht|uebersicht|overview|nenne|nennen|zeige?|aufzählung|aufzaehlung'
  + '|list|enumerate|lista|listado|elenco|panoramica|aper[çc]u|resumen|vis[aã]o|overzicht)\\b'
  + '|\\w*(mitglieder|mitarbeiter|mitarbeitende|mitarbeiterinnen|team|teams|personen|ansprechpartner'
  + '|kontakte|standorte|leistungen|services|produkte|kunden|referenzen|partner|autoren|mitglied'
  + '|members|employees|staff|people|contacts|locations|offices|products|customers|clients'
  + '|references|authors|plans|tiers|features|options|endpoints|commands|methods|functions'
  + '|parameters|arguments|dependencies|modules|packages|classes|events|hooks|courses|programs'
  + '|studieng[aä]nge|kurse|fakult[aä]ten|professoren|dozenten|departments|faculties'
  + '|categories|kategorien|themen|topics|schritte|steps|voraussetzungen|requirements'
  + '|preise|prices|pricing|tarife)\\w*\\b',
  'iu',
)

/** "Newest release", "letzte Änderung": rank by the date the page states. */
const RECENCY_PATTERN = /\b(neueste[nsrm]?|neuste[nsrm]?|aktuellste[nsrm]?|j[uü]ngste[nsrm]?|letzte[nsrm]?|latest|newest|recent|current|dernier\w*|derni[eè]re\w*|[uú]ltim\w*|recente\w*|nieuwste)\b/iu

export interface QuestionIntent {
  /** The answer is a set of entities, so recall over one page matters most. */
  list: boolean
  /** The wording itself asked for a set. Weaker evidence-based escalation must
   *  not claim the same authority, because it can misread the question. */
  explicitList: boolean
  /** The question additionally demands completeness. */
  exhaustive: boolean
  /** The answer depends on which source is newest. */
  recency: boolean
}

export interface ContextBlock {
  n: number
  title: string
  url: string
  text: string
  /** Set on the collection page: it defines the scope of the set of entries. */
  collection?: boolean
  /** The collection page did not fit, so it does not define the full set. */
  truncated?: boolean
  /** Entries outside this block may be rejected as not belonging to the set. */
  authoritative?: boolean
}

export function classifyQuestion(question: string): QuestionIntent {
  const exhaustive = EXHAUSTIVE_PATTERN.test(question)
  const list = exhaustive || LIST_PATTERN.test(question)
  return { exhaustive, list, explicitList: list, recency: RECENCY_PATTERN.test(question) }
}

export function isExhaustiveQuestion(question: string): boolean {
  return EXHAUSTIVE_PATTERN.test(question)
}

function listDensity(text: string): number {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 4) return 0
  const listLike = lines.filter((line) => /^([-*+]\s+|\d+[.)]\s+|#{1,6}\s+)?[\p{L}][^.!?]{1,90}$/u.test(line)).length
  return Math.min(1, listLike / lines.length)
}

/**
 * How much of the URL's own name the question asked for — not the reverse.
 * A path segment is one or two words, so requiring it to cover a whole
 * question scored `/team` at 0.33 for "Wer sind die Teammitglieder von Webmen?"
 * and never recognised it. Asking whether the question contains what the page
 * is named after is the question a collection page has to answer.
 */
function collectionPageScore(queryTokens: string[], urlValue: string): number {
  if (!urlValue || !queryTokens.length) return 0
  try {
    const parsed = new URL(urlValue)
    const lastSegment = urlEntity(parsed)
    if (!lastSegment) return 0
    // The site's own name says nothing about which page is the overview.
    // `/blog/author/webmen` matched "Webmen" perfectly on webmen.de and was
    // picked as the authoritative list of employees.
    const hostTokens = new Set(tokens(parsed.hostname.replace(/[.-]+/g, ' ')))
    const segmentTokens = tokens(lastSegment).filter((token) => !hostTokens.has(token))
    if (!segmentTokens.length) return 0
    return tokenCoverage(segmentTokens, queryTokens.join(' '))
  } catch {
    return 0
  }
}

/** The last path segment as words: `/team/detail/anna-beispiel` -> "anna beispiel". */
function urlEntity(parsed: URL): string {
  const segments = parsed.pathname
    .split('/')
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean)
  return (segments.at(-1) ?? '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[-_.]+/g, ' ')
}

/**
 * How many of the other retrieved pages this text names. A detail page is
 * identified by the words in its URL, which is where a site puts the entity's
 * name; two matches rule out coincidence.
 */
export function siblingMentions(text: string, otherUrls: string[]): number {
  const present = new Set(tokens(text))
  let mentions = 0
  for (const url of otherUrls) {
    let entityTokens: string[]
    try {
      entityTokens = tokens(urlEntity(new URL(url)))
    } catch {
      continue
    }
    // A single word matches far too easily; `/blog` would name every page.
    if (entityTokens.length < 2) continue
    if (entityTokens.every((token) => present.has(token))) mentions += 1
  }
  return mentions
}

function fuseSearchResults(
  results: AiSearchSearchResponse[],
  question: string,
  intent: QuestionIntent = classifyQuestion(question),
): RankedChunk[] {
  const candidates = new Map<string, { chunk: SearchChunk; rankSignal: number; appearances: number }>()
  for (const result of results) {
    result.chunks.forEach((chunk, index) => {
      const key = `${chunk.item.key}:${chunk.id}`
      const current = candidates.get(key) ?? { chunk, rankSignal: 0, appearances: 0 }
      current.rankSignal += 61 / (60 + index + 1)
      current.appearances += 1
      if (chunk.score > current.chunk.score) current.chunk = chunk
      candidates.set(key, current)
    })
  }

  const queryTokens = tokens(question)
  // Enumeration and collection-page signals apply to every list question, not
  // just the ones that happen to contain the word "alle".
  const exhaustive = intent.list
  const recencyScore = intent.recency ? publishedAtRanking([...candidates.values()]) : null
  return [...candidates.values()]
    .map(({ chunk, rankSignal, appearances }) => {
      const metadata = chunk.item.metadata ?? {}
      const url = typeof metadata.url === 'string' ? metadata.url : ''
      const sourceText = `${typeof metadata.title === 'string' ? metadata.title : ''} ${url}`
      const rankScore = rankSignal / Math.max(appearances, 1)
      const sourceScore = tokenCoverage(queryTokens, sourceText)
      const bodyScore = tokenCoverage(queryTokens, chunk.text.slice(0, 2_000))
      const enumerationScore = exhaustive ? listDensity(chunk.text) : 0
      // For "all X" questions, the collection page normally ends in the
      // queried entity (for example /team), while detail pages end in a name.
      // Prefer that aggregate source before individual records.
      const aggregateScore = exhaustive ? collectionPageScore(queryTokens, url) : 0
      const freshness = recencyScore?.get(url) ?? 0
      return {
        chunk,
        score: 0.46 * rankScore + 0.24 * sourceScore + 0.08 * bodyScore
          + 0.08 * enumerationScore + 0.14 * aggregateScore + 0.12 * freshness,
      }
    })
    .sort((left, right) => right.score - left.score)
}

/**
 * Relative, not absolute: "the newest release" means newest among what the
 * site published, and an archive from 2019 should still win if nothing is more
 * recent. Pages without a stated date score zero rather than "old", because an
 * absent date is not evidence of age.
 */
export function publishedAtRanking(
  candidates: Array<{ chunk: SearchChunk }>,
): Map<string, number> {
  const timestamps = new Map<string, number>()
  for (const { chunk } of candidates) {
    const metadata = chunk.item.metadata ?? {}
    const url = typeof metadata.url === 'string' ? metadata.url : ''
    const published = metadata.published_at
    if (!url || typeof published !== 'string') continue
    const time = Date.parse(published)
    if (Number.isFinite(time)) timestamps.set(url, Math.max(timestamps.get(url) ?? -Infinity, time))
  }
  if (timestamps.size < 2) return new Map()

  const values = [...timestamps.values()]
  const oldest = Math.min(...values)
  const newest = Math.max(...values)
  if (newest === oldest) return new Map()
  return new Map(
    [...timestamps.entries()].map(([url, time]) => [url, (time - oldest) / (newest - oldest)]),
  )
}

function textOverlap(left: string, right: string): number {
  const leftTokens = new Set(tokens(left))
  const rightTokens = new Set(tokens(right))
  if (!leftTokens.size || !rightTokens.size) return 0
  let intersection = 0
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1
  return intersection / Math.min(leftTokens.size, rightTokens.size)
}
