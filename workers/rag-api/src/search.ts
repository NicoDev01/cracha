import type { ConversationMessage, Env, IngestPage, Source } from './types'

const INSTANCE_CONFIG = {
  index_method: { vector: true, keyword: true },
  hybrid_search_enabled: true,
  embedding_model: '@cf/baai/bge-m3',
  fusion_method: 'rrf' as const,
  indexing_options: { keyword_tokenizer: 'porter' as const },
  retrieval_options: { keyword_match_mode: 'or' as const },
  chunk: true,
  chunk_size: 800,
  chunk_overlap: 15,
  score_threshold: 0.1,
  max_num_results: 12,
  reranking: true,
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
      // Queue the item instead of holding a Worker request open while the
      // managed embedding/indexing pipeline runs (often longer than 30 s).
      await instance.items.upload(key, page.markdown, {
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

export async function retrieve(
  instance: Pick<AiSearchInstance, 'search'>,
  question: string,
  topK: number,
  history: ConversationMessage[] = [],
): Promise<{ context: string; sources: Source[]; searchQuery: string }> {
  const messages: AiSearchMessage[] = [
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: question },
  ]
  const search = (
    retrievalType: 'hybrid' | 'vector',
    rerank = true,
    matchThreshold = 0.1,
  ) => instance.search({
    messages,
    ai_search_options: {
      query_rewrite: { enabled: messages.length > 1 },
      retrieval: {
        retrieval_type: retrievalType,
        fusion_method: 'rrf',
        keyword_match_mode: 'or',
        match_threshold: matchThreshold,
        max_num_results: Math.min(Math.max(topK * 2, 8), 20),
        context_expansion: 1,
        return_on_failure: false,
      },
      reranking: {
        enabled: rerank,
        model: '@cf/baai/bge-reranker-base',
        match_threshold: 0.1,
      },
    },
  })

  let result: AiSearchSearchResponse
  try {
    result = await search('hybrid')
  } catch (error) {
    if (!(error instanceof Error) || !/keyword indexing is disabled/i.test(error.message)) throw error
    result = await search('vector', false, 0.05)
  }
  if (!result.chunks.length) result = await search('vector', false, 0.05)

  const sources: Source[] = []
  const sourceNumberByUrl = new Map<string, number>()
  const chunksPerSource = new Map<string, number>()
  const contextParts: string[] = []

  for (const chunk of result.chunks) {
    const metadata = chunk.item.metadata ?? {}
    const url = typeof metadata.url === 'string' ? metadata.url : ''
    const title = typeof metadata.title === 'string' ? metadata.title : url || chunk.item.key
    const sourceKey = url || chunk.item.key
    const sourceChunkCount = chunksPerSource.get(sourceKey) ?? 0
    if (sourceChunkCount >= 2) continue
    chunksPerSource.set(sourceKey, sourceChunkCount + 1)
    let sourceNumber = sourceNumberByUrl.get(sourceKey)

    if (!sourceNumber) {
      sourceNumber = sources.length + 1
      sourceNumberByUrl.set(sourceKey, sourceNumber)
      sources.push({
        id: chunk.id,
        title,
        url,
        snippet: chunk.text.slice(0, 320),
        score: chunk.score,
        chunk_index: chunk.id,
      })
    }

    contextParts.push(
      `[${sourceNumber}] ${title}\nURL: ${url || 'unbekannt'}\n${chunk.text}`,
    )
    if (contextParts.length >= topK) break
  }

  return {
    context: contextParts.join('\n\n---\n\n'),
    sources,
    searchQuery: result.search_query,
  }
}
