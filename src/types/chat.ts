export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  sources?: Source[]
  isStreaming?: boolean
  isError?: boolean
  metadata?: ChatResponse['metadata']
}

export interface Source {
  id: string
  title: string
  url: string
  snippet: string
  relevance_score: number
}

export interface ChatResponse {
  message: string
  sources: Source[]
  metadata: {
    query_time: number
    tokens_used: number
    model_used: string
  }
}

export interface QueryRequest {
  tenant_id: string
  question: string
  top_k?: number
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface ChatState {
  messages: Message[]
  selectedDatabase: string | null
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  
  // Actions
  sendMessage: (question: string) => Promise<void>
  clearChat: () => void
  selectDatabase: (tenantId: string) => void
  setError: (error: string | null) => void
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
}
