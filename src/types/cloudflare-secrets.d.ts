/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  RAG_QUERY_SECRET: string
  MODAL_CRAWLER_URL: string
  CRAWLER_API_SECRET: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string

  /**
   * Billing. The three price ids are plain vars in wrangler.jsonc — they are
   * public identifiers and belong in version control next to the credit
   * packages they name, so the diff that changes a price shows which package
   * changed. The two secrets are set on the Worker itself.
   *
   * All of them are optional in the type, because the routes have to be able to
   * say "not configured" rather than assume a key that is not there.
   */
  STRIPE_API_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_CREDITS_S?: string
  STRIPE_PRICE_CREDITS_M?: string
  STRIPE_PRICE_CREDITS_L?: string
  SUPABASE_SERVICE_ROLE_KEY?: string

  /**
   * Sends the activation reminder (custom-worker.ts). Optional like the Stripe
   * keys: without it the hourly run does nothing and says so in the log.
   */
  RESEND_API_KEY?: string
}
