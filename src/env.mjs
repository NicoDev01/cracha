import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    
    // API Keys
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    VERTEX_KEY: z.string().optional(),
    
    // Cloudflare
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    VECTORIZE_API_TOKEN: z.string().optional(),
    VECTORIZE_ACCOUNT_ID: z.string().optional(),
  },
  client: {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    
    // Worker URLs
    NEXT_PUBLIC_CRACHA_WORKER_URL: z.string().url().optional(),
    NEXT_PUBLIC_ADMIN_WORKER_URL: z.string().url().optional(),
    
    // Application Config
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_USE_REAL_API: z.string().optional(),
  },
  runtimeEnv: {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    
    // Worker URLs
    NEXT_PUBLIC_CRACHA_WORKER_URL: process.env.NEXT_PUBLIC_CRACHA_WORKER_URL || undefined,
    NEXT_PUBLIC_ADMIN_WORKER_URL: process.env.NEXT_PUBLIC_ADMIN_WORKER_URL || undefined,
    
    // API Keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    VERTEX_KEY: process.env.VERTEX_KEY || undefined,
    
    // Cloudflare
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || undefined,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || undefined,
    VECTORIZE_API_TOKEN: process.env.VECTORIZE_API_TOKEN || undefined,
    VECTORIZE_ACCOUNT_ID: process.env.VECTORIZE_ACCOUNT_ID || undefined,
    
    // Application Config
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
    NEXT_PUBLIC_USE_REAL_API: process.env.NEXT_PUBLIC_USE_REAL_API || undefined,
  },
});