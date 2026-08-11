/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  RAG_QUERY_SECRET: string
  MODAL_CRAWLER_URL: string
  CRAWLER_API_SECRET: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string

  /**
   * Billing. STRIPE_PRICE_ID is a plain var in wrangler.jsonc — it is a public
   * identifier and belongs in version control with the tariff it names. The
   * other three are secrets set on the Worker and are optional in the type,
   * because the routes have to be able to say "not configured" rather than
   * assume a key that is not there.
   */
  STRIPE_API_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_ID?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}
