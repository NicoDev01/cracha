import type { ConversationMessage, Env, IngestPage, Source } from './types'

const INSTANCE_CONFIG = {
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
  custom_metadata: [
    { field_name: 'url', data_type: 'text' as const },
    { field_name: 'title', data_type: 'text' as const },
    { field_name: 'checksum', data_type: 'text' as const },
    { field_name: 'crawled_at', data_type: 'datetime' as const },
    { field_name: 'depth', data_type: 'number' as const },
  ],
}

async function configureInstance(
  instance: AiSearchInstance,
  id: string,
  info?: AiSearchInstanceInfo,
): Promise<void> {
  const current = info ?? (await instance.info())
  if (
    current.index_method?.keyword === true &&
    current.embedding_model === INSTANCE_CONFIG.embedding_model &&
    current.score_threshold === INSTANCE_CONFIG.score_threshold &&
    current.indexing_options?.keyword_tokenizer === INSTANCE_CONFIG.indexing_options.keyword_tokenizer &&
    current.chunk_size === INSTANCE_CONFIG.chunk_size &&
    current.chunk_overlap === INSTANCE_CONFIG.chunk_overlap &&
    current.custom_metadata?.some((field) => field.field_name === 'url')
  ) return

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
    await configureInstance(existing, id, info)
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

export async function uploadPages(
  instance: AiSearchInstance,
  pages: IngestPage[],
): Promise<string[]> {
  return Promise.all(
    pages.map(async (page) => {
      const key = await itemKeyFor(page.url)
      const content = `# ${page.title}\n\nQuelle: ${page.url}\n\n${page.markdown.trim()}`
      // Queue the item instead of holding a Worker request open while the
      // managed embedding/indexing pipeline runs (often longer than 30 s).
      await instance.items.upload(key, content, {
        metadata: {
          url: page.url,
          title: page.title,
          checksum: page.checksum,
          crawled_at: page.crawled_at,
          // The Items API transports custom metadata as strings and casts it
          // according to the instance schema during indexing.
          depth: String(page.depth ?? 0),
        },
      })
      return key
    }),
  )
}

export async function deleteStaleItems(
  instance: { items: Pick<AiSearchInstance['items'], 'list' | 'delete'> },
  activeKeys: Set<string>,
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

  for (const id of staleIds) await instance.items.delete(id)
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
const HUB_MAX_CHUNKS = 60
const HUB_MAX_CHARACTERS = 30_000

type ItemsApi = Pick<AiSearchInstance['items'], 'list' | 'get'>
type RetrievalInstance = Pick<AiSearchInstance, 'search'> & { items?: ItemsApi }

interface HubPage {
  url: string
  title: string
  key: string
  text: string
}

export interface AncestorCandidate {
  url: string
  descendants: number
  depth: number
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

async function readItemText(items: ItemsApi, itemId: string): Promise<string> {
  const response = await items.get(itemId).chunks({ limit: HUB_MAX_CHUNKS })
  const ordered = [...response.result].sort((left, right) => left.start_byte - right.start_byte)
  let text = ''
  for (const chunk of ordered) {
    text = appendWithoutOverlap(text, chunk.text)
    if (text.length >= HUB_MAX_CHARACTERS) break
  }
  return text.slice(0, HUB_MAX_CHARACTERS)
}

async function resolveHubPage(
  instance: RetrievalInstance,
  ranked: RankedChunk[],
): Promise<HubPage | null> {
  const items = instance.items
  if (!items) return null

  const urls = ranked
    .map(({ chunk }) => (typeof chunk.item.metadata?.url === 'string' ? chunk.item.metadata.url : ''))
    .filter(Boolean)

  for (const candidate of ancestorCandidates(urls).slice(0, HUB_MAX_PROBES)) {
    const key = await itemKeyFor(candidate.url)
    try {
      const listed = await items.list({ search: key, per_page: 5 })
      const info = listed.result.find((item) => item.key === key)
      if (!info) continue
      const text = await readItemText(items, info.id)
      if (!text.trim()) continue
      const metadata = info.metadata ?? {}
      return {
        url: candidate.url,
        title: typeof metadata.title === 'string' ? metadata.title : candidate.url,
        key,
        text,
      }
    } catch {
      continue
    }
  }
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
  const search = (retrievalType: 'hybrid' | 'vector', rerank: boolean) => instance.search({
    messages,
    ai_search_options: {
      // Enabled for the first turn as well. Colloquial phrasing and typos
      // otherwise reach the index verbatim on exactly the question that matters.
      query_rewrite: { enabled: true },
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
    search('hybrid', true),
    search('vector', false),
  ])
  const successfulResults = [hybridResult, vectorResult]
    .filter((result): result is PromiseFulfilledResult<AiSearchSearchResponse> => result.status === 'fulfilled')
    .map((result) => result.value)

  if (!successfulResults.length) {
    const failure = hybridResult.status === 'rejected' ? hybridResult.reason : vectorResult.status === 'rejected' ? vectorResult.reason : null
    throw failure instanceof Error ? failure : new Error('AI Search konnte keine Suche ausführen.')
  }

  const rankedChunks = fuseSearchResults(successfulResults, question, intent)
  // Only enumerating questions pay the two extra item lookups.
  const hub = intent.list ? await resolveHubPage(instance, rankedChunks) : null
  const searchQuery = [...new Set(successfulResults.map((result) => result.search_query).filter(Boolean))].join(' | ')

  return { ...packContext(rankedChunks, hub, intent, topK), searchQuery }
}

export function packContext(
  rankedChunks: RankedChunk[],
  hub: HubPage | null,
  intent: QuestionIntent,
  topK: number,
): { context: string; blocks: ContextBlock[]; sources: Source[] } {
  // An enumerating answer is only as complete as the context allows. The budget
  // is sized so one full collection page fits alongside supporting detail pages.
  const contextBudget = intent.list ? 48_000 : 20_000
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
    const text = hub.text.slice(0, Math.min(HUB_MAX_CHARACTERS, contextBudget))
    const sourceNumber = addSource(hub.url, hub.title, hub.url, text, 1, `hub-${hub.key}`)
    blocks.push({ n: sourceNumber, title: hub.title, url: hub.url, text })
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
      .map((block) => `[${block.n}] ${block.title}\nURL: ${block.url || 'unbekannt'}\n${block.text}`)
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

const QUERY_STOP_WORDS = new Set([
  'aber', 'alle', 'allen', 'aller', 'alles', 'auch', 'bitte', 'das', 'dass', 'dem', 'den',
  'der', 'die', 'ein', 'eine', 'einer', 'eines', 'für', 'hat', 'haben', 'hier', 'ich', 'ist',
  'mit', 'nach', 'oder', 'sind', 'und', 'vom', 'von', 'warum', 'was', 'welche', 'welcher',
  'welches', 'wer', 'wie', 'wird', 'wurde', 'the', 'what', 'which', 'who', 'with', 'please',
])

function tokens(value: string): string[] {
  return [...new Set(
    value
      .toLocaleLowerCase('de')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
  )].filter((token) => !QUERY_STOP_WORDS.has(token))
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value}  `
  const grams = new Set<string>()
  for (let index = 0; index <= padded.length - 3; index += 1) grams.add(padded.slice(index, index + 3))
  return grams
}

function fuzzyTokenScore(left: string, right: string): number {
  if (left === right) return 1
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

const EXHAUSTIVE_PATTERN = /\b(alle|allen|aller|alles|vollständig\w*|vollstaendig\w*|sämtlich\w*|saemtlich\w*|gesamte?[nsmr]?|komplette?[nsmr]?|every|all|complete|entire)\b/iu

// An enumerating question rarely says "alle". "Wer sind die Teammitglieder?"
// needs the same collection page as "nenne mir alle Mitglieder". Missing that
// is what capped answers at a handful of entries.
const LIST_PATTERN = /^\s*(wer|welche[nsrm]?|who|which)\b|\b(liste|auflistung|übersicht|uebersicht|overview|nenne|nennen|zeige?|aufzählung|aufzaehlung|list)\b|\w*(mitglieder|mitarbeiter|mitarbeitende|mitarbeiterinnen|team|teams|personen|ansprechpartner|kontakte|standorte|leistungen|services|produkte|kunden|referenzen|partner|autoren|mitglied)\w*\b/iu

export interface QuestionIntent {
  /** The answer is a set of entities, so recall over one page matters most. */
  list: boolean
  /** The question additionally demands completeness. */
  exhaustive: boolean
}

export interface ContextBlock {
  n: number
  title: string
  url: string
  text: string
}

export function classifyQuestion(question: string): QuestionIntent {
  const exhaustive = EXHAUSTIVE_PATTERN.test(question)
  return { exhaustive, list: exhaustive || LIST_PATTERN.test(question) }
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

function collectionPageScore(queryTokens: string[], urlValue: string): number {
  if (!urlValue) return 0
  try {
    const pathSegments = new URL(urlValue).pathname
      .split('/')
      .map((segment) => decodeURIComponent(segment).trim())
      .filter(Boolean)
    const lastSegment = pathSegments.at(-1) ?? ''
    if (!lastSegment) return 0
    return tokenCoverage(queryTokens, lastSegment.replace(/[-_]+/g, ' '))
  } catch {
    return 0
  }
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
      return {
        chunk,
        score: 0.46 * rankScore + 0.24 * sourceScore + 0.08 * bodyScore + 0.08 * enumerationScore + 0.14 * aggregateScore,
      }
    })
    .sort((left, right) => right.score - left.score)
}

function textOverlap(left: string, right: string): number {
  const leftTokens = new Set(tokens(left))
  const rightTokens = new Set(tokens(right))
  if (!leftTokens.size || !rightTokens.size) return 0
  let intersection = 0
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1
  return intersection / Math.min(leftTokens.size, rightTokens.size)
}
