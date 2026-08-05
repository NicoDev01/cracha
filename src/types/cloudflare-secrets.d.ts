/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  RAG_QUERY_SECRET: string
  MODAL_CRAWLER_URL: string
  CRAWLER_API_SECRET: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string
}
