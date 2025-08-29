// Cloudflare Workers environment types
interface CloudflareEnv {
  // KV Bindings
  DATABASE_REGISTRY: KVNamespace
  
  // Environment Variables
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_KV_NAMESPACE_ID?: string
  CLOUDFLARE_API_TOKEN?: string
  VECTORIZE_ACCOUNT_ID?: string
  VECTORIZE_API_TOKEN?: string
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  
  // AI Provider Keys
  OPENAI_API_KEY?: string
  GEMINI_API_KEY?: string
  VERTEX_KEY?: string
  GOOGLE_API_KEY?: string
  
  // Application Config
  NEXT_PUBLIC_APP_ENV?: string
  NEXT_PUBLIC_USE_REAL_API?: string
  NEXT_PUBLIC_APP_URL?: string
  NEXT_PUBLIC_CRACHA_WORKER_URL?: string
  NEXT_PUBLIC_ADMIN_WORKER_URL?: string
  
  ENVIRONMENT?: string
  LOG_LEVEL?: string
}

// Extend the global namespace for Cloudflare Workers
declare global {
  namespace CloudflareWorkers {
    interface Env extends CloudflareEnv {}
  }
}

export {}