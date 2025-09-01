// API Types
export interface QueryRequest {
  tenant_id: string
  question: string
  top_k?: number
  stream?: boolean
  language?: 'de' | 'en' | 'auto'
  use_hyde?: boolean
  rerank?: boolean
}

export interface QueryResponse {
  answer: string
  sources: Source[]
  usage: UsageMetrics
  debug?: DebugInfo
}

export interface Source {
  url: string
  title: string
  score: number
  chunk_index?: number
}

export interface UsageMetrics {
  vector_queries: number
  llm_tokens: number
  latency_ms: number
  cost_estimate?: number
}

export interface DebugInfo {
  hyde_query?: string
  chunks_retrieved: number
  rerank_scores?: number[]
  processing_time: Record<string, number>
}

// Crawl Types
export interface CrawlRequest {
  url: string
  tenant_id: string
  type: 'single' | 'recursive' | 'sitemap' | 'batch'
  max_depth?: number
  limit?: number
  include_patterns?: string[]
  exclude_patterns?: string[]
  include_domains?: string[]
  exclude_domains?: string[]
  embedding_model?: string
}

export interface CrawlJob {
  id: string
  tenant_id: string
  status: 'pending' | 'queued' | 'running' | 'processing' | 'completed' | 'failed'
  config: CrawlRequest
  progress?: {
    pages_crawled: number
    chunks_created: number
    estimated_cost: number
  }
  result?: {
    success: boolean
    chunks_created: number
    chunks_upserted: number
    pages_crawled: number
    total_cost: number
    duration: number
  }
  created_at: string
  updated_at: string
  error?: string
}

// Auth Types
export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Database {
  id: string
  name: string
  tenant_id: string
  created_at: string
  updated_at: string
  urls_count: number
  chunks_count: number
  last_crawl?: string
}

// UI Types
export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  sources?: Source[]
  usage?: UsageMetrics
  timestamp: Date
  isStreaming?: boolean
}

export interface ChatState {
  messages: Message[]
  selectedDatabase: string | null
  isLoading: boolean
  streamingContent: string
}

export interface CrawlState {
  jobs: CrawlJob[]
  currentJob: CrawlJob | null
  isLoading: boolean
}

export interface DatabaseState {
  databases: Database[]
  selectedDatabase: Database | null
  isLoading: boolean
}

// Landing Page Types
export interface InfoLdg {
  title: string
  description: string
  image?: string
  video?: string
  list: {
    title: string
    description: string
    icon: string
  }[]
}

export interface FeatureLdg {
  title: string
  description: string
  link: string
  icon: string
}

// TestimonialType entfernt - nicht mehr benötigt

// Site Config Types
export interface SiteConfig {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
  }
  mailSupport: string
}

export interface SidebarNavItem {
  title: string
  items: {
    title: string
    href: string
  }[]
}