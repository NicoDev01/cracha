/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  AI: {
    run(model: string, input: unknown): Promise<unknown>
  }
  RAG_QUERY_SECRET: string
  MODAL_CRAWLER_URL: string
  CRAWLER_API_SECRET: string
  GENERATION_MODEL: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}
