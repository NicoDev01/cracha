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
  depth?: number
  /** The date the page states it was published, when it states one. */
  published_at?: string
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
