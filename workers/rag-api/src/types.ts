export interface Env {
  AI_SEARCH: AiSearchNamespace
  DATABASE_REGISTRY: KVNamespace
  INGEST_SECRET: string
  QUERY_SECRET: string
}

export interface DatabaseRecord {
  id: string
  name: string
  description?: string
  source_url: string
  user_id: string
  created_at: string
  updated_at: string
  last_crawl?: string | null
  document_count: number
  pages_count: number
  /**
   * The highest pages_count this base has ever reached. It is what the owner's
   * page quota is charged, and it never falls — a re-crawl that finds fewer
   * pages does not refund the ones already fetched and indexed.
   */
  pages_charged?: number
  chunks_count: number
  status: 'pending' | 'crawling' | 'active' | 'failed'
  ai_search_instance_id?: string
  last_error?: string
}

export interface IngestPage {
  url: string
  title: string
  markdown: string
  checksum: string
  crawled_at: string
  /** The date the page states it was published, when it states one. */
  published_at?: string
}

/**
 * What a previous ingest call of the same crawl job already learned from the
 * Items listing. The crawler threads it forward so the dedupe scan runs once
 * per job instead of once per batch — on a 500-page re-crawl that is the
 * difference between twenty full item listings and one.
 */
export interface KnownItem {
  checksum: string
  title: string
  status: string
  chunks: number
}

export interface QueryBody {
  question: string
  tenant_id: string
  user_id: string
  top_k?: number
  messages?: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Source {
  id: string
  title: string
  url: string
  snippet: string
  score: number
  chunk_index: string
}

export interface ContextBlock {
  n: number
  title: string
  url: string
  text: string
  collection?: boolean
  truncated?: boolean
  authoritative?: boolean
}

export interface RetrievalResponse {
  context: string
  blocks: ContextBlock[]
  sources: Source[]
  search_query: string
  usage: {
    latency_ms: number
    /** Served from the retrieval cache, so the latency is not a search time. */
    cached?: boolean
  }
}
