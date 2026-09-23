export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  sources?: Source[]
  isStreaming?: boolean
  isError?: boolean
  feedback?: 'helpful' | 'unhelpful'
  metadata?: ChatResponse['metadata']
}

export interface Source {
  id: string
  title: string
  url: string
  snippet: string
  relevance_score: number
}

export type FallbackReason = 'byok_rejected' | 'byok_model' | 'byok_quota' | 'byok_region' | 'byok_request' | 'byok_unavailable' | 'primary_unavailable'

/** What the search has done so far; every number is a real count. */
export interface RetrievalProgress {
  stage: 'found' | 'collection' | 'selected'
  /** Distinct pages the search returned so far. */
  pages?: number
  /** Distinct text passages behind those pages. */
  passages?: number
  /** Sources picked for the answer, once selection is done. */
  sources?: number
  search_query?: string
  /** The overview page being read in full. */
  title?: string
}

export interface ChatResponse {
  message: string
  sources: Source[]
  metadata: {
    query_time: number
    retrieval_time?: number
    /** The search was reused from cache, so its time is not a search time. */
    retrieval_cached?: boolean
    model_used: string
    /** The primary model failed and the standby answered instead. */
    fallback?: boolean
    /** Why the user's own model did not answer; decides the notice shown. */
    fallback_reason?: FallbackReason
    /** What Google said, e.g. "503 UNAVAILABLE: The model is overloaded." */
    fallback_detail?: string
    /** The model that was asked for, when another one wrote the answer. */
    requested_model?: string
    /** Why the requested Gemini model did not answer when another Gemini model did. */
    substitute_reason?: FallbackReason
    substitute_detail?: string
    refunded?: boolean
    reference?: string
  }
}

export interface QueryRequest {
  request_id?: string
  tenant_id: string
  question: string
  top_k?: number
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  api_key?: string
  model?: string
  mode?: 'default' | 'verification'
}

export interface ChatState {
  ownerId: string | null
  conversations: Record<string, ChatConversation>
  selectedConversation: string | null
  messages: Message[]
  messagesByDb?: Record<string, Message[]>
  selectedDatabase: string | null
  isLoading: boolean
  isStreaming: boolean
  /** Live search progress of the request in flight; null otherwise. */
  retrievalProgress: RetrievalProgress | null
  error: string | null
  byokApiKey: string | null
  byokModel: string | null
  chatMode: 'default' | 'verification'
  
  // Actions
  sendMessage: (question: string) => Promise<boolean>
  claimFor: (ownerId: string | null) => void
  stop: () => void
  newConversation: () => void
  selectConversation: (id: string) => void
  feedback: (id: string, value: 'helpful' | 'unhelpful') => void
  clearChat: () => void
  selectDatabase: (tenantId: string) => void
  setError: (error: string | null) => void
  setByokApiKey: (key: string | null) => void
  setByokModel: (model: string | null) => void
  setChatMode: (mode: 'default' | 'verification') => void
}

export interface ChatConversation {
  id: string
  databaseId: string
  title: string
  messages: Message[]
}

export interface Database {
  id: string
  name: string
  description?: string
  created_at: string | Date
  updated_at: string | Date
  document_count?: number
  last_crawl?: string | Date
  source_url?: string
  status?: 'active' | 'pending' | 'error' | 'failed' | 'crawling' | 'inactive'
  chunks_count?: number
  pages_count?: number
  url?: string
  urls?: string[]
}
